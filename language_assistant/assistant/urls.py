from django.urls import path
from .views import voice_api, home

app_name = "assistant"

urlpatterns = [
    path('chatbot/', home, name='chatbot_view'),
    path("api/voice/", voice_api, name="voice_api"),
]