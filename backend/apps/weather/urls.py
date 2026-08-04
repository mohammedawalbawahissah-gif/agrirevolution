from rest_framework.routers import DefaultRouter

from .views import PlantingRecommendationViewSet, WeatherForecastViewSet

router = DefaultRouter()
router.register("forecasts", WeatherForecastViewSet)
router.register("recommendations", PlantingRecommendationViewSet)

urlpatterns = router.urls
