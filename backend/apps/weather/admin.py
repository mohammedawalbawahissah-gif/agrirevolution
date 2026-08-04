from django.contrib import admin

from .models import PlantingRecommendation, WeatherForecast

admin.site.register(WeatherForecast)
admin.site.register(PlantingRecommendation)
