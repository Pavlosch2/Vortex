from django.contrib.auth.models import User  # <--- ДОДАЙ ЦЕЙ РЯДОК
from django.shortcuts import render
from rest_framework import viewsets, status, permissions, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import PCSpecs, Build, AIAnalysisLog
from .serializers import (
    PCSpecsSerializer, 
    BuildSerializer, 
    RegisterSerializer
)
from .ai_logic import get_compatibility_analysis

class BuildViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Build.objects.all()
    serializer_class = BuildSerializer

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny])
    def analyze(self, request, pk=None):
        build = self.get_object()
        user = request.user
        if not user.is_authenticated:
            from django.contrib.auth.models import User
            user = User.objects.filter(is_superuser=True).first()
            if not user:
                return Response({"error": "Тестовий користувач не знайдений"}, status=500)

        profile = user.profile
        specs = PCSpecs.objects.filter(user=user, is_active=True).first()

        if not specs:
            return Response(
                {"error": f"Додайте характеристики ПК для користувача {user.username}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        if not profile.is_premium and profile.ai_credits <= 0:
            return Response(
                {"error": "Закінчилися AI-кредити"}, 
                status=status.HTTP_402_PAYMENT_REQUIRED
            )

        result = get_compatibility_analysis(specs, build)
        
        if "error" not in result:
            if not profile.is_premium:
                profile.ai_credits -= 1
                profile.save()

            AIAnalysisLog.objects.create(
                user=user,
                build=build,
                specs=specs,
                verdict=result.get("verdict"),
                predicted_fps=result.get("fps_prediction")
            )
            return Response(result)
        
        return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PCSpecsViewSet(viewsets.ModelViewSet):
    serializer_class = PCSpecsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PCSpecs.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)



class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer