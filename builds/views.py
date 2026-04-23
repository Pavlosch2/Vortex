from django.contrib.auth.models import User
from django.db.models import Avg, Count
from django.shortcuts import get_object_or_404
from django.db import models

from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .ai_logic import ai_search_builds, get_compatibility_analysis
from .models import (
    AIAnalysisLog,
    AnalysisTask,
    Build,
    BuildImage,
    BuildPostReply,
    BuildSubmission,
    Favorite,
    PCSpecs,
    SupportTicket,
    TicketReply,
    TicketScreenshot,
    Notification,
    UserWarning,
    UserBlock,
    AppealChat,
    AppealMessage,
    ProfileMessage,
    FeaturedBuild
)
from .serializers import (
    AIAnalysisLogSerializer,
    AnalysisTaskSerializer,
    BuildImageSerializer,
    BuildPostReplySerializer,
    BuildPostSerializer,
    BuildReviewSerializer,
    BuildSerializer,
    BuildSubmissionSerializer,
    PCSpecsSerializer,
    ProfileSerializer,
    RegisterSerializer,
    SupportTicketSerializer,
    TicketReplySerializer,
    UserAdminSerializer,
    NotificationSerializer,
    UserWarningSerializer, 
    UserBlockSerializer, 
    AppealMessageSerializer, 
    AppealChatSerializer,
    PublicProfileSerializer,
    BuildSerializer,
    ProfileMessageSerializer,
)

from .notify import (
    notify_post_reply,
    notify_ticket_reply,
    notify_ai_done,
    notify_submission_status,
)

def get_role(user):
    try:
        return user.profile.role
    except Exception:
        return "user"


def is_staff(user):
    return get_role(user) in ("manager", "admin")


def is_admin(user):
    return get_role(user) == "admin"

class BuildViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BuildSerializer
 
    def get_queryset(self):
        from django.db.models import Avg, Count
        from django.utils import timezone
 
        qs = Build.objects.filter(is_public=True).prefetch_related(
            "images", "components", "reviews", "posts"
        ).annotate(
            avg_rating=Avg("reviews__score"),
            total_reviews=Count("reviews"),
        )
 
        t = self.request.query_params.get("type")
        if t:
            qs = qs.filter(build_type=t)
 
        tag = self.request.query_params.get("tag")
        if tag:
            qs = qs.filter(tags__icontains=tag)
 
        if self.request.query_params.get("favorites") == "1":
            if self.request.user.is_authenticated:
                fav_ids = self.request.user.favorites.values_list("build_id", flat=True)
                qs = qs.filter(id__in=fav_ids)

        sort = self.request.query_params.get("sort")
        if sort == "rating_desc":
            qs = qs.order_by("-avg_rating", "-total_reviews", "-created_at")
        elif sort == "rating_asc":
            qs = qs.order_by("avg_rating", "total_reviews", "-created_at")
        elif sort == "reviews_desc":
            qs = qs.order_by("-total_reviews", "-avg_rating", "-created_at")
        elif sort == "reviews_asc":
            qs = qs.order_by("total_reviews", "avg_rating", "-created_at")
        else:
            qs = qs.order_by("-created_at")
 
        min_reviews = self.request.query_params.get("min_reviews")
        if min_reviews and min_reviews.isdigit():
            qs = qs.filter(total_reviews__gte=int(min_reviews))
 
        rating_min = self.request.query_params.get("rating_min")
        rating_max = self.request.query_params.get("rating_max")
        if rating_min:
            try:
                qs = qs.filter(avg_rating__gte=float(rating_min))
            except ValueError:
                pass
        if rating_max:
            try:
                qs = qs.filter(avg_rating__lte=float(rating_max))
            except ValueError:
                pass

        user = self.request.user
        is_premium_user = (
            user.is_authenticated and
            getattr(user, 'profile', None) and
            user.profile.is_premium
        )
        if not is_premium_user:
            qs = qs.filter(is_premium_only=False)
 
        return qs
 
    def get_serializer_context(self):
        return {"request": self.request}

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def favorite(self, request, pk=None):
        build = self.get_object()
        fav, created = Favorite.objects.get_or_create(user=request.user, build=build)
        if not created:
            fav.delete()
            return Response({"is_favorite": False})
        return Response({"is_favorite": True})

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def analyze_async(self, request, pk=None):
        build = self.get_object()
        profile = request.user.profile

        if not PCSpecs.objects.filter(user=request.user, is_active=True).exists():
            return Response(
                {"error": "Спочатку збережіть характеристики свого ПК."},
                status=400,
            )
        if not profile.is_premium and profile.ai_credits <= 0:
            return Response({"error": "AI-кредити вичерпано."}, status=402)

        task = AnalysisTask.objects.create(user=request.user, build=build)

        try:
            from .tasks import run_analysis_task

            run_analysis_task(task.id)
        except Exception as e:
            task.status = "running"
            task.save(update_fields=["status"])
            _run_sync(task)

        return Response({"task_id": task.id, "status": task.status}, status=202)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def search(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response({"error": "q є обов'язковим"}, status=400)

        profile = request.user.profile

        if not profile.is_premium and profile.ai_credits <= 0:
            return Response(
                {
                    "error": "AI-кредити вичерпано. Придбайте преміум або зверніться до адміністратора."
                },
                status=402,
            )

        builds = Build.objects.filter(is_public=True).prefetch_related(
            "components", "images"
        )
        data = []
        for b in builds:
            components = [
                {
                    "name": c.name,
                    "category": c.get_category_display(),
                    "complexity": c.get_complexity_level_display(),
                }
                for c in b.components.all()
            ]
            data.append(
                {
                    "id": b.id,
                    "title": b.title,
                    "description": b.description[:300],
                    "tags": b.tags,
                    "build_type": b.build_type,
                    "rating": str(
                        round(b.reviews.aggregate(avg=Avg("score"))["avg"] or 0, 1)
                    ),
                    "components": components,
                }
            )

        specs = PCSpecs.objects.filter(user=request.user, is_active=True).first()

        ids = ai_search_builds(query, data, specs)

        if not profile.is_premium:
            profile.ai_credits -= 1
            profile.save(update_fields=["ai_credits"])

        by_id = {b.id: b for b in builds}
        sorted_builds = [by_id[i] for i in ids if i in by_id]
        return Response(
            {
                "results": BuildSerializer(
                    sorted_builds, many=True, context={"request": request}
                ).data,
                "credits_left": profile.ai_credits if not profile.is_premium else None,
            }
        )

    @action(detail=True, methods=["get", "post"], permission_classes=[])
    def reviews(self, request, pk=None):
        import traceback

        build = self.get_object()
        try:
            if request.method == "GET":
                qs = build.reviews.select_related("user").all()
                return Response(BuildReviewSerializer(qs, many=True).data)
            if not request.user.is_authenticated:
                return Response({"error": "Необхідна авторизація"}, status=401)
            existing = build.reviews.filter(user=request.user).first()
            ser = BuildReviewSerializer(
                existing, data=request.data, partial=bool(existing)
            )
            ser.is_valid(raise_exception=True)
            ser.save(build=build, user=request.user)
            return Response(ser.data, status=200 if existing else 201)
        except Exception as e:
            return Response(
                {"error": str(e), "detail": traceback.format_exc()}, status=500
            )

    @action(
        detail=True,
        methods=["delete"],
        url_path="reviews/delete",
        permission_classes=[IsAuthenticated],
    )
    def reviews_delete(self, request, pk=None):
        build = self.get_object()
        deleted, _ = build.reviews.filter(user=request.user).delete()
        if not deleted:
            return Response({"error": "Відгук не знайдено"}, status=404)
        return Response(status=204)

    @action(detail=True, methods=["get", "post"], permission_classes=[])
    def posts(self, request, pk=None):
        import traceback

        build = self.get_object()
        ctx = {"request": request}
        try:
            if request.method == "GET":
                qs = (
                    build.posts.select_related("author")
                    .prefetch_related("replies__author")
                    .all()
                )
                return Response(BuildPostSerializer(qs, many=True, context=ctx).data)
            if not request.user.is_authenticated:
                return Response({"error": "Необхідна авторизація"}, status=401)
            ser = BuildPostSerializer(data=request.data, context=ctx)
            ser.is_valid(raise_exception=True)
            ser.save(build=build, author=request.user)
            return Response(ser.data, status=201)
        except Exception as e:
            return Response(
                {"error": str(e), "detail": traceback.format_exc()}, status=500
            )

    @action(
        detail=True,
        methods=["patch"],
        url_path="posts/(?P<post_id>[0-9]+)/edit",
        permission_classes=[IsAuthenticated],
    )
    def posts_edit(self, request, pk=None, post_id=None):
        build = self.get_object()
        post = build.posts.filter(pk=post_id).first()
        if not post:
            return Response({"error": "Пост не знайдено"}, status=404)
        is_owner = post.author == request.user
        is_manager = hasattr(request.user, "profile") and request.user.profile.role in (
            "manager",
            "admin",
        )
        if not (is_owner or is_manager):
            return Response({"error": "Недостатньо прав"}, status=403)
        text = request.data.get("text", "").strip()
        if not text:
            return Response({"error": "Текст не може бути порожнім"}, status=400)
        post.text = text
        post.save(update_fields=["text", "updated_at"])
        return Response(BuildPostSerializer(post, context={"request": request}).data)

    @action(
        detail=True,
        methods=["post"],
        url_path="posts/(?P<post_id>[0-9]+)/reply",
        permission_classes=[IsAuthenticated],
    )
    def posts_reply(self, request, pk=None, post_id=None):
        build = self.get_object()
        post = build.posts.filter(pk=post_id).first()
        if not post:
            return Response({"error": "Пост не знайдено"}, status=404)
        text = request.data.get("text", "").strip()
        if not text:
            return Response({"error": "Текст не може бути порожнім"}, status=400)
        reply = BuildPostReply.objects.create(post=post, author=request.user, text=text)
        if post.author != request.user:
            notify_post_reply(post.author, request.user, build.id, post.id, reply.id)
        return Response(
            BuildPostReplySerializer(reply, context={"request": request}).data,
            status=201,
        )
    
    @action(
        detail=True,
        methods=["delete"],
        url_path="posts/(?P<post_id>[0-9]+)/reply/(?P<reply_id>[0-9]+)",
        permission_classes=[IsAuthenticated],
    )
    def posts_reply_delete(self, request, pk=None, post_id=None, reply_id=None):
        build = self.get_object()
        reply = BuildPostReply.objects.filter(pk=reply_id, post__build=build).first()
        if not reply:
            return Response({"error": "Відповідь не знайдено"}, status=404)
        is_owner = reply.author == request.user
        is_manager = hasattr(request.user, "profile") and request.user.profile.role in (
            "manager",
            "admin",
        )
        if not (is_owner or is_manager):
            return Response({"error": "Недостатньо прав"}, status=403)
        reply.delete()
        return Response(status=204)

    @action(
        detail=True,
        methods=["delete"],
        url_path="posts/(?P<post_id>[0-9]+)",
        permission_classes=[IsAuthenticated],
    )
    def posts_delete(self, request, pk=None, post_id=None):
        build = self.get_object()
        post = build.posts.filter(pk=post_id).first()
        if not post:
            return Response({"error": "Пост не знайдено"}, status=404)
        is_owner = post.author == request.user
        is_manager = hasattr(request.user, "profile") and request.user.profile.role in (
            "manager",
            "admin",
        )
        if not (is_owner or is_manager):
            return Response({"error": "Недостатньо прав"}, status=403)
        post.delete()
        return Response(status=204)

    @action(detail=True, methods=["get"], permission_classes=[])
    def files(self, request, pk=None):
        import os
        import zipfile

        build = self.get_object()
        if not build.source_file:
            return Response({"error": "До збірки не прикріплено архів"}, status=400)
        archive_path = build.source_file.path
        if not os.path.exists(archive_path):
            if build.archive_url:
                import tempfile

                import requests

                try:
                    r = requests.get(build.archive_url, stream=True, timeout=30)
                    r.raise_for_status()
                    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
                    for chunk in r.iter_content(chunk_size=8192):
                        tmp.write(chunk)
                    tmp.close()
                    archive_path = tmp.name
                    archive_ext = ".zip"
                except Exception as e:
                    return Response(
                        {"error": f"Не вдалося завантажити з Archive.org: {e}"},
                        status=400,
                    )
            else:
                return Response(
                    {"error": f"Файл не знайдено: {archive_path}"}, status=400
                )
        archive_ext = os.path.splitext(archive_path)[1].lower()

        folder = request.query_params.get("folder", "")
        try:
            page = max(1, int(request.query_params.get("page", 1)))
            page_size = min(
                200, max(10, int(request.query_params.get("page_size", 100)))
            )
        except ValueError:
            page, page_size = 1, 100

        try:
            if archive_ext == ".7z":
                try:
                    import py7zr

                    with py7zr.SevenZipFile(archive_path, mode="r") as z:
                        all_entries = [
                            (f.filename, getattr(f, "uncompressed", 0) or 0)
                            for f in z.list()
                            if not f.is_directory
                        ]
                except ImportError:
                    return Response({"error": "pip install py7zr"}, status=400)
            elif archive_ext == ".rar":
                try:
                    import rarfile

                    with rarfile.RarFile(archive_path) as z:
                        all_entries = [
                            (f.filename, f.file_size)
                            for f in z.infolist()
                            if not f.is_dir()
                        ]
                except ImportError:
                    return Response({"error": "pip install rarfile"}, status=400)
            else:
                with zipfile.ZipFile(archive_path, "r") as zf:
                    all_entries = [
                        (i.filename, i.file_size)
                        for i in zf.infolist()
                        if not i.is_dir()
                    ]
        except zipfile.BadZipFile:
            return Response({"error": "Архів пошкоджений"}, status=400)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

        all_entries = [(n.replace("\\", "/"), s) for n, s in all_entries]

        dirs_seen = set()
        dirs_list = []
        files_list = []

        for name, size in all_entries:
            if folder:
                if not name.startswith(folder + "/"):
                    continue
                rel = name[len(folder) + 1 :]
            else:
                rel = name

            if not rel:
                continue

            parts = rel.split("/")
            if len(parts) == 1:
                files_list.append(
                    {
                        "type": "file",
                        "name": parts[0],
                        "path": name,
                        "size": size,
                        "ext": os.path.splitext(parts[0])[1].lower(),
                    }
                )
            else:
                dir_name = parts[0]
                if dir_name not in dirs_seen:
                    dirs_seen.add(dir_name)
                    dir_path = (folder + "/" + dir_name) if folder else dir_name
                    total = sum(
                        1 for n, _ in all_entries if n.startswith(dir_path + "/")
                    )
                    dirs_list.append(
                        {
                            "type": "dir",
                            "name": dir_name,
                            "path": dir_path,
                            "count": total,
                        }
                    )

        dirs_list.sort(key=lambda x: x["name"].lower())
        files_list.sort(key=lambda x: x["name"].lower())

        total_files_in_folder = len(files_list)
        offset = (page - 1) * page_size
        files_page = files_list[offset : offset + page_size]

        return Response(
            {
                "folder": folder,
                "total_files": len(all_entries),
                "total_in_folder": total_files_in_folder,
                "page": page,
                "page_size": page_size,
                "has_more": (offset + page_size) < total_files_in_folder,
                "items": dirs_list + files_page,
            }
        )

    @action(detail=True, methods=["get"], url_path="files/read", permission_classes=[])
    def files_read(self, request, pk=None):
        import io
        import os
        import zipfile

        READABLE = {
            ".lua",
            ".cs",
            ".js",
            ".txt",
            ".cfg",
            ".ini",
            ".json",
            ".xml",
            ".asi",
        }
        MAX_SIZE = 256 * 1024
        build = self.get_object()
        file_path = request.query_params.get("path", "")
        if not file_path:
            return Response({"error": "path є обовязковим"}, status=400)
        ext = os.path.splitext(file_path)[1].lower()
        if ext not in READABLE:
            return Response(
                {"error": "Цей тип файлу не підтримується для перегляду"}, status=400
            )
        if not build.source_file or not os.path.exists(build.source_file.path):
            if not build.archive_url:
                return Response({"error": "Файл не знайдено"}, status=404)
            import tempfile

            import requests

            try:
                r = requests.get(build.archive_url, stream=True, timeout=30)
                r.raise_for_status()
                tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
                for chunk in r.iter_content(chunk_size=8192):
                    tmp.write(chunk)
                tmp.close()
                archive_path = tmp.name
            except Exception as e:
                return Response(
                    {"error": f"Не вдалося завантажити з Archive.org: {e}"}, status=400
                )
        else:
            archive_path = build.source_file.path
        archive_ext = os.path.splitext(archive_path)[1].lower()

        def decode(data):
            return data.decode("utf-8", errors="replace")

        try:
            if archive_ext == ".7z":
                try:
                    import py7zr

                    with py7zr.SevenZipFile(archive_path, mode="r") as z:
                        extracted = z.read([file_path])
                        if file_path not in extracted:
                            return Response(
                                {"error": "Файл не знайдено в архіві"}, status=404
                            )
                        data = extracted[file_path].read()
                        if len(data) > MAX_SIZE:
                            return Response(
                                {"error": "Файл занадто великий (>256 KB)"}, status=400
                            )
                        return Response({"content": decode(data), "ext": ext})
                except ImportError:
                    return Response(
                        {"error": "Встановіть py7zr: pip install py7zr"}, status=400
                    )
            elif archive_ext == ".rar":
                try:
                    import rarfile

                    with rarfile.RarFile(archive_path) as z:
                        info = z.getinfo(file_path)
                        if info.file_size > MAX_SIZE:
                            return Response(
                                {"error": "Файл занадто великий (>256 KB)"}, status=400
                            )
                        return Response(
                            {"content": decode(z.read(file_path)), "ext": ext}
                        )
                except ImportError:
                    return Response(
                        {"error": "Встановіть rarfile: pip install rarfile"}, status=400
                    )
            else:
                with zipfile.ZipFile(archive_path, "r") as zf:
                    info = zf.getinfo(file_path)
                    if info.file_size > MAX_SIZE:
                        return Response(
                            {"error": "Файл занадто великий для перегляду (>256 KB)"},
                            status=400,
                        )
                    return Response({"content": decode(zf.read(file_path)), "ext": ext})
        except KeyError:
            return Response({"error": "Файл не знайдено в архіві"}, status=404)
        except zipfile.BadZipFile:
            return Response({"error": "Архів пошкоджений"}, status=400)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=True, methods=["get"], permission_classes=[])
    def similar(self, request, pk=None):
        build = self.get_object()
        tags = [t.strip() for t in (build.tags or "").split(",") if t.strip()]
        if not tags:
            return Response([])
        qs = (
            Build.objects.filter(is_public=True)
            .exclude(pk=build.pk)
            .prefetch_related("components", "images")
            .annotate(avg_rating=Avg("reviews__score"))
        )
        scored = []
        for b in qs:
            b_tags = {t.strip() for t in (b.tags or "").split(",") if t.strip()}
            common = len(b_tags & set(tags))
            if common:
                scored.append((common, b))
        scored.sort(key=lambda x: (-x[0], -(x[1].avg_rating or 0)))
        top = [b for _, b in scored[:6]]
        return Response(
            BuildSerializer(top, many=True, context={"request": request}).data
        )
    
    @action(detail=True, methods=["post"], permission_classes=[])
    def download(self, request, pk=None):
        Build.objects.filter(pk=pk).update(
            download_count=models.F("download_count") + 1
        )
        count = Build.objects.filter(pk=pk).values_list("download_count", flat=True).first()
        return Response({"download_count": count})


def _run_sync(task):
    """Synchronous fallback when background_task is not installed."""
    from .ai_logic import get_compatibility_analysis

    try:
        specs = PCSpecs.objects.filter(user=task.user, is_active=True).first()
        if not specs:
            task.status = "error"
            task.error_msg = "PC specs not found"
            task.save()
            return
        result = get_compatibility_analysis(specs, task.build)
        if "error" in result:
            task.status = "error"
            task.error_msg = result["error"]
        else:
            task.status = "done"
            task.result = result
            AIAnalysisLog.objects.create(
                user=task.user,
                build=task.build,
                specs=specs,
                verdict=result.get("verdict", ""),
                predicted_fps=result.get("fps_prediction", ""),
                risks=result.get("risks", []),
                recommendations=result.get("recommendations", []),
                task=task,
            )
        task.save()
    except Exception as e:
        task.status = "error"
        task.error_msg = str(e)
        task.save()


class AnalysisTaskView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):
        task = get_object_or_404(AnalysisTask, pk=task_id, user=request.user)
        return Response(AnalysisTaskSerializer(task).data)

    def delete(self, request, task_id):
        task = get_object_or_404(AnalysisTask, pk=task_id, user=request.user)
        if task.status in ("done", "error", "cancelled"):
            return Response({"error": "Задачу вже завершено"}, status=400)
        task.status = "cancelled"
        task.save(update_fields=["status", "updated_at"])
        return Response({"status": "cancelled"})


class AnalysisLogView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        logs = AIAnalysisLog.objects.filter(user=request.user).select_related("build")
        return Response(AIAnalysisLogSerializer(logs, many=True).data)


class PCSpecsViewSet(viewsets.ModelViewSet):
    serializer_class = PCSpecsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PCSpecs.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
 
    def get(self, request):
        return Response(
            ProfileSerializer(request.user.profile, context={"request": request}).data
        )
 
    def patch(self, request):
        profile = request.user.profile
        avatar = request.FILES.get("avatar")
        banner = request.FILES.get("banner")
        if avatar:
            profile.avatar = avatar
        if banner:
            profile.banner = banner
        bio = request.data.get("bio")
        if bio is not None:
            profile.bio = bio
        new_username = request.data.get("username", "").strip()
        if new_username and new_username != request.user.username:
            if User.objects.filter(username=new_username).exclude(pk=request.user.pk).exists():
                return Response({"error": "Цей нікнейм вже зайнятий"}, status=400)
            request.user.username = new_username
            request.user.save(update_fields=["username"])

        # Кастомізація — тільки для Pro
        if profile.plan == "pro":
            profile_color = request.data.get("profile_color")
            avatar_frame = request.data.get("avatar_frame")
            if profile_color is not None:
                profile.profile_color = profile_color
            if avatar_frame is not None:
                profile.avatar_frame = avatar_frame

        profile.save()
        return Response(ProfileSerializer(profile, context={"request": request}).data)
    
class PublicProfileView(APIView):
    permission_classes = []
 
    def get(self, request, username):
        user = get_object_or_404(User, username=username)
        return Response(
            PublicProfileSerializer(user.profile, context={"request": request}).data
        )
 
 
class PublicProfileBuildsView(APIView):
    permission_classes = []
 
    def get(self, request, username):
        user = get_object_or_404(User, username=username)
        builds = Build.objects.filter(author=user, is_public=True).prefetch_related(
            "images", "reviews"
        ).order_by("-created_at")
        return Response(
            BuildSerializer(builds, many=True, context={"request": request}).data
        )
 
 
class ProfileMessageView(APIView):
    permission_classes = []
 
    def get(self, request, username):
        user = get_object_or_404(User, username=username)
        messages = ProfileMessage.objects.filter(target_user=user).select_related(
            "author", "author__profile"
        )
        return Response(
            ProfileMessageSerializer(messages, many=True, context={"request": request}).data
        )
 
    def post(self, request, username):
        if not request.user.is_authenticated:
            return Response({"error": "Потрібна авторизація"}, status=401)
        user = get_object_or_404(User, username=username)
        text = request.data.get("text", "").strip()
        if not text:
            return Response({"error": "Повідомлення не може бути порожнім"}, status=400)
        msg = ProfileMessage.objects.create(
            author=request.user,
            target_user=user,
            text=text,
        )
        return Response(
            ProfileMessageSerializer(msg, context={"request": request}).data,
            status=201,
        )
 
 
class ProfileMessageDeleteView(APIView):
    permission_classes = [IsAuthenticated]
 
    def delete(self, request, username, msg_id):
        user = get_object_or_404(User, username=username)
        msg = get_object_or_404(ProfileMessage, pk=msg_id, target_user=user)
        is_owner = msg.author == request.user or user == request.user
        is_staff_user = is_staff(request.user)
        if not is_owner and not is_staff_user:
            return Response({"error": "Недостатньо прав"}, status=403)
        msg.delete()
        return Response(status=204)

class BuildSubmissionViewSet(viewsets.ModelViewSet):
    serializer_class = BuildSubmissionSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        if is_staff(self.request.user):
            return BuildSubmission.objects.select_related("submitted_by").all()
        return BuildSubmission.objects.filter(submitted_by=self.request.user)

    def perform_create(self, serializer):
        user = self.request.user
        is_premium = getattr(user, 'profile', None) and user.profile.is_premium
        if not is_premium:
            active_count = BuildSubmission.objects.filter(
                submitted_by=user,
                status="pending"
            ).count()
            if active_count >= 1:
                from rest_framework.exceptions import ValidationError
                raise ValidationError(
                    "Безкоштовні акаунти можуть мати лише 1 активну заявку. "
                    "Оформіть преміум для необмеженої кількості заявок."
                )
        serializer.save(submitted_by=user)

    def destroy(self, request, *args, **kwargs):
        if not is_staff(request.user):
            return Response({"error": "Недостатньо прав"}, status=403)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def approve(self, request, pk=None):
        if not is_staff(request.user):
            return Response({"error": "Недостатньо прав"}, status=403)
        sub = self.get_object()
        if sub.status != "pending":
            return Response({"error": "Заявка вже оброблена"}, status=400)

        build = Build.objects.create(
            title=sub.title,
            description=sub.description,
            build_type=sub.build_type,
            tags=sub.tags,
            video_url=sub.video_url or "",
            author=request.user,
            source_file=sub.source_file,
            is_public=True,
        )
        if sub.cover_image:
            BuildImage.objects.create(build=build, image=sub.cover_image, is_cover=True)

        sub.status = "approved"
        sub.reviewed_by = request.user
        sub.published_build = build
        sub.save()
        notify_submission_status(sub.submitted_by, sub.title, "approved", sub.id)

        import threading

        def _upload_to_archive():
            try:
                import logging
                import os

                from .archive_utils import upload_to_archive

                logger = logging.getLogger(__name__)

                archive_url, identifier = upload_to_archive(build)
                Build.objects.filter(pk=build.pk).update(
                    archive_url=archive_url,
                    archive_identifier=identifier,
                )
                logger.info(f"[Archive.org] Завантажено: {archive_url}")

                for file_obj in [build.source_file, sub.source_file]:
                    try:
                        if file_obj and file_obj.name:
                            path = file_obj.path
                            if os.path.exists(path):
                                os.remove(path)
                                logger.info(f"[Cleanup] Видалено: {path}")
                    except Exception as cleanup_err:
                        logger.warning(
                            f"[Cleanup] Не вдалося видалити файл: {cleanup_err}"
                        )

            except Exception as e:
                import logging

                logging.getLogger(__name__).error(
                    f"[Archive.org] Помилка завантаження: {e}"
                )

        threading.Thread(target=_upload_to_archive, daemon=True).start()

        return Response(
            {
                "status": "approved",
                "build_id": build.id,
                "archive_url": build.archive_url,
            }
        )

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def files(self, request, pk=None):
        import os
        import zipfile

        if not is_staff(request.user):
            return Response({"error": "Недостатньо прав"}, status=403)
        sub = self.get_object()
        if not sub.source_file:
            return Response({"error": "Файл не знайдено"}, status=400)
        archive_path = sub.source_file.path
        if not os.path.exists(archive_path):
            return Response({"error": f"Файл не знайдено: {archive_path}"}, status=400)
        archive_ext = os.path.splitext(archive_path)[1].lower()
        folder = request.query_params.get("folder", "")
        try:
            page = max(1, int(request.query_params.get("page", 1)))
            page_size = min(
                200, max(10, int(request.query_params.get("page_size", 100)))
            )
        except ValueError:
            page, page_size = 1, 100
        try:
            if archive_ext == ".7z":
                import py7zr

                with py7zr.SevenZipFile(archive_path, mode="r") as z:
                    all_entries = [
                        (f.filename, getattr(f, "uncompressed", 0) or 0)
                        for f in z.list()
                        if not f.is_directory
                    ]
            elif archive_ext == ".rar":
                import rarfile

                with rarfile.RarFile(archive_path) as z:
                    all_entries = [
                        (f.filename, f.file_size)
                        for f in z.infolist()
                        if not f.is_dir()
                    ]
            else:
                with zipfile.ZipFile(archive_path, "r") as zf:
                    all_entries = [
                        (i.filename, i.file_size)
                        for i in zf.infolist()
                        if not i.is_dir()
                    ]
        except Exception as e:
            return Response({"error": str(e)}, status=500)
        all_entries = [(n.replace("\\", "/"), s) for n, s in all_entries]
        dirs_seen = set()
        dirs_list = []
        files_list = []
        for name, size in all_entries:
            rel = name[len(folder) + 1 :] if folder else name
            if folder and not name.startswith(folder + "/"):
                continue
            if not rel:
                continue
            parts = rel.split("/")
            if len(parts) == 1:
                files_list.append(
                    {
                        "type": "file",
                        "name": parts[0],
                        "path": name,
                        "size": size,
                        "ext": os.path.splitext(parts[0])[1].lower(),
                    }
                )
            else:
                dir_name = parts[0]
                if dir_name not in dirs_seen:
                    dirs_seen.add(dir_name)
                    dir_path = (folder + "/" + dir_name) if folder else dir_name
                    total = sum(
                        1 for n, _ in all_entries if n.startswith(dir_path + "/")
                    )
                    dirs_list.append(
                        {
                            "type": "dir",
                            "name": dir_name,
                            "path": dir_path,
                            "count": total,
                        }
                    )
        dirs_list.sort(key=lambda x: x["name"].lower())
        files_list.sort(key=lambda x: x["name"].lower())
        offset = (page - 1) * page_size
        return Response(
            {
                "folder": folder,
                "total_files": len(all_entries),
                "total_in_folder": len(files_list),
                "page": page,
                "page_size": page_size,
                "has_more": (offset + page_size) < len(files_list),
                "items": dirs_list + files_list[offset : offset + page_size],
            }
        )

    @action(detail=True, methods=["get"], url_path="files/read", permission_classes=[])
    def files_read(self, request, pk=None):
        import os
        import zipfile

        if not is_staff(request.user):
            return Response({"error": "Недостатньо прав"}, status=403)
        READABLE = {
            ".lua",
            ".cs",
            ".js",
            ".txt",
            ".cfg",
            ".ini",
            ".json",
            ".xml",
            ".asi",
        }
        MAX_SIZE = 256 * 1024
        sub = self.get_object()
        file_path = request.query_params.get("path", "")
        if not file_path:
            return Response({"error": "path є обовязковим"}, status=400)
        ext = os.path.splitext(file_path)[1].lower()
        if ext not in READABLE:
            return Response({"error": "Тип файлу не підтримується"}, status=400)
        archive_path = sub.source_file.path
        try:
            with zipfile.ZipFile(archive_path, "r") as zf:
                info = zf.getinfo(file_path)
                if info.file_size > MAX_SIZE:
                    return Response(
                        {"error": "Файл занадто великий (>256 KB)"}, status=400
                    )
                return Response(
                    {
                        "content": zf.read(file_path).decode("utf-8", errors="replace"),
                        "ext": ext,
                    }
                )
        except KeyError:
            return Response({"error": "Файл не знайдено в архіві"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        if not is_staff(request.user):
            return Response({"error": "Недостатньо прав"}, status=403)
        sub = self.get_object()
        reason = request.data.get("reason", "").strip()
        if not reason:
            return Response({"error": "Вкажіть причину відхилення"}, status=400)
        sub.status = "rejected"
        sub.rejection_reason = reason
        sub.reviewed_by = request.user
        sub.save()
        notify_submission_status(submission.submitted_by, submission.title, "rejected", submission.id, submission.rejection_reason)
        return Response({"status": "rejected"})


class SupportTicketViewSet(viewsets.ModelViewSet):
    serializer_class = SupportTicketSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def get_queryset(self):
        qs = SupportTicket.objects.prefetch_related(
            "screenshots", "replies__author__profile"
        )
        if is_staff(self.request.user):
            return qs.all()
        return qs.filter(user=self.request.user)

    def perform_create(self, serializer):
        ticket = serializer.save(user=self.request.user)
        for key, f in self.request.FILES.items():
            if key.startswith("screenshot"):
                TicketScreenshot.objects.create(ticket=ticket, image=f)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reply(self, request, pk=None):
        ticket = self.get_object()
        is_owner = ticket.user == request.user
        if not is_staff(request.user) and not is_owner:
            return Response({'error': 'Недостатньо прав'}, status=403)
        if ticket.status == 'closed':
            return Response({'error': 'Звернення закрито'}, status=400)
        message = request.data.get('message', '').strip()
        image = request.FILES.get('image')
        if not message and not image:
            return Response({'error': 'Повідомлення або зображення є обов\'язковим'}, status=400)
        reply = TicketReply.objects.create(
            ticket=ticket, author=request.user, message=message, image=image
        )
        if ticket.user != request.user:
            notify_ticket_reply(ticket.user, request.user, ticket.id)
        if is_staff(request.user) and ticket.status == 'open':
            ticket.status = 'in_progress'
            ticket.save(update_fields=['status'])
        return Response(
            TicketReplySerializer(reply, context={'request': request}).data,
            status=201
        )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def reopen(self, request, pk=None):
        ticket = self.get_object()
        if not is_staff(request.user) and ticket.user != request.user:
            return Response({"error": "Недостатньо прав"}, status=403)
        if ticket.status != "closed":
            return Response({"error": "Звернення не закрито"}, status=400)
        ticket.status = "open"
        ticket.save(update_fields=["status"])
        return Response({"status": "open"})

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def close(self, request, pk=None):
        if not is_staff(request.user):
            return Response({"error": "Недостатньо прав"}, status=403)
        ticket = self.get_object()
        ticket.status = "closed"
        ticket.save(update_fields=["status"])
        return Response({"status": "closed"})

    @action(detail=True, methods=["delete"], permission_classes=[IsAuthenticated])
    def delete_ticket(self, request, pk=None):
        ticket = self.get_object()
        if not is_staff(request.user) and ticket.user != request.user:
            return Response({"error": "Недостатньо прав"}, status=403)
        ticket.delete()
        return Response(status=204)



class AdminBuildViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return BuildSerializer

    def get_queryset(self):
        if not is_staff(self.request.user):
            return Build.objects.none()
        return Build.objects.prefetch_related("components", "images").all()

    def get_serializer_context(self):
        return {"request": self.request}

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def restore_archive(self, request, pk=None):
        if not is_staff(request.user):
            return Response({"error": "Недостатньо прав"}, status=403)
        build = self.get_object()
        if not build.archive_identifier:
            return Response(
                {"error": "Збірка не має Archive.org identifier"}, status=400
            )
        try:
            from .archive_utils import unhide_from_archive

            unhide_from_archive(build.archive_identifier)
            return Response({"status": "restored", "archive_url": build.archive_url})
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    def perform_destroy(self, instance):
        if not is_staff(self.request.user):
            raise PermissionError("Недостатньо прав")
        if instance.archive_identifier:
            try:
                from .archive_utils import hide_from_archive

                hide_from_archive(instance.archive_identifier)
            except Exception as e:
                import logging

                logging.getLogger(__name__).error(
                    f"[Archive.org] Помилка приховування: {e}"
                )
        instance.delete()


class AdminUserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_staff(request.user):
            return Response({"error": "Недостатньо прав"}, status=403)
        users = User.objects.select_related("profile").all().order_by("-date_joined")
        return Response(
            UserAdminSerializer(users, many=True, context={"request": request}).data
        )


class AdminUserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, user_id):
        if not is_admin(request.user):
            return Response({"error": "Тільки адміністратори"}, status=403)
        user = get_object_or_404(User, pk=user_id)

        plan = request.data.get("plan")
        plan_expires_at = request.data.get("plan_expires_at")
        ai_credits = request.data.get("ai_credits")
        role = request.data.get("role")

        profile = user.profile
        if plan is not None:
            if plan not in ("free", "standard", "pro"):
                return Response({"error": "Невірний план"}, status=400)
            profile.plan = plan
            if plan == "standard":
                profile.av_checks_left = max(profile.av_checks_left, 1)
            elif plan == "pro":
                profile.av_checks_left = max(profile.av_checks_left, 5)
            elif plan == "free":
                profile.av_checks_left = 0
        if plan_expires_at is not None:
            from django.utils.dateparse import parse_datetime
            profile.plan_expires_at = parse_datetime(plan_expires_at)
        if ai_credits is not None:
            profile.ai_credits = int(ai_credits)
        if role is not None:
            profile.role = role
        profile.save()

        return Response(UserAdminSerializer(user, context={"request": request}).data)

    def delete(self, request, user_id):
        if not is_admin(request.user):
            return Response({"error": "Тільки адміністратори"}, status=403)
        if request.user.id == user_id:
            return Response({"error": "Не можна видалити власний акаунт"}, status=400)
        user = get_object_or_404(User, pk=user_id)
        user.delete()
        return Response(status=204)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer
 
    def perform_create(self, serializer):
        from django.conf import settings
        from django.contrib.auth.tokens import default_token_generator
        from django.core.mail import send_mail
        from django.template.loader import render_to_string
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode
 
        user = serializer.save()
        user.is_active = False
        user.save(update_fields=["is_active"])
 
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        confirm_url = f"{frontend_url}/confirm-email/{uid}/{token}/"
 
        html = render_to_string(
            "registration/vortex_email_confirm.html",
            {
                "username": user.username,
                "confirm_url": confirm_url,
            },
        )
 
        send_mail(
            subject="VortexPro — підтвердження email",
            message=f"Підтвердіть вашу пошту: {confirm_url}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html,
            fail_silently=False,
        )


class EmailConfirmView(APIView):
    """GET /api/auth/confirm-email/<uid>/<token>/"""
    permission_classes = (AllowAny,)
 
    def get(self, request, uid, token):
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_decode
        from django.utils.encoding import force_str
 
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (User.DoesNotExist, ValueError, TypeError):
            return Response({"error": "Невірне посилання"}, status=400)
 
        if user.is_active:
            return Response({"detail": "Email вже підтверджено"})
 
        if not default_token_generator.check_token(user, token):
            return Response({"error": "Посилання недійсне або закінчився термін дії"}, status=400)
 
        user.is_active = True
        user.save(update_fields=["is_active"])
 
        return Response({"detail": "Email підтверджено. Тепер ви можете увійти."})
    

class PasswordResetRequestView(APIView):
    """POST /api/auth/password-reset/"""

    permission_classes = (AllowAny,)

    def post(self, request):
        from django.conf import settings
        from django.contrib.auth.tokens import default_token_generator
        from django.core.mail import send_mail
        from django.template.loader import render_to_string
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode

        email = request.data.get("email", "").strip()
        if not email:
            return Response({"error": "Email є обов'язковим"}, status=400)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"detail": "Якщо такий email зареєстровано - лист надіслано."}
            )

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        reset_url = f"{frontend_url}/reset-password/{uid}/{token}/"

        html = render_to_string(
            "registration/vortex_password_reset_email.html",
            {
                "user": user,
                "reset_url": reset_url,
                "uid": uid,
                "token": token,
                "protocol": "http",
                "domain": "localhost:3000",
            },
        )

        send_mail(
            subject="VortexPro — відновлення паролю",
            message=f"Перейдіть за посиланням для скидання паролю: {reset_url}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            html_message=html,
            fail_silently=False,
        )
        return Response({"detail": "Якщо такий email зареєстровано - лист надіслано."})


class PasswordResetConfirmView(APIView):
    """POST /api/auth/password-reset-confirm/"""

    permission_classes = (AllowAny,)

    def post(self, request):
        from django.contrib.auth.tokens import default_token_generator
        from django.utils.http import urlsafe_base64_decode

        uidb64 = request.data.get("uid", "")
        token = request.data.get("token", "")
        password = request.data.get("password", "")

        if not all([uidb64, token, password]):
            return Response(
                {"error": "uid, token та password є обов'язковими"}, status=400
            )

        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            user = User.objects.get(pk=uid)
        except (User.DoesNotExist, ValueError, OverflowError):
            return Response({"error": "Невалідне посилання"}, status=400)

        if not default_token_generator.check_token(user, token):
            return Response({"error": "Токен недійсний або прострочений"}, status=400)

        if len(password) < 8:
            return Response(
                {"error": "Пароль має бути не менше 8 символів"}, status=400
            )

        user.set_password(password)
        user.save()
        return Response({"detail": "Пароль успішно змінено. Тепер увійдіть."})

class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(user=request.user)
        serializer = NotificationSerializer(qs, many=True)
        unread_count = qs.filter(is_read=False).count()
        return Response({"results": serializer.data, "unread_count": unread_count})


class NotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            n = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response(status=404)
        n.is_read = True
        n.save(update_fields=["is_read"])
        return Response({"ok": True})


class NotificationMarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"ok": True})


class NotificationDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            n = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response(status=404)
        n.delete()
        return Response(status=204)


class NotificationDeleteAllView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        Notification.objects.filter(user=request.user).delete()
        return Response(status=204)
    

class AdminWarnUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        if not is_staff(request.user):
            return Response({"error": "Недостатньо прав"}, status=403)
        from django.utils import timezone
        from datetime import timedelta
        user = get_object_or_404(User, pk=user_id)
        if user == request.user:
            return Response({"error": "Не можна попередити самого себе"}, status=400)
        reason = request.data.get("reason", "").strip()
        if not reason:
            return Response({"error": "Вкажіть причину"}, status=400)
        warning = UserWarning.objects.create(
            user=user,
            issued_by=request.user,
            reason=reason,
            expires_at=timezone.now() + timedelta(hours=24),
        )
        from .notify import notify_moderation_warning
        notify_moderation_warning(user, request.user, reason)
        return Response(UserWarningSerializer(warning).data, status=201)


class AdminBlockUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        if not is_staff(request.user):
            return Response({"error": "Недостатньо прав"}, status=403)
        from django.utils import timezone
        from datetime import timedelta
        user = get_object_or_404(User, pk=user_id)
        if user == request.user:
            return Response({"error": "Не можна заблокувати самого себе"}, status=400)
        reason = request.data.get("reason", "").strip()
        duration = request.data.get("duration")
        warning_id = request.data.get("warning_id")
        if not reason:
            return Response({"error": "Вкажіть причину"}, status=400)

        DURATIONS = {"1d": 1, "3d": 3, "7d": 7, "30d": 30}
        is_permanent = duration == "permanent"
        blocked_until = None
        if not is_permanent:
            days = DURATIONS.get(duration)
            if not days:
                return Response({"error": "Невірний термін блокування"}, status=400)
            blocked_until = timezone.now() + timedelta(days=days)

        UserBlock.objects.filter(user=user).delete()
        warning = None
        if warning_id:
            try:
                warning = UserWarning.objects.get(pk=warning_id, user=user)
                warning.status = "executed"
                warning.save(update_fields=["status"])
            except UserWarning.DoesNotExist:
                pass

        block = UserBlock.objects.create(
            user=user,
            blocked_by=request.user,
            reason=reason,
            is_permanent=is_permanent,
            blocked_until=blocked_until,
            warning=warning,
        )
        if get_role(request.user) == 'manager':
            admins = User.objects.filter(profile__role='admin')
            for admin in admins:
                Notification.objects.create(
                    user=admin,
                    type="moderation_warning",
                    body=f"Менеджер {request.user.username} заблокував користувача {user.username}. Причина: {reason}",
                    link_type="",
                    link_params={"blocked_user_id": user.id},
                )
        return Response(UserBlockSerializer(block).data, status=201)


class AdminUnblockUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        if not is_staff(request.user):
            return Response({"error": "Недостатньо прав"}, status=403)
        user = get_object_or_404(User, pk=user_id)
        UserBlock.objects.filter(user=user).delete()
        try:
            chat = user.appeal
            chat.is_closed = True
            chat.save(update_fields=["is_closed"])
            Notification.objects.create(
                user=user,
                type="moderation_warning",
                body="Вашу апеляцію розглянуто. Блокування знято.",
                link_type="",
                link_params={},
            )
        except Exception:
            pass
        return Response({"ok": True})


class AdminWarningListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_staff(request.user):
            return Response({"error": "Недостатньо прав"}, status=403)
        from django.utils import timezone
        warnings = UserWarning.objects.select_related("user", "issued_by").all()
        for w in warnings:
            w.refresh_status()
        data = UserWarningSerializer(warnings, many=True).data
        return Response(data)


class AdminWarningDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, warning_id):
        if not is_staff(request.user):
            return Response({"error": "Недостатньо прав"}, status=403)
        w = get_object_or_404(UserWarning, pk=warning_id)
        if w.status == "executed":
            return Response({"error": "Не можна видалити виконане попередження"}, status=400)
        w.delete()
        return Response(status=204)


class BlockStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.utils import timezone
        try:
            block = request.user.block
            if not block.is_active():
                block.delete()
                return Response({"blocked": False})
            return Response({
                "blocked": True,
                "reason": block.reason,
                "is_permanent": block.is_permanent,
                "blocked_until": block.blocked_until,
            })
        except UserBlock.DoesNotExist:
            return Response({"blocked": False})


class AppealChatView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            block = request.user.block
        except UserBlock.DoesNotExist:
            return Response({"error": "Не заблоковано"}, status=400)
        chat, _ = AppealChat.objects.get_or_create(user=request.user, defaults={"block": block})
        return Response(AppealChatSerializer(chat).data)

    def post(self, request):
        try:
            block = request.user.block
        except UserBlock.DoesNotExist:
            return Response({"error": "Не заблоковано"}, status=400)
        chat, _ = AppealChat.objects.get_or_create(user=request.user, defaults={"block": block})
        if chat.is_closed:
            return Response({"error": "Чат закрито"}, status=400)
        text = request.data.get("text", "").strip()
        if not text:
            return Response({"error": "Порожнє повідомлення"}, status=400)
        msg = AppealMessage.objects.create(chat=chat, author=request.user, text=text)
        return Response(AppealMessageSerializer(msg).data, status=201)


class AppealStaffView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not is_staff(request.user):
            return Response({"error": "Недостатньо прав"}, status=403)
        chats = AppealChat.objects.filter(is_closed=False).select_related("user", "block")
        return Response(AppealChatSerializer(chats, many=True).data)

    def post(self, request, chat_id):
        if not is_staff(request.user):
            return Response({"error": "Недостатньо прав"}, status=403)
        chat = get_object_or_404(AppealChat, pk=chat_id)
        text = request.data.get("text", "").strip()
        if not text:
            return Response({"error": "Порожнє повідомлення"}, status=400)
        msg = AppealMessage.objects.create(chat=chat, author=request.user, text=text)
        return Response(AppealMessageSerializer(msg).data, status=201)


class AppealResolveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, chat_id):
        if not is_staff(request.user):
            return Response({"error": "Недостатньо прав"}, status=403)
        chat = get_object_or_404(AppealChat, pk=chat_id)
        action = request.data.get("action")

        if action == "unblock":
            UserBlock.objects.filter(user=chat.user).delete()
            chat.is_closed = True
            chat.save(update_fields=["is_closed"])
            Notification.objects.create(
                user=chat.user,
                type="moderation_warning",
                body="Вашу апеляцію розглянуто. Блокування знято.",
                link_type="",
                link_params={},
            )
            return Response({"ok": True, "unblocked": True})

        if action == "close":
            chat.is_closed = True
            chat.save(update_fields=["is_closed"])
            Notification.objects.create(
                user=chat.user,
                type="moderation_warning",
                body="Вашу апеляцію розглянуто. Рішення про блокування залишено в силі.",
                link_type="",
                link_params={},
            )
            return Response({"ok": True, "unblocked": False})

        return Response({"error": "Вкажіть action: unblock або close"}, status=400)
    

class PCSpecsAutoView(APIView):
    """
    POST /api/specs/auto/
    Викликається утилітою VortexSpecs.exe з токеном у заголовку.
    Якщо у юзера вже є specs з pc_name що збігається — оновлює.
    Якщо немає — створює новий запис.
    """
    permission_classes = [IsAuthenticated]
 
    def post(self, request):
        data = request.data
        pc_name = data.get("pc_name", "").strip()
 
        existing = PCSpecs.objects.filter(
            user=request.user,
            pc_name=pc_name,
        ).first() if pc_name else None
 
        if not existing:
            existing = PCSpecs.objects.filter(user=request.user).first()
 
        payload = {
            "label": pc_name or "Мій ПК",
            "pc_name": pc_name,
            "cpu_model": data.get("cpu_model", "").strip(),
            "gpu_model": data.get("gpu_model", "").strip(),
            "ram_gb": int(data.get("ram_gb") or 0),
            "ram_mhz": int(data.get("ram_mhz")) if data.get("ram_mhz") else None,
            "is_active": True,
        }
 
        if existing:
            for k, v in payload.items():
                setattr(existing, k, v)
            existing.save()
            return Response(PCSpecsSerializer(existing).data)
        else:
            spec = PCSpecs.objects.create(user=request.user, **payload)
            return Response(PCSpecsSerializer(spec).data, status=201)


class CustomLoginView(APIView):
    permission_classes = (AllowAny,)
 
    def post(self, request):
        from django.utils import timezone
        from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
 
        serializer = TokenObtainPairSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            return Response({"detail": "Невірний логін або пароль"}, status=401)
 
        user = serializer.user
        try:
            user.profile.last_seen = timezone.now()
            user.profile.save(update_fields=["last_seen"])
        except Exception:
            pass
 
        return Response(serializer.validated_data)
    
class FeaturedBuildsView(APIView):
    permission_classes = []
 
    def get(self, request):
        from django.utils import timezone
        featured = FeaturedBuild.objects.filter(
            expires_at__gt=timezone.now()
        ).select_related("build__author").prefetch_related("build__images", "build__reviews")
        builds = [f.build for f in featured]
        return Response(
            BuildSerializer(builds, many=True, context={"request": request}).data
        )
    
class PromoteBuildView(APIView):
    permission_classes = [IsAuthenticated]
 
    def post(self, request, build_id):
        from django.utils import timezone
        from datetime import timedelta
        build = get_object_or_404(Build, pk=build_id, author=request.user)
        FeaturedBuild.objects.filter(build=build).delete()
        FeaturedBuild.objects.create(
            build=build,
            promoted_by=request.user,
            expires_at=timezone.now() + timedelta(days=7),
        )
        return Response({"ok": True, "expires_at": timezone.now() + timedelta(days=7)})