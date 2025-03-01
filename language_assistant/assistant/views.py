from django.shortcuts import render
import requests
import json
import os
import hashlib
import base64
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
import logging

# Cấu hình API Voice
VOICEVOX_HOST = "127.0.0.1"
VOICEVOX_PORT = "50021"
VOICEVOX_SPEAKER = 3

SPEECHIFY_URL = "https://api.sws.speechify.com/v1/audio/speech"
SPEECHIFY_VOICE_ID = ""
SPEECHIFY_AUTH_TOKEN = ""

SAVE_FOLDER = os.path.join("media", "audio")  # Thư mục lưu file WAV
os.makedirs(SAVE_FOLDER, exist_ok=True)

def get_audio_filename(text, lang):
    """Tạo tên file WAV từ nội dung text và ngôn ngữ"""
    text_hash = hashlib.md5(text.encode()).hexdigest()[:8]
    return os.path.join(SAVE_FOLDER, f"voice_{lang}_{text_hash}.wav")

def generate_japanese_audio(text):
    """Tạo âm thanh tiếng Nhật từ Voicevox"""
    params = {"text": text, "speaker": VOICEVOX_SPEAKER}
    res = requests.post(f"http://{VOICEVOX_HOST}:{VOICEVOX_PORT}/audio_query", params=params)
    res.raise_for_status()
    query_data = res.json()
    query_data["volumeScale"] = 2

    res = requests.post(f"http://{VOICEVOX_HOST}:{VOICEVOX_PORT}/synthesis", json=query_data, params=params)
    res.raise_for_status()
    return res.content

def generate_english_audio(text):
    """Tạo âm thanh tiếng Anh từ Speechify"""
    payload = {
        "audio_format": "wav",
        "language": "en",
        "input": text,
        "model": "simba-english",
        "voice_id": SPEECHIFY_VOICE_ID
    }
    headers = {
        "accept": "*/*",
        "content-type": "application/json",
        "Authorization": SPEECHIFY_AUTH_TOKEN
    }
    response = requests.post(SPEECHIFY_URL, json=payload, headers=headers)
    response.raise_for_status()
    audio_base64 = response.json()['audio_data']
    return base64.b64decode(audio_base64)


logger = logging.getLogger(__name__)

@csrf_exempt  # Nếu gặp lỗi CSRF khi gửi từ frontend
def voice_api(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid request"}, status=400)

    try:
        data = json.loads(request.body)
        text = data.get("text", "").strip()
        lang = data.get("lang", "jp")

        if not text:
            return JsonResponse({"error": "No text provided"}, status=400)

        filename = get_audio_filename(text, lang)

        # 🟢 Log gọn gàng hơn
        logger.info(f"🔹 Yêu cầu tạo giọng nói ({lang}): {text[:50]}...")

        if not os.path.exists(filename):
            if lang == "jp":
                wav_data = generate_japanese_audio(text)
            elif lang == "en":
                wav_data = generate_english_audio(text)
            else:
                return JsonResponse({"error": "Unsupported language"}, status=400)

            with open(filename, "wb") as f:
                f.write(wav_data)
            logger.info(f"✅ Đã lưu file: {filename}")

        with open(filename, "rb") as f:
            response = HttpResponse(f.read(), content_type="audio/wav")
            response["Content-Disposition"] = f"attachment; filename={os.path.basename(filename)}"
            return response

    except Exception as e:
        logger.error(f"❌ Lỗi xử lý request: {e}")
        return JsonResponse({"error": str(e)}, status=500)


def home(request):
    return render(request, 'assistant/chatbot.html')