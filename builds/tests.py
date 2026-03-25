from django.test import TestCase
from django.contrib.auth.models import User
from .models import Profile, Build, Component, PCSpecs

class ProfileSignalTest(TestCase):
    def test_profile_created_on_user_save(self):
        # Створюємо користувача
        user = User.objects.create_user(username="testuser", password="password123")
        
        # Перевіряємо, чи створився профіль автоматично
        self.assertTrue(Profile.objects.filter(user=user).exists())
        self.assertEqual(user.profile.role, "user")

class FavoriteModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="fan", password="password")
        self.build = Build.objects.create(title="Cool Script", author=self.user)

    def test_unique_favorite_constraint(self):
        from django.db import IntegrityError
        from .models import Favorite
        
        # Перше додавання — успішно
        Favorite.objects.create(user=self.user, build=self.build)
        
        # Друге додавання того самого — має викликати помилку
        with self.assertRaises(IntegrityError):
            Favorite.objects.create(user=self.user, build=self.build)

class PCSpecsTest(TestCase):
    def test_pc_specs_str_representation(self):
        user = User.objects.create_user(username="gamer")
        specs = PCSpecs.objects.create(
            user=user,
            label="Home PC",
            cpu_model="Ryzen 5 5600",
            gpu_model="RTX 3060",
            ram_gb=16
        )
        self.assertEqual(str(specs), "Home PC (RTX 3060)")