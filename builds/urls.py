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
    AdminWarnUserView,
    AdminBlockUserView,
    AdminUnblockUserView,
    AdminWarningListView,
    AdminWarningDeleteView,
    BlockStatusView,
    AppealChatView,
    AppealStaffView,
    AppealResolveView,
    PCSpecsAutoView,
    EmailConfirmView,
    PublicProfileView,
    PublicProfileBuildsView,
    ProfileMessageView,
    ProfileMessageDeleteView,
    FeaturedBuildsView, 
    PromoteBuildView,
)

from .workshop_views import WorkshopBuildView, WorkshopSaveView

router = DefaultRouter()
router.register(r"specs", PCSpecsViewSet, basename="specs")
router.register(r"builds", BuildViewSet, basename="builds")
router.register(r"submissions", BuildSubmissionViewSet, basename="submissions")
router.register(r"support", SupportTicketViewSet, basename="support")
router.register(r"admin/builds", AdminBuildViewSet, basename="admin-builds")

urlpatterns = [
    path("specs/auto/", PCSpecsAutoView.as_view(), name="specs-auto"),
    path("builds/featured/", FeaturedBuildsView.as_view(), name="featured-builds"),
    path("builds/<int:build_id>/promote/", PromoteBuildView.as_view(), name="promote-build"),
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
    path("admin/users/<int:user_id>/warn/", AdminWarnUserView.as_view(), name="admin-warn-user"),
    path("admin/users/<int:user_id>/block/", AdminBlockUserView.as_view(), name="admin-block-user"),
    path("admin/users/<int:user_id>/unblock/", AdminUnblockUserView.as_view(), name="admin-unblock-user"),
    path("admin/warnings/", AdminWarningListView.as_view(), name="admin-warnings"),
    path("admin/warnings/<int:warning_id>/", AdminWarningDeleteView.as_view(), name="admin-warning-delete"),
    path("block-status/", BlockStatusView.as_view(), name="block-status"),
    path("appeal/", AppealChatView.as_view(), name="appeal-chat"),
    path("appeal/staff/", AppealStaffView.as_view(), name="appeal-staff"),
    path("appeal/<int:chat_id>/message/", AppealStaffView.as_view(), name="appeal-staff-message"),
    path("appeal/<int:chat_id>/resolve/", AppealResolveView.as_view(), name="appeal-resolve"),
    path("users/<str:username>/", PublicProfileView.as_view(), name="public-profile"),
    path("users/<str:username>/builds/", PublicProfileBuildsView.as_view(), name="public-profile-builds"),
    path("users/<str:username>/messages/", ProfileMessageView.as_view(), name="profile-messages"),
    path("users/<str:username>/messages/<int:msg_id>/", ProfileMessageDeleteView.as_view(), name="profile-message-delete"),
    path("workshop/build/", WorkshopBuildView.as_view(), name="workshop-build"),
    path("workshop/save/", WorkshopSaveView.as_view(), name="workshop-save"),
]
