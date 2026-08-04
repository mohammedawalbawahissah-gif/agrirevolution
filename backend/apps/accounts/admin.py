from django.contrib import admin

from .models import BuyerProfile, DealerProfile, FarmerProfile, User

admin.site.register(User)
admin.site.register(FarmerProfile)
admin.site.register(DealerProfile)
admin.site.register(BuyerProfile)
