from django.utils import timezone
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    Read-side API for notifications. Notifications themselves are only ever
    created server-side via apps.notifications.services.notify() — there is
    intentionally no create/update/delete here, just list/retrieve plus the
    read-tracking actions below.
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["channel", "category", "is_sent", "is_read"]

    def get_queryset(self):
        # Every user — including admins — only ever sees their own
        # notifications here; this is a personal inbox, not an admin tool.
        return Notification.objects.filter(user=self.request.user).select_related("user")

    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"unread_count": count})

    @action(detail=True, methods=["post"])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=["is_read", "read_at"])
        return Response(self.get_serializer(notification).data)

    @action(detail=False, methods=["post"])
    def mark_all_read(self, request):
        now = timezone.now()
        updated = self.get_queryset().filter(is_read=False).update(is_read=True, read_at=now)
        return Response({"marked_read": updated})
