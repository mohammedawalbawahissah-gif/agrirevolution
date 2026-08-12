"""
Django settings for AgriRevolution backend.

Structure follows the six-app pattern:
  accounts       -> farmers, dealers, buyers, admins (custom user model)
  weather        -> AI-driven climate/weather predictions for planting & harvest timing
  equipment      -> on-demand mechanization requests, dealer listings, bookings
  marketplace    -> produce listings, AI photo grading, fair-price bands
  payments       -> MoMo (Hubtel/MTN) pay-per-use for equipment & produce sales
  ussd           -> Africa's Talking USSD + voice + SMS for low-literacy access
  notifications  -> push/SMS notifications across the farming cycle
"""

import os
from datetime import timedelta
from pathlib import Path

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-insecure-change-me")
DEBUG = os.environ.get("DEBUG", "True") == "True"

ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "*").split(",")
CSRF_TRUSTED_ORIGINS = [
    o for o in os.environ.get("CSRF_TRUSTED_ORIGINS", "").split(",") if o
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # third party
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    # local apps
    "apps.accounts",
    "apps.weather",
    "apps.equipment",
    "apps.marketplace",
    "apps.payments",
    "apps.ussd",
    "apps.notifications",
    "apps.assistant",
    "apps.cropcare",
    "apps.inputs",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# Database (Railway injects DATABASE_URL for Postgres)
DATABASES = {
    "default": dj_database_url.config(
        default=os.environ.get("DATABASE_URL", "sqlite:///db.sqlite3"),
        conn_max_age=600,
    )
}

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Accra"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_FILTER_BACKENDS": ("django_filters.rest_framework.DjangoFilterBackend",),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=12),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),
    "ROTATE_REFRESH_TOKENS": True,
}

CORS_ALLOWED_ORIGINS = [
    o for o in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",") if o
]
CORS_ALLOW_ALL_ORIGINS = DEBUG  # relaxed only in local dev

# --- Third-party service credentials (all read from env, never hardcoded) ---

# Africa's Talking (USSD, voice, SMS)
AT_USERNAME = os.environ.get("AT_USERNAME", "")
AT_API_KEY = os.environ.get("AT_API_KEY", "")
AT_SENDER_ID = os.environ.get("AT_SENDER_ID", "")

# MoMo / Hubtel payments
HUBTEL_CLIENT_ID = os.environ.get("HUBTEL_CLIENT_ID", "")
HUBTEL_CLIENT_SECRET = os.environ.get("HUBTEL_CLIENT_SECRET", "")
HUBTEL_MERCHANT_ACCOUNT = os.environ.get("HUBTEL_MERCHANT_ACCOUNT", "")

# Anthropic API (weather-risk narration, produce photo grading, etc.)
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# Weather data provider (e.g. Open-Meteo / GMet feed) feeding the AI prediction layer
WEATHER_PROVIDER_API_KEY = os.environ.get("WEATHER_PROVIDER_API_KEY", "")

# Cloudinary reads its own CLOUDINARY_URL env var automatically if present
# (format: cloudinary://<api_key>:<api_secret>@<cloud_name>), so that's the
# primary source. CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET are supported as
# an explicit override. CLOUDINARY_USER_NAME is accepted as a fallback for
# cloud name specifically, since that's the variable name this project's
# Railway environment actually uses (a non-standard name for the same value).
CLOUDINARY_CLOUD_NAME = (
    os.environ.get("CLOUDINARY_CLOUD_NAME", "") or os.environ.get("CLOUDINARY_USER_NAME", "")
)
CLOUDINARY_API_KEY = os.environ.get("CLOUDINARY_API_KEY", "")
CLOUDINARY_API_SECRET = os.environ.get("CLOUDINARY_API_SECRET", "")
CLOUDINARY_URL = os.environ.get("CLOUDINARY_URL", "")
