from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.auth.models import User
from django.urls import include, path

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from builds.views import (
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
    EmailConfirmView,
    CustomLoginView
)


def google_callback_redirect(request):
    import logging

    from django.shortcuts import redirect

    logger = logging.getLogger(__name__)

    logger.warning(
        f"google_callback: user={request.user}, authenticated={request.user.is_authenticated}, session={dict(request.session)}"
    )

    user_id = request.session.get("_auth_user_id")
    logger.warning(f"session user_id={user_id}")

    if not request.user.is_authenticated:
        user_id = request.session.get("_auth_user_id")
        if not user_id:
            logger.warning("No user_id in session, redirecting with error")
            return redirect("http://localhost:3000?auth_error=1")
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return redirect("http://localhost:3000?auth_error=1")
    else:
        user = request.user

    refresh = RefreshToken.for_user(user)
    token = str(refresh.access_token)
    logger.warning(f"Redirecting with token for user={user.username}")
    return redirect(f"http://localhost:3000?token={token}")


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("builds.urls")),
    path("api/auth/register/", RegisterView.as_view(), name="auth_register"),
    path("api/auth/login/", CustomLoginView.as_view(), name="token_obtain_pair"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path(
        "api/auth/password-reset/",
        PasswordResetRequestView.as_view(),
        name="password_reset",
    ),
    path(
        "api/auth/password-reset-confirm/",
        PasswordResetConfirmView.as_view(),
        name="password_reset_confirm",
    ),
    path(
        "api/auth/confirm-email/<str:uid>/<str:token>/",
        EmailConfirmView.as_view(),
        name="email_confirm",
    ),
    path("auth/", include("allauth.urls")),
    path("accounts/profile/", google_callback_redirect, name="google_done"),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)