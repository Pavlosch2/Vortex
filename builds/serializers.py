from django.contrib.auth.models import User
from django.db.models import Avg

from rest_framework import serializers

from .models import (
    AIAnalysisLog,
    AnalysisTask,
    Build,
    BuildImage,
    BuildPost,
    BuildPostReply,
    BuildReview,
    BuildSubmission,
    Component,
    Favorite,
    PCSpecs,
    Profile,
    SupportTicket,
    TicketReply,
    TicketScreenshot,
    Notification,
    UserWarning,
    UserBlock,
    AppealChat,
    AppealMessage,
    ProfileMessage,
)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    age = serializers.IntegerField(write_only=True)
    email = serializers.EmailField(required=True)

    class Meta:
        model = User
        fields = ["username", "email", "password", "age"]

    def validate_age(self, value):
        if value < 16:
            raise serializers.ValidationError("Доступ дозволено з 16 років.")
        if value > 100:
            raise serializers.ValidationError("Вкажіть реальний вік (до 100 років).")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Цей email вже використовується.")
        return value

    def create(self, validated_data):
        age = validated_data.pop("age")
        email = validated_data.pop("email")
        user = User.objects.create_user(
            username=validated_data["username"],
            email=email,
            password=validated_data["password"],
        )
        profile, _ = Profile.objects.get_or_create(user=user)
        profile.age = age
        profile.save(update_fields=["age"])
        return user


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    avatar = serializers.SerializerMethodField()
    banner = serializers.SerializerMethodField()
    is_premium = serializers.SerializerMethodField()

    def get_avatar(self, obj):
        if not obj.avatar:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.avatar.url)
        return obj.avatar.url

    def get_banner(self, obj):
        if not obj.banner:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.banner.url)
        return obj.banner.url

    def get_is_premium(self, obj):
        return obj.plan in ("standard", "pro")

    class Meta:
        model = Profile
        fields = [
            "username", "role", "ai_credits", "is_premium",
            "avatar", "banner", "bio", "plan",
            "profile_color", "avatar_frame", "av_checks_left",
        ]


class ProfileMessageSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.username", read_only=True)
    author_avatar = serializers.SerializerMethodField()
    is_own = serializers.SerializerMethodField()
 
    def get_author_avatar(self, obj):
        try:
            request = self.context.get("request")
            avatar = obj.author.profile.avatar
            if avatar and request:
                return request.build_absolute_uri(avatar.url)
        except Exception:
            pass
        return None
 
    def get_is_own(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.author_id == request.user.id or obj.target_user_id == request.user.id
 
    class Meta:
        model = ProfileMessage
        fields = ["id", "author_name", "author_avatar", "text", "created_at", "is_own"]
 
 
class PublicProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    date_joined = serializers.DateTimeField(source="user.date_joined", read_only=True)
    avatar = serializers.SerializerMethodField()
    banner = serializers.SerializerMethodField()
    build_count = serializers.SerializerMethodField()
    post_count = serializers.SerializerMethodField()
 
    def get_avatar(self, obj):
        if not obj.avatar:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.avatar.url)
        return obj.avatar.url
 
    def get_banner(self, obj):
        if not obj.banner:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.banner.url)
        return obj.banner.url
 
    def get_build_count(self, obj):
        return Build.objects.filter(author=obj.user, is_public=True).count()
 
    def get_post_count(self, obj):
        from .models import BuildPost
        return BuildPost.objects.filter(author=obj.user).count()
 
    class Meta:
        model = Profile
        fields = [
            "username", "role", "avatar", "banner", "bio",
            "last_seen", "date_joined", "build_count", "post_count",
        ]


class PCSpecsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PCSpecs
        fields = ["id", "label", "pc_name", "cpu_model", "gpu_model", "ram_gb", "ram_mhz", "is_active"]


class ComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Component
        fields = ["id", "name", "category", "complexity_level"]


class BuildImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuildImage
        fields = ["id", "image", "is_cover"]


class BuildSerializer(serializers.ModelSerializer):
    components = ComponentSerializer(many=True, read_only=True)
    images = serializers.SerializerMethodField()
    is_favorite = serializers.SerializerMethodField()
    tag_list = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    post_count = serializers.SerializerMethodField()
    user_review = serializers.SerializerMethodField()
    author_name = serializers.CharField(source="author.username", read_only=True, allow_null=True)

    class Meta:
        model = Build
        fields = [
            "id",
            "title",
            "description",
            "build_type",
            "rating",
            "components",
            "images",
            "video_url",
            "tags",
            "tag_list",
            "magnet_link",
            "info_hash",
            "torrent_file",
            "archive_url",
            "archive_identifier",
            "updated_at",
            "created_at",
            "is_favorite",
            "review_count",
            "post_count",
            "user_review",
            "download_count",
            "author_name",
            "is_premium_only",
        ]

    def get_images(self, obj):
        request = self.context.get("request")
        result = []
        for img in obj.images.all():
            url = img.image.url if img.image else None
            if url and request:
                url = request.build_absolute_uri(url)
            result.append({"id": img.id, "image": url, "is_cover": img.is_cover})
        return result

    def get_is_favorite(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return Favorite.objects.filter(user=request.user, build=obj).exists()
        return False

    def get_tag_list(self, obj):
        if not obj.tags:
            return []
        return [t.strip() for t in obj.tags.split(",") if t.strip()]

    def get_rating(self, obj):
        result = obj.reviews.aggregate(avg=Avg("score"))["avg"]
        return round(float(result), 1) if result else 0.0

    def get_review_count(self, obj):
        return obj.reviews.count()

    def get_post_count(self, obj):
        return obj.posts.count()

    def get_user_review(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            rev = obj.reviews.filter(user=request.user).first()
            if rev:
                return {"score": rev.score, "text": rev.text}
        return None


class BuildReviewSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    is_author_premium = serializers.SerializerMethodField()

    def get_is_author_premium(self, obj):
        try:
            return obj.user.profile.is_premium
        except Exception:
            return False

    class Meta:
        model = BuildReview
        fields = ["id", "username", "score", "text", "created_at", "is_author_premium",]
        read_only_fields = ["id", "username", "created_at", "is_author_premium",]

    def validate_score(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Оцінка має бути від 1 до 5.")
        return value


class BuildPostReplySerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="author.username", read_only=True)
    is_own = serializers.SerializerMethodField()
    is_author_premium = serializers.BooleanField(source="author.profile.is_premium", read_only=True, default=False)

    def get_replies(self, obj):
        request = self.context.get("request")
        return TicketReplySerializer(
            obj.replies.all(), many=True, context={"request": request}
        ).data

    def get_is_own(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.author == request.user
        return False

    class Meta:
        model = BuildPostReply
        fields = ["id", "username", "text", "is_own", "created_at"]
        read_only_fields = ["id", "username", "is_own", "created_at"]


class BuildPostSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="author.username", read_only=True)
    is_pinned = serializers.BooleanField(read_only=True)
    is_own = serializers.SerializerMethodField()
    replies = BuildPostReplySerializer(many=True, read_only=True)
    is_author_premium = serializers.BooleanField(source="author.profile.is_premium", read_only=True, default=False)

    def get_replies(self, obj):
        request = self.context.get("request")
        return TicketReplySerializer(
            obj.replies.all(), many=True, context={"request": request}
        ).data

    def get_is_own(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.author == request.user
        return False

    class Meta:
        model = BuildPost
        fields = [
            "id",
            "username",
            "text",
            "is_pinned",
            "is_own",
            "is_author_premium",
            "replies",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "username",
            "is_pinned",
            "is_own",
            "is_author_premium",
            "replies",
            "created_at",
        ]

class BuildSubmissionSerializer(serializers.ModelSerializer):
    submitted_by_name = serializers.CharField(
        source="submitted_by.username", read_only=True
    )
    published_build_id = serializers.IntegerField(
        source="published_build.id", read_only=True, allow_null=True
    )

    class Meta:
        model = BuildSubmission
        fields = [
            "id",
            "submitted_by_name",
            "title",
            "description",
            "build_type",
            "tags",
            "video_url",
            "source_file",
            "cover_image",
            "status",
            "rejection_reason",
            "published_build_id",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["status", "rejection_reason", "published_build_id"]


class AnalysisTaskSerializer(serializers.ModelSerializer):
    build_title = serializers.CharField(source="build.title", read_only=True)
    log_id = serializers.SerializerMethodField()

    class Meta:
        model = AnalysisTask
        fields = [
            "id",
            "build",
            "build_title",
            "status",
            "result",
            "error_msg",
            "log_id",
            "created_at",
            "updated_at",
        ]

    def get_log_id(self, obj):
        try:
            return obj.log.id
        except Exception:
            return None


class AIAnalysisLogSerializer(serializers.ModelSerializer):
    build_title = serializers.CharField(source="build.title", read_only=True)
    build_id = serializers.IntegerField(source="build.id", read_only=True)

    class Meta:
        model = AIAnalysisLog
        fields = [
            "id",
            "build_id",
            "build_title",
            "verdict",
            "predicted_fps",
            "risks",
            "recommendations",
            "created_at",
        ]


class TicketScreenshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketScreenshot
        fields = ["id", "image"]


class TicketReplySerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)
    author_avatar = serializers.SerializerMethodField()
    is_staff = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = TicketReply
        fields = ['id', 'author_name', 'author_avatar', 'is_staff', 'message', 'image', 'created_at']

    def get_is_staff(self, obj):
        try:
            return obj.author.profile.role in ('manager', 'admin')
        except Exception:
            return False

    def get_author_avatar(self, obj):
        try:
            request = self.context.get('request')
            avatar = obj.author.profile.avatar
            if avatar and request:
                return request.build_absolute_uri(avatar.url)
        except Exception:
            pass
        return None

    def get_image(self, obj):
        try:
            request = self.context.get('request')
            if obj.image and request:
                return request.build_absolute_uri(obj.image.url)
        except Exception:
            pass
        return None


class SupportTicketSerializer(serializers.ModelSerializer):
    screenshots = TicketScreenshotSerializer(many=True, read_only=True)
    replies = serializers.SerializerMethodField()
    reply_count = serializers.IntegerField(source="replies.count", read_only=True)
    submitted_by = serializers.CharField(source="user.username", read_only=True)
    is_own = serializers.SerializerMethodField()

    class Meta:
        model = SupportTicket
        fields = [
            "id",
            "submitted_by",
            "is_own",
            "subject",
            "message",
            "status",
            "created_at",
            "updated_at",
            "screenshots",
            "replies",
            "reply_count",
        ]

    def get_replies(self, obj):
        request = self.context.get("request")
        return TicketReplySerializer(
            obj.replies.all(), many=True, context={"request": request}
        ).data

    def get_is_own(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return obj.user == request.user
        return False


class UserAdminSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source="profile.role")
    ai_credits = serializers.IntegerField(source="profile.ai_credits")
    plan = serializers.CharField(source="profile.plan", required=False)
    plan_expires_at = serializers.DateTimeField(source="profile.plan_expires_at", required=False, allow_null=True)
    avatar = serializers.SerializerMethodField()
    is_blocked = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "is_active",
            "role", "ai_credits", "plan", "plan_expires_at",
            "avatar", "date_joined", "is_blocked",
        ]

    def get_avatar(self, obj):
        try:
            request = self.context.get("request")
            avatar = obj.profile.avatar
            if avatar and request:
                return request.build_absolute_uri(avatar.url)
        except Exception:
            pass
        return None

    def get_is_blocked(self, obj):
        try:
            return obj.block.is_active()
        except Exception:
            return False

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        profile = instance.profile
        for attr, val in profile_data.items():
            setattr(profile, attr, val)
        profile.save()
        return instance

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "type",
            "is_read",
            "actor_name",
            "title",
            "body",
            "link_type",
            "link_params",
            "created_at",
        ]
        read_only_fields = ["id", "type", "actor_name", "title", "body", "link_type", "link_params", "created_at"]


class UserWarningSerializer(serializers.ModelSerializer):
    issued_by_name = serializers.CharField(source="issued_by.username", read_only=True)
    user_name = serializers.CharField(source="user.username", read_only=True)
    time_left_seconds = serializers.SerializerMethodField()

    def get_time_left_seconds(self, obj):
        from django.utils import timezone
        if obj.status != "active":
            return 0
        diff = (obj.expires_at - timezone.now()).total_seconds()
        return max(0, int(diff))

    class Meta:
        model = UserWarning
        fields = ["id", "user_name", "issued_by_name", "reason", "status", "created_at", "expires_at", "time_left_seconds"]


class UserBlockSerializer(serializers.ModelSerializer):
    blocked_by_name = serializers.CharField(source="blocked_by.username", read_only=True)

    class Meta:
        model = UserBlock
        fields = ["id", "reason", "is_permanent", "blocked_until", "blocked_by_name", "created_at"]


class AppealMessageSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.username", read_only=True)
    is_staff = serializers.SerializerMethodField()

    def get_is_staff(self, obj):
        try:
            return obj.author.profile.role in ("manager", "admin")
        except Exception:
            return False

    class Meta:
        model = AppealMessage
        fields = ["id", "author_name", "is_staff", "text", "created_at"]


class AppealChatSerializer(serializers.ModelSerializer):
    messages = AppealMessageSerializer(many=True, read_only=True)
    block = UserBlockSerializer(read_only=True)

    class Meta:
        model = AppealChat
        fields = ["id", "is_closed", "created_at", "messages", "block"]