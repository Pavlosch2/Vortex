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

    def get_avatar(self, obj):
        if not obj.avatar:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.avatar.url)
        return obj.avatar.url

    class Meta:
        model = Profile
        fields = ["username", "role", "ai_credits", "is_premium", "avatar", "bio"]


class PCSpecsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PCSpecs
        fields = ["id", "cpu_model", "gpu_model", "ram_gb", "is_active"]


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

    class Meta:
        model = BuildReview
        fields = ["id", "username", "score", "text", "created_at"]
        read_only_fields = ["id", "username", "created_at"]

    def validate_score(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Оцінка має бути від 1 до 5.")
        return value


class BuildPostReplySerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="author.username", read_only=True)
    is_own = serializers.SerializerMethodField()

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
            "replies",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "username",
            "is_pinned",
            "is_own",
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
    author_name = serializers.CharField(source="author.username", read_only=True)
    author_avatar = serializers.SerializerMethodField()
    is_staff = serializers.SerializerMethodField()

    class Meta:
        model = TicketReply
        fields = [
            "id",
            "author_name",
            "author_avatar",
            "is_staff",
            "message",
            "created_at",
        ]

    def get_is_staff(self, obj):
        try:
            return obj.author.profile.role in ("manager", "admin")
        except Exception:
            return False

    def get_author_avatar(self, obj):
        try:
            request = self.context.get("request")
            avatar = obj.author.profile.avatar
            if avatar and request:
                return request.build_absolute_uri(avatar.url)
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
    is_premium = serializers.BooleanField(source="profile.is_premium")
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "is_active",
            "role",
            "ai_credits",
            "is_premium",
            "avatar",
            "date_joined",
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

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        profile = instance.profile
        for attr, val in profile_data.items():
            setattr(profile, attr, val)
        profile.save()
        return instance
