from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PCSpecsViewSet, BuildViewSet

router = DefaultRouter()
router.register(r'specs', PCSpecsViewSet, basename='specs')
router.register(r'builds', BuildViewSet, basename='builds')

urlpatterns = [
    path('', include(router.urls)),
]