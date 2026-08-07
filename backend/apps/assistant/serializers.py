from rest_framework import serializers


class ChatHistoryTurnSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["user", "assistant"])
    content = serializers.CharField()


class ChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=4000, allow_blank=False)
    history = ChatHistoryTurnSerializer(many=True, required=False, default=list)
