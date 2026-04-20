import io
import os
import zipfile
import tempfile

import requests
from django.http import HttpResponse
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Build


class WorkshopBuildView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        files = request.FILES.getlist("files[]")
        paths = request.data.getlist("paths[]")
        build_name = request.data.get("build_name", "workshop_build").strip()
        build_name = "".join(c for c in build_name if c.isalnum() or c in (" ", "-", "_")).strip() or "workshop_build"

        catalog_paths = request.data.getlist("catalog_paths[]")
        catalog_build_ids = request.data.getlist("catalog_build_ids[]")
        catalog_dest_paths = request.data.getlist("catalog_dest_paths[]")

        if not files and not catalog_paths:
            return Response({"error": "Немає файлів для пакування"}, status=400)

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for file_obj, path in zip(files, paths):
                clean_path = path.lstrip("/").replace("..", "")
                if not clean_path:
                    continue
                zf.writestr(clean_path, file_obj.read())

            for cat_path, build_id, dest_path in zip(catalog_paths, catalog_build_ids, catalog_dest_paths):
                try:
                    build = Build.objects.get(pk=build_id)
                    clean_dest = dest_path.lstrip("/").replace("..", "")
                    if not clean_dest:
                        continue

                    if build.archive_url:
                        response = requests.get(build.archive_url, timeout=30)
                        with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
                            tmp.write(response.content)
                            tmp_path = tmp.name
                        try:
                            with zipfile.ZipFile(tmp_path, "r") as source_zip:
                                try:
                                    file_data = source_zip.read(cat_path)
                                    zf.writestr(clean_dest, file_data)
                                except KeyError:
                                    pass
                        finally:
                            os.unlink(tmp_path)
                    elif build.source_file:
                        try:
                            with zipfile.ZipFile(build.source_file.path, "r") as source_zip:
                                try:
                                    file_data = source_zip.read(cat_path)
                                    zf.writestr(clean_dest, file_data)
                                except KeyError:
                                    pass
                        except Exception:
                            pass
                except Build.DoesNotExist:
                    pass
                except Exception:
                    pass

        buffer.seek(0)
        zip_name = f"{build_name}.zip"
        response = HttpResponse(buffer.read(), content_type="application/zip")
        response["Content-Disposition"] = f'attachment; filename="{zip_name}"'
        return response


class WorkshopSaveView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        import uuid
        from django.core.files.base import ContentFile
        from .models import WorkshopDraft

        files = request.FILES.getlist("files[]")
        paths = request.data.getlist("paths[]")
        build_name = request.data.get("build_name", "workshop_build").strip()
        build_name = "".join(c for c in build_name if c.isalnum() or c in (" ", "-", "_")).strip() or "workshop_build"

        if not files:
            return Response({"error": "Немає файлів"}, status=400)

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for file_obj, path in zip(files, paths):
                clean_path = path.lstrip("/").replace("..", "")
                if not clean_path:
                    continue
                zf.writestr(clean_path, file_obj.read())

        buffer.seek(0)
        zip_name = f"{build_name}.zip"

        draft = WorkshopDraft.objects.create(
            user=request.user,
            build_name=build_name,
        )
        draft.zip_file.save(zip_name, ContentFile(buffer.read()))
        draft.save()

        return Response({
            "draft_id": draft.id,
            "build_name": build_name,
            "zip_name": zip_name,
        })