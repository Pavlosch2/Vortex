from rest_framework import viewsets
from .models import PCSpecs
from .serializers import PCSpecsSerializer

class PCSpecsViewSet(viewsets.ModelViewSet):
    queryset = PCSpecs.objects.all()
    serializer_class = PCSpecsSerializer