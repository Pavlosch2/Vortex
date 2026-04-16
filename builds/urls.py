from django.urls import include, path

from rest_framework.routers import DefaultRouter

from .views import (
    AdminBuildViewSet,
    AdminUserDetailView,
    AdminUserListView,
    AnalysisLogView,
    AnalysisTaskView,
    BuildSubmissionViewSet,
    BuildViewSet,
    PCSpecsViewSet,
    ProfileView,
    SupportTicketViewSet,
    NotificationListView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
    NotificationDeleteView,
    NotificationDeleteAllView,
)

router = DefaultRouter()
router.register(r"specs", PCSpecsViewSet, basename="specs")
router.register(r"builds", BuildViewSet, basename="builds")
router.register(r"submissions", BuildSubmissionViewSet, basename="submissions")
router.register(r"support", SupportTicketViewSet, basename="support")
router.register(r"admin/builds", AdminBuildViewSet, basename="admin-builds")

urlpatterns = [
    path("", include(router.urls)),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("tasks/<int:task_id>/", AnalysisTaskView.as_view(), name="task-status"),
    path("analysis/", AnalysisLogView.as_view(), name="analysis-history"),
    path("admin/users/", AdminUserListView.as_view(), name="admin-users"),
    path(
        "admin/users/<int:user_id>/",
        AdminUserDetailView.as_view(),
        name="admin-user-detail",
    ),
    path("notifications/", NotificationListView.as_view(), name="notifications-list"),
    path("notifications/mark-all-read/", NotificationMarkAllReadView.as_view(), name="notifications-mark-all"),
    path("notifications/clear-all/", NotificationDeleteAllView.as_view(), name="notifications-clear-all"),
    path("notifications/<int:pk>/read/", NotificationMarkReadView.as_view(), name="notification-read"),
    path("notifications/<int:pk>/delete/", NotificationDeleteView.as_view(), name="notification-delete"),
]
