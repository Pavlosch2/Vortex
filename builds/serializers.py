from rest_framework import serializers
from .models import PCSpecs

class PCSpecsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PCSpecs
        fields = '__all__'