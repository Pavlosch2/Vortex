from rest_framework import serializers
from .models import PCSpecs, Build, Component, BuildImage, Profile
from django.contrib.auth.models import User

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    age = serializers.IntegerField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'password', 'age']

    def create(self, validated_data):
        age = validated_data.pop('age')
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password']
        )
        Profile.objects.create(user=user, age=age)
        return user

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