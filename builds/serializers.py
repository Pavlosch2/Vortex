from rest_framework import serializers
from .models import PCSpecs, Build, Component, BuildImage

class PCSpecsSerializer(serializers.ModelSerializer):
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = PCSpecs
        fields = ['id', 'user', 'label', 'cpu_model', 'gpu_model', 'ram_gb', 'is_active']

class ComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Component
        fields = ['id', 'name', 'category', 'complexity_level']

class BuildImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = BuildImage
        fields = ['image', 'is_cover']

class BuildSerializer(serializers.ModelSerializer):
    components = ComponentSerializer(many=True, read_only=True)
    images = BuildImageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Build
        fields = [
            'id', 'title', 'description', 'components', 'images', 
            'video_url', 'tags', 'magnet_link', 'info_hash', 'updated_at'
        ]