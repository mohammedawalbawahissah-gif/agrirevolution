from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/accounts/", include("apps.accounts.urls")),
    path("api/weather/", include("apps.weather.urls")),
    path("api/equipment/", include("apps.equipment.urls")),
    path("api/marketplace/", include("apps.marketplace.urls")),
    path("api/payments/", include("apps.payments.urls")),
    path("api/ussd/", include("apps.ussd.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/assistant/", include("apps.assistant.urls")),
    path("api/cropcare/", include("apps.cropcare.urls")),
    path("api/inputs/", include("apps.inputs.urls")),
]
