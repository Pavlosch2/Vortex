from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .serializers import BuildSerializer

from .models import PCSpecs, Build, AIAnalysisLog
from .serializers import PCSpecsSerializer
from .ai_logic import get_compatibility_analysis

class BuildViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Build.objects.all()
    serializer_class = BuildSerializer

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def analyze(self, request, pk=None):
        build = self.get_object()
        profile = request.user.profile

        specs = PCSpecs.objects.filter(user=request.user, is_active=True).first()
        if not specs:
            return Response(
                {"error": "Додайте характеристики ПК у профілі"}, 
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
                user=request.user,
                build=build,
                specs=specs,
                verdict=result.get("verdict"),
                predicted_fps=result.get("fps_prediction")
            )
            return Response(result)
        
        return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PCSpecsViewSet(viewsets.ModelViewSet):
    queryset = PCSpecs.objects.all()
    serializer_class = PCSpecsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PCSpecs.objects.filter(user=self.request.user)