const chatBody = document.querySelector(".chat-body");
const messageInput = document.querySelector(".message-input");
const sendMessage = document.querySelector("#send-message");
const fileInput = document.querySelector("#file-input");
const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
const fileCancelButton = fileUploadWrapper.querySelector("#file-cancel");
const chatbotToggler = document.querySelector("#chatbot-toggler");
const closeChatbot = document.querySelector("#close-chatbot");

// API setup
const API_KEY = "AIzaSyAuyFnFjjilTKwt1o3Oc0QPxOnGRfsiRGw";
const API_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

let currentUtterance = null; // Lưu giọng đọc hiện tại

// Initialize user message and file data
const userData = {
  message: null,
  file: {
    data: null,
    mime_type: null,
  },
};

// Store chat history
const chatHistory = [];
const initialInputHeight = messageInput.scrollHeight;

const getAvailableVoices = () => {
  return new Promise((resolve) => {
    let voices = speechSynthesis.getVoices();
    if (voices.length) {
      resolve(voices);
      return;
    }

    // Nếu danh sách giọng chưa có, chờ sự kiện onvoiceschanged
    speechSynthesis.onvoiceschanged = () => {
      voices = speechSynthesis.getVoices();
      resolve(voices);
    };
  });
};


// Lưu lịch sử chat vào localStorage
const MAX_CHAT_HISTORY = 50;
const saveChatHistory = () => {
  if (chatHistory.length > MAX_CHAT_HISTORY) {
    chatHistory.splice(0, chatHistory.length - MAX_CHAT_HISTORY);
  }
  localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
};

const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;

  // Nếu là tin nhắn của chatbot, thêm các nút Copy & Speak
  if (div.classList.contains("bot-message")) {
    const messageTextDiv = div.querySelector(".message-text");

    if (messageTextDiv) {
      // Tạo container chứa các nút (bên ngoài message-text)
      const actionsContainer = document.createElement("div");
      actionsContainer.classList.add("message-actions");

      // Nút Copy 📋
      const copyButton = document.createElement("button");
      copyButton.innerHTML = `<span class="material-symbols-outlined">content_copy</span>`;
      copyButton.classList.add("copy-message");
      copyButton.addEventListener("click", () => {
        handleCopyMessage(messageTextDiv);
        copyButton.classList.add("shake");
        copyButton.innerHTML = `<span class="material-symbols-outlined" style="color: green;">check</span>`;
        setTimeout(() => {
          copyButton.classList.remove("shake");
          copyButton.innerHTML = `<span class="material-symbols-outlined">content_copy</span>`;
        }, 1500);
      });
      actionsContainer.appendChild(copyButton);

      // Nút Speak 🔊
      const speakButton = document.createElement("button");
      speakButton.innerHTML = `<span class="material-symbols-outlined">volume_up</span>`;
      speakButton.classList.add("speak-message");
      speakButton.addEventListener("click", () => handleSpeakMessage(messageTextDiv, speakButton));
      actionsContainer.appendChild(speakButton);

      // Thêm container bên ngoài message-text
      div.appendChild(actionsContainer);
    }
  }

  return div;
};

const loadChatHistory = () => {
  const savedHistory = localStorage.getItem("chatHistory");
  if (savedHistory) {
    const parsedHistory = JSON.parse(savedHistory);
    parsedHistory.forEach((msg) => {
      let messageContent;

      if (msg.role === "user") {
        messageContent = `<div class="message-text">${msg.parts[0].text}</div>`;
      } else {
        const botAvatarUrl = "/static/assistant/images/zundamon.webp";  // Đường dẫn tuyệt đối

        messageContent = `
          <img class="bot-avatar" src="${botAvatarUrl}" alt="Chatbot Logo" width="50" height="50">
          <div class="message-text">${msg.parts[0].text}</div>
        `;
      }

      const messageDiv = createMessageElement(
        messageContent,
        msg.role === "user" ? "user-message" : "bot-message"
      );

      // Kiểm tra nếu message-actions chưa tồn tại, thì mới thêm
      if (msg.role !== "user" && !messageDiv.querySelector(".message-actions")) {
        const actionsContainer = document.createElement("div");
        actionsContainer.classList.add("message-actions");

        const copyButton = document.createElement("button");
        copyButton.innerHTML = `<span class="material-symbols-outlined">content_copy</span>`;
        copyButton.classList.add("copy-message");
        copyButton.addEventListener("click", () => {
          handleCopyMessage(messageDiv.querySelector(".message-text"));
          copyButton.classList.add("shake");
          copyButton.innerHTML = `<span class="material-symbols-outlined" style="color: green;">check</span>`;
          setTimeout(() => {
            copyButton.classList.remove("shake");
            copyButton.innerHTML = `<span class="material-symbols-outlined">content_copy</span>`;
          }, 1500);
        });
        actionsContainer.appendChild(copyButton);

        const speakButton = document.createElement("button");
        speakButton.innerHTML = `<span class="material-symbols-outlined">volume_up</span>`;
        speakButton.classList.add("speak-message");
        speakButton.addEventListener("click", () => handleSpeakMessage(messageDiv.querySelector(".message-text"), speakButton));
        actionsContainer.appendChild(speakButton);

        messageDiv.appendChild(actionsContainer);
      }

      chatBody.appendChild(messageDiv);
    });

    chatHistory.push(...parsedHistory);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
  }
};


// Gọi hàm load khi trang vừa load
window.addEventListener("load", loadChatHistory);



const handleCopyMessage = (messageTextDiv) => {
  // 🟢 Tạo bản sao nội dung tin nhắn để lọc bỏ các nút không mong muốn
  const messageClone = messageTextDiv.cloneNode(true);
  messageClone.querySelector(".copy-message")?.remove();
  messageClone.querySelector(".speak-message")?.remove();

  // 🟢 Lấy nội dung sạch (không có nút Copy & Speak)
  const textToCopy = messageClone.innerText.trim();

  // 🟢 Sao chép vào clipboard
  navigator.clipboard.writeText(textToCopy).then(() => {
    // 🟢 Đổi icon thành dấu check ✔️ màu xanh
    const copyButton = messageTextDiv.querySelector(".copy-message");
    if (copyButton) {
      copyButton.innerHTML = `<span class="material-symbols-outlined" style="color: green;">check</span>`;
      copyButton.classList.add("shake");

      setTimeout(() => {
        copyButton.innerHTML = `<span class="material-symbols-outlined">content_copy</span>`;
        copyButton.classList.remove("shake");
      }, 1500);
    }
  }).catch(err => {
    console.error("Lỗi khi sao chép:", err);
  });
};


// Xử lý tin nhắn người dùng
const handleOutgoingMessage = (e) => {
  e.preventDefault();
  userData.message = messageInput.value.trim();
  messageInput.value = "";
  messageInput.dispatchEvent(new Event("input"));
  fileUploadWrapper.classList.remove("file-uploaded");

  if (!userData.message) return;

  // Hiển thị tin nhắn người dùng
  const messageContent = `<div class="message-text"></div>`;
  const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
  outgoingMessageDiv.querySelector(".message-text").innerText = userData.message;
  chatBody.appendChild(outgoingMessageDiv);
  chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

  // Lưu tin nhắn vào lịch sử chat
  chatHistory.push({ role: "user", parts: [{ text: userData.message }] });
  saveChatHistory();

  // Hiển thị hiệu ứng "thinking bubble" của bot
  const botAvatarUrl = "/static/assistant/images/zundamon.webp"; // Đường dẫn tĩnh tuyệt đối
  setTimeout(() => {
    const botMessageContent = `
      <img class="bot-avatar" src="${botAvatarUrl}" alt="Chatbot Logo" width="50" height="50">
      <div class="message-text">
        <div class="thinking-indicator">
          <div class="dot"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>
        <div class="message-actions">
          <button class="copy-message"><span class="material-symbols-outlined">content_copy</span></button>
          <button class="speak-message"><span class="material-symbols-outlined">volume_up</span></button>
        </div>
      </div>`;

    const incomingMessageDiv = createMessageElement(botMessageContent, "bot-message", "thinking");
    chatBody.appendChild(incomingMessageDiv);
    chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });

    // Ẩn nút Speak & Copy chỉ trong tin nhắn này
    let actionsContainer = incomingMessageDiv.querySelector(".message-actions");
    if (actionsContainer) {
      actionsContainer.style.display = "none";
    }

    // Gọi API để lấy phản hồi chatbot
    generateBotResponse(incomingMessageDiv);
  }, 600);
};

// Xử lý phản hồi từ chatbot
const generateBotResponse = async (incomingMessageDiv) => {
  const messageElement = incomingMessageDiv.querySelector(".message-text");

  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: chatHistory }),
  };

  try {
    const response = await fetch(API_URL, requestOptions);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message);

    const apiResponseText = data.candidates[0].content.parts[0].text.trim();

    setTimeout(() => {
      messageElement.innerHTML = `<span>${apiResponseText}</span>`;

      const actionsContainer = document.createElement("div");
      actionsContainer.classList.add("message-actions");

      const copyButton = document.createElement("button");
      copyButton.innerHTML = `<span class="material-symbols-outlined">content_copy</span>`;
      copyButton.classList.add("copy-message");
      copyButton.addEventListener("click", () => handleCopyMessage(messageElement));
      actionsContainer.appendChild(copyButton);

      const speakButton = document.createElement("button");
      speakButton.innerHTML = `<span class="material-symbols-outlined">volume_up</span>`;
      speakButton.classList.add("speak-message");
      speakButton.addEventListener("click", () => handleSpeakMessage(messageElement, speakButton));
      actionsContainer.appendChild(speakButton);

      // 🛠 Chỉ thêm nếu `message-actions` chưa tồn tại
      if (!incomingMessageDiv.querySelector(".message-actions")) {
        incomingMessageDiv.appendChild(actionsContainer);
      }

      incomingMessageDiv.classList.remove("thinking");
      chatHistory.push({ role: "model", parts: [{ text: apiResponseText }] });
      saveChatHistory();

      chatBody.scrollTo({ top: chatBody.scrollHeight, behavior: "smooth" });
    }, 1000);
  } catch (error) {
    setTimeout(() => {
      messageElement.innerHTML = `<span style="color: red;">Lỗi khi lấy phản hồi từ API.</span>`;
      incomingMessageDiv.classList.remove("thinking");
    }, 1000);
  }
};


// Adjust input field height dynamically
messageInput.addEventListener("input", () => {
  messageInput.style.height = `${initialInputHeight}px`;
  messageInput.style.height = `${messageInput.scrollHeight}px`;
  document.querySelector(".chat-form").style.borderRadius = messageInput.scrollHeight > initialInputHeight ? "15px" : "32px";
});

// Handle Enter key press for sending messages
messageInput.addEventListener("keydown", (e) => {
  const userMessage = e.target.value.trim();
  if (e.key === "Enter" && !e.shiftKey && userMessage && window.innerWidth > 768) {
    handleOutgoingMessage(e);
  }
});

// Handle file input change and preview the selected file
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    fileInput.value = "";
    fileUploadWrapper.querySelector("img").src = e.target.result;
    fileUploadWrapper.classList.add("file-uploaded");
    const base64String = e.target.result.split(",")[1];

    // Store file data in userData
    userData.file = {
      data: base64String,
      mime_type: file.type,
    };
  };

  reader.readAsDataURL(file);
});

// Cancel file upload
fileCancelButton.addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("file-uploaded");
});

// Initialize emoji picker and handle emoji selection
const picker = new EmojiMart.Picker({
  theme: "light",
  skinTonePosition: "none",
  previewPosition: "none",
  onEmojiSelect: (emoji) => {
    const { selectionStart: start, selectionEnd: end } = messageInput;
    messageInput.setRangeText(emoji.native, start, end, "end");
    messageInput.focus();
  },
  onClickOutside: (e) => {
    if (e.target.id === "emoji-picker") {
      document.body.classList.toggle("show-emoji-picker");
    } else {
      document.body.classList.remove("show-emoji-picker");
    }
  },
});


// Xóa lịch sử chat và bắt đầu cuộc trò chuyện mới
const newConversationButton = document.querySelector("#new-conversation");

newConversationButton.addEventListener("click", () => {
  // 🛑 Dừng giọng đọc ngay lập tức nếu đang nói
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }

  // 🛑 Reset icon của tất cả các nút Speak (nếu có)
  document.querySelectorAll(".speak-message").forEach((btn) => {
    btn.innerHTML = `<span class="material-symbols-outlined">volume_up</span>`;
  });

  // Xóa dữ liệu trong localStorage
  localStorage.removeItem("chatHistory");

  // Xóa toàn bộ tin nhắn trên giao diện
  chatBody.innerHTML = "";

  // Reset lại lịch sử chat
  chatHistory.length = 0;

  // Thêm lại tin nhắn chào mừng từ chatbot
  const botAvatarUrl = "/static/assistant/images/zundamon.webp"; // Đường dẫn tĩnh tuyệt đối
  const welcomeMessage = `
    <div class="message bot-message">
      <img class="bot-avatar" src="${botAvatarUrl}" alt="Chatbot Logo" width="50" height="50">
      <div class="message-text">Hey there! <br /> How can I help you today?</div>
    </div>`;

  chatBody.innerHTML = welcomeMessage;
});


const handleEditMessage = (messageDiv) => {
  const messageText = messageDiv.querySelector(".message-text").innerText;

  // Đưa nội dung tin nhắn vào ô nhập liệu để chỉnh sửa
  messageInput.value = messageText;
  messageInput.focus();

  // Khi gửi lại, xóa tin nhắn cũ khỏi giao diện và lịch sử
  sendMessage.addEventListener(
    "click",
    () => {
      // Xóa tin nhắn cũ khỏi giao diện
      chatBody.removeChild(messageDiv);

      // Xóa tin nhắn cũ khỏi lịch sử
      chatHistory.splice(
        chatHistory.findIndex((msg) => msg.parts[0].text === messageText),
        1
      );

      // Lưu lại lịch sử mới
      saveChatHistory();

      // Gửi tin nhắn đã chỉnh sửa
      handleOutgoingMessage(new Event("submit"));
    },
    { once: true } // Đảm bảo sự kiện chỉ xảy ra một lần
  );
};


let currentAudio = null; // Lưu trữ audio hiện tại để có thể dừng


const handleSpeakMessage = async (messageTextDiv, speakButton) => {
  if (!("speechSynthesis" in window)) {
    alert("Trình duyệt của bạn không hỗ trợ Text-to-Speech!");
    return;
  }

  const selectedLang = document.querySelector("#voice-lang").value;
  console.log("🔹 Ngôn ngữ được chọn:", selectedLang);

  const textToSpeak = messageTextDiv.innerText.trim();
  if (!textToSpeak) return;

  // 🛑 Nếu đang phát, dừng lại
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
    speakButton.innerHTML = `<span class="material-symbols-outlined">volume_up</span>`;
    return;
  }

  // 🔹 Nếu là tiếng Nhật hoặc tiếng Anh → Gọi API Django
  if (selectedLang === "ja-JP" || selectedLang === "en-US") {
    speakButton.innerHTML = `<span class="material-symbols-outlined">hourglass_empty</span>`;
    try {
      const response = await fetch("assistant/api/voice/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSpeak, lang: selectedLang === "ja-JP" ? "jp" : "en" })
      });

      if (!response.ok) throw new Error("Lỗi từ API Django");

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      currentAudio = new Audio(audioUrl);

      speakButton.innerHTML = `<span class="material-symbols-outlined">stop</span>`;
      currentAudio.play();

      currentAudio.onended = () => {
        speakButton.innerHTML = `<span class="material-symbols-outlined">volume_up</span>`;
        currentAudio = null;
      };
    } catch (error) {
      console.error("❌ Lỗi khi gọi API Django:", error);
      alert("Không thể tạo giọng nói!");
      speakButton.innerHTML = `<span class="material-symbols-outlined">volume_up</span>`;
    }
    return;
  }

  // 🔹 Nếu không phải tiếng Nhật hoặc Anh → Dùng giọng đọc mặc định của trình duyệt
  const voices = await getAvailableVoices();
  const selectedVoice = voices.find((voice) => voice.lang === selectedLang) || voices[0];
  if (!selectedVoice) {
    alert("Không tìm thấy giọng đọc phù hợp!");
    return;
  }

  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    speakButton.innerHTML = `<span class="material-symbols-outlined">volume_up</span>`;
    return;
  }

  const utterance = new SpeechSynthesisUtterance(textToSpeak);
  utterance.voice = selectedVoice;
  utterance.lang = selectedVoice.lang;
  utterance.rate = 1;

  speakButton.innerHTML = `<span class="material-symbols-outlined">stop</span>`;

  utterance.onend = () => {
    speakButton.innerHTML = `<span class="material-symbols-outlined">volume_up</span>`;
  };

  speechSynthesis.speak(utterance);
};

// 🛑 Dừng tất cả âm thanh khi bắt đầu cuộc trò chuyện mới
document.querySelector("#new-conversation").addEventListener("click", () => {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
});


const languageSelector = document.querySelector("#voice-lang");

languageSelector.addEventListener("change", (event) => {
  const selectedLanguage = event.target.value;
  console.log("Ngôn ngữ được chọn:", selectedLanguage);
  // Thêm logic thay đổi giọng đọc hoặc cập nhật chatbot theo ngôn ngữ

  // Lưu ngôn ngữ vào localStorage để giữ lựa chọn sau khi tải lại trang
  localStorage.setItem("selectedLanguage", selectedLanguage);
});

// Đặt ngôn ngữ đã lưu khi tải lại trang
window.addEventListener("load", () => {
  const savedLanguage = localStorage.getItem("selectedLanguage");
  if (savedLanguage) {
    languageSelector.value = savedLanguage;
  }
});

window.onload = async () => {
  await getAvailableVoices(); // Đảm bảo giọng đọc đã tải xong
};


document.querySelector(".chat-form").appendChild(picker);

sendMessage.addEventListener("click", (e) => handleOutgoingMessage(e));
document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());
closeChatbot.addEventListener("click", () => document.body.classList.remove("show-chatbot"));
chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));
document.addEventListener("click", (e) => {
  const speakButton = e.target.closest(".speak-message");
  if (speakButton) {
    console.log("🔹 Nút phát âm được click!");
    const messageTextDiv = speakButton.closest(".message").querySelector(".message-text");
    handleSpeakMessage(messageTextDiv, speakButton);
  }
});