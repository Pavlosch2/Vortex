from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
import re

class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    def is_auto_signup_allowed(self, request, sociallogin):
        return True

    def pre_social_login(self, request, sociallogin):
        if sociallogin.is_existing:
            return
        if not sociallogin.user.username:
            email = sociallogin.account.extra_data.get('email', '')
            base = re.sub(r'[^a-zA-Z0-9]', '', email.split('@')[0])[:20] or 'user'
            from django.contrib.auth.models import User
            username = base
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base}{counter}"
                counter += 1
            sociallogin.user.username = username

    def populate_user(self, request, sociallogin, data):
        user = super().populate_user(request, sociallogin, data)
        if not user.username:
            email = data.get('email', '')
            base = re.sub(r'[^a-zA-Z0-9]', '', email.split('@')[0])[:20] or 'user'
            from django.contrib.auth.models import User
            username = base
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base}{counter}"
                counter += 1
            user.username = username
        return user