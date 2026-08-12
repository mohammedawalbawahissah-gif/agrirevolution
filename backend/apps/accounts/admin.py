from django.contrib import admin

from .models import BuyerProfile, DealerProfile, FarmerProfile, InputDealerProfile, User

admin.site.register(User)
admin.site.register(FarmerProfile)
admin.site.register(DealerProfile)
admin.site.register(InputDealerProfile)
admin.site.register(BuyerProfile)
