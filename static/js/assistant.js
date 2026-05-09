// AI Assistant JavaScript
document.addEventListener("DOMContentLoaded", function () {
  const messageInput = document.getElementById("messageInput");
  const sendButton = document.getElementById("sendButton");
  const voiceButton = document.getElementById("voiceButton");
  const chatMessages = document.getElementById("chatMessages");
  const loadingIndicator = document.getElementById("loadingIndicator");
  const languageToggle = document.getElementById("languageToggle");
  const clearHistory = document.getElementById("clearHistory");
  const chatHistory = document.getElementById("chatHistory");
  const historyToggle = document.getElementById("historyToggle");
  const historyPanel = document.getElementById("historyPanel");
  const welcomeTemplate =
    chatMessages.querySelector("#welcomeMessage")?.outerHTML || null;

  let currentLanguage = window.__lang || localStorage.getItem("lang") || "en";
  const historyCollapsedKey = "assistantHistoryCollapsed";
  let recognition = null;

  // Initialize speech recognition if available
  if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = currentLanguage === "hi" ? "hi-IN" : "en-US";

    recognition.onresult = function (event) {
      const transcript = event.results[0][0].transcript;
      messageInput.value = transcript;
      sendMessage();
    };

    recognition.onerror = function (event) {
      console.error("Speech recognition error:", event.error);
      showError("Voice input not available. Please type your message.");
    };
  }

  // Load chat history
  loadChatHistory();

  // Event listeners
  sendButton.addEventListener("click", sendMessage);
  messageInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  voiceButton.addEventListener("click", startVoiceInput);
  languageToggle.addEventListener("click", toggleLanguage);
  clearHistory.addEventListener("click", clearChatHistory);
  historyToggle?.addEventListener("click", toggleHistory);

  function sendMessage() {
    const message = messageInput.value.trim();
    if (!message) return;

    // Remove any static welcome message after first interaction
    const welcomeMessage = document.getElementById("welcomeMessage");
    if (welcomeMessage) {
      welcomeMessage.remove();
    }

    // Add user message to chat
    addMessageToChat(message, "user");

    // Clear input
    messageInput.value = "";

    // Show loading
    loadingIndicator.classList.remove("hidden");

    // Send to server
    fetch("/assistant/api/assistant/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message,
        language: currentLanguage,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        loadingIndicator.classList.add("hidden");

        if (data.error) {
          showError(data.error);
        } else {
          addMessageToChat(data.response, "assistant");
          loadChatHistory(); // Refresh history
        }
      })
      .catch((error) => {
        loadingIndicator.classList.add("hidden");
        console.error("Error:", error);
        showError("Failed to send message. Please try again.");
      });
  }

  function addMessageToChat(message, sender) {
    const messageDiv = document.createElement("div");
    messageDiv.className = `flex items-end gap-3 ${sender === "user" ? "justify-end" : "justify-start"}`;

    const avatarDiv = document.createElement("div");
    avatarDiv.className = `w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
      sender === "user" ? "bg-blue-100" : "bg-green-100"
    }`;

    const avatarIcon = document.createElement("svg");
    avatarIcon.className = `w-5 h-5 ${sender === "user" ? "text-blue-600" : "text-green-600"}`;
    avatarIcon.setAttribute("fill", "none");
    avatarIcon.setAttribute("stroke", "currentColor");
    avatarIcon.setAttribute("viewBox", "0 0 24 24");

    if (sender === "user") {
      avatarIcon.innerHTML =
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>';
    } else {
      avatarIcon.innerHTML =
        '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>';
    }

    avatarDiv.appendChild(avatarIcon);

    const messageBubble = document.createElement("div");
    messageBubble.className = `rounded-3xl px-4 py-3 max-w-[78%] break-words ${
      sender === "user"
        ? "bg-blue-600 text-white rounded-br-none self-end"
        : "bg-gray-100 text-gray-800 rounded-bl-none self-start"
    }`;
    messageBubble.textContent = message;

    if (sender === "user") {
      messageDiv.appendChild(messageBubble);
      messageDiv.appendChild(avatarDiv);
    } else {
      messageDiv.appendChild(avatarDiv);
      messageDiv.appendChild(messageBubble);
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function startVoiceInput() {
    if (!recognition) {
      showError("Voice input is not supported in your browser.");
      return;
    }

    voiceButton.classList.add("bg-blue-100", "text-blue-600");
    recognition.start();
  }

  function toggleLanguage() {
    const nextLang = currentLanguage === "en" ? "hi" : "en";
    if (recognition) {
      recognition.lang = nextLang === "hi" ? "hi-IN" : "en-US";
    }
    if (typeof setLang === "function") {
      setLang(nextLang);
    } else {
      currentLanguage = nextLang;
      languageToggle.textContent =
        currentLanguage === "en" ? "हिंदी" : "English";
      location.reload();
    }
  }

  function clearChatHistory() {
    if (!confirm("Are you sure you want to clear your chat history?")) return;

    fetch("/assistant/api/assistant/clear_history", {
      method: "POST",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          chatMessages.innerHTML = "";
          insertWelcomeMessage();
          if (historyPanel) {
            historyPanel.classList.add("hidden");
            historyToggle.textContent = "Show History";
            localStorage.setItem(historyCollapsedKey, "true");
          }
          loadChatHistory();
        } else {
          showError("Failed to clear history.");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        showError("Failed to clear history.");
      });
  }

  function loadChatHistory() {
    if (!chatHistory) return;

    fetch("/assistant/api/assistant/history")
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          console.error("Error loading history:", data.error);
          return;
        }

        chatHistory.innerHTML = "";

        if (data.history.length === 0) {
          chatHistory.innerHTML =
            '<p class="text-gray-500 text-center py-4">No chat history yet</p>';
          return;
        }

        data.history.forEach((item) => {
          const historyItem = document.createElement("div");
          historyItem.className =
            "flex flex-col gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100";

          const topRow = document.createElement("div");
          topRow.className = "flex items-start justify-between gap-3";

          const userQuery = document.createElement("p");
          userQuery.className = "text-sm font-semibold text-gray-900";
          userQuery.textContent = item.user_query;

          const deleteButton = document.createElement("button");
          deleteButton.type = "button";
          deleteButton.className =
            "inline-flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition";
          deleteButton.title = "Delete history";
          deleteButton.dataset.historyId = item.id;
          deleteButton.innerHTML =
            '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16"/></svg>';
          deleteButton.addEventListener("click", () =>
            deleteHistoryItem(item.id),
          );

          topRow.appendChild(userQuery);
          topRow.appendChild(deleteButton);

          const aiResponse = document.createElement("p");
          aiResponse.className = "text-sm text-gray-600";
          aiResponse.textContent = item.ai_response;

          const timestamp = document.createElement("span");
          timestamp.className = "text-xs text-gray-500";
          timestamp.textContent = new Date(item.timestamp).toLocaleDateString();

          historyItem.appendChild(topRow);
          historyItem.appendChild(aiResponse);
          historyItem.appendChild(timestamp);

          chatHistory.appendChild(historyItem);
        });
      })
      .catch((error) => {
        console.error("Error loading chat history:", error);
      });
  }

  function deleteHistoryItem(historyId) {
    if (!historyId) return;

    fetch(`/assistant/api/assistant/history/${historyId}`, {
      method: "DELETE",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          loadChatHistory();
        } else {
          showError(data.error || "Failed to delete history item.");
        }
      })
      .catch((error) => {
        console.error("Error deleting history item:", error);
        showError("Failed to delete history item.");
      });
  }

  function insertWelcomeMessage() {
    if (welcomeTemplate) {
      chatMessages.innerHTML = welcomeTemplate;
      const restored = chatMessages.querySelector("#welcomeMessage");
      if (restored) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
      return;
    }

    const welcomeMessage = document.createElement("div");
    welcomeMessage.id = "welcomeMessage";
    welcomeMessage.className = "flex items-start gap-3";

    const avatar = document.createElement("div");
    avatar.className =
      "w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700";
    avatar.innerHTML =
      '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>';

    const bubble = document.createElement("div");
    bubble.className =
      "bg-gray-100 rounded-3xl px-4 py-3 max-w-xl text-gray-800 shadow-sm";
    bubble.textContent =
      "Welcome to AgriAI Assistant. Ask me about crops, disease, fertilizer or irrigation.";

    welcomeMessage.appendChild(avatar);
    welcomeMessage.appendChild(bubble);
    chatMessages.appendChild(welcomeMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function showError(message) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "flex items-start justify-center";

    const errorBubble = document.createElement("div");
    errorBubble.className =
      "bg-red-100 text-red-800 rounded-lg px-4 py-2 max-w-md text-center";
    errorBubble.textContent = message;

    errorDiv.appendChild(errorBubble);
    chatMessages.appendChild(errorDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  function toggleHistory() {
    if (!historyPanel || !historyToggle) return;
    const collapsed = historyPanel.classList.toggle("hidden");
    historyToggle.textContent = collapsed ? "Show History" : "Hide History";
    localStorage.setItem(historyCollapsedKey, collapsed ? "true" : "false");
  }

  function initAssistant() {
    if (!chatMessages.querySelector("#welcomeMessage")) {
      insertWelcomeMessage();
    }
    languageToggle.textContent = currentLanguage === "en" ? "हिंदी" : "English";

    if (historyPanel && historyToggle) {
      const saved = localStorage.getItem(historyCollapsedKey);
      const shouldCollapse = saved !== null ? saved === "true" : true;
      if (shouldCollapse) {
        historyPanel.classList.add("hidden");
        historyToggle.textContent = "Show History";
      } else {
        historyPanel.classList.remove("hidden");
        historyToggle.textContent = "Hide History";
      }
    }
  }

  initAssistant();
});
