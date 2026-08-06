from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import TransactionViewSet, payment_webhook

router = DefaultRouter()
router.register("transactions", TransactionViewSet)

urlpatterns = [
    path("webhook/", payment_webhook, name="payment-webhook"),
] + router.urls
