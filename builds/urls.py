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
]
