from rest_framework.routers import DefaultRouter

from .views import TransactionViewSet

router = DefaultRouter()
router.register("transactions", TransactionViewSet)

urlpatterns = router.urls
