"""
Shared role-based permission classes used across every app's viewsets.

Design: DRF's default IsAuthenticated only checks "are you logged in", not
"should you be able to do this". These classes add the role/ownership layer
on top so a farmer can't edit another farmer's listing, a dealer can't touch
another dealer's equipment, and only admins can manage the full user list.
"""

from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsAdminRole(BasePermission):
    """Only users with role='admin' (or Django is_staff) may access."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (user.role == "admin" or user.is_staff))


class IsAdminOrReadOnly(BasePermission):
    """Anyone authenticated can read; only admins can write."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role == "admin" or request.user.is_staff


class IsDealerRole(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role == "dealer")


class IsInputDealerRole(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role == "input_dealer")


class IsFarmerRole(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role == "farmer")


class IsBuyerRole(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role == "buyer")


class IsOwnerOrAdmin(BasePermission):
    """
    Object-level permission: the object must have an `owner_field` attribute
    (set on the view, e.g. owner_field = "dealer") whose value is the request
    user, OR the request user must be an admin.
    """

    def has_object_permission(self, request, view, obj):
        user = request.user
        if user.role == "admin" or user.is_staff:
            return True
        owner_field = getattr(view, "owner_field", "user")
        owner = getattr(obj, owner_field, None)
        return owner == user
