class ChatInterface {
    constructor(chatUrl) {
        this.chatWindow = null;
        this.chatHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];
        this.chatUrl = chatUrl || localStorage.getItem("chatUrl") || "http://127.0.0.1:8787/chat";
        this.init();
    }

    init() {
        this.addChatButtonToHeader();
    }

    addChatButtonToHeader() {
        const header = document.querySelector(".app-header");
        if (!header) {
            console.error("Error: .app-header element not found.");
            return;
        }

        console.log("Adding chat button to .app-header...");
        const chatButton = document.createElement("button");
        chatButton.innerText = "🗨️ Chat";
        chatButton.classList.add("chat-button");
        chatButton.onclick = () => this.openChat();
        header.appendChild(chatButton);
    }

    openChat() {
        if (!this.chatWindow) {
            this.chatWindow = document.createElement("div");
            this.chatWindow.classList.add("chat-window");
            this.chatWindow.innerHTML = `
                <div class="chat-header">
                    <button onclick="chatInterface.showChatList()">📋</button>
                    <span>AI Chat</span>
                    <button onclick="chatInterface.showMenu()">Menu</button>
                </div>
                <div class="chat-messages"></div>
                <input type="text" id="chat-input" placeholder="Type a message...">
                <button onclick="chatInterface.sendMessage()">Send</button>
                <div class="chat-menu" style="display:none;">
                    <button onclick="chatInterface.deleteChat()">Delete Chat</button>
                    <button onclick="chatInterface.resetToTagMeIn()">Reset to Tag Me In chatbot</button>
                </div>
            `;
            document.body.appendChild(this.chatWindow);
            this.loadChatHistory();
        } else {
            this.chatWindow.innerHTML = `
                <div class="chat-header">
                    <button onclick="chatInterface.showChatList()">📋</button>
                    <span>AI Chat</span>
                    <button onclick="chatInterface.showMenu()">Menu</button>
                </div>
                <div class="chat-messages"></div>
                <input type="text" id="chat-input" placeholder="Type a message...">
                <button onclick="chatInterface.sendMessage()">Send</button>
                <div class="chat-menu" style="display:none;">
                    <button onclick="chatInterface.deleteChat()">Delete Chat</button>
                    <button onclick="chatInterface.resetToTagMeIn()">Reset to Tag Me In chatbot</button>
                </div>
            `;
            this.loadChatHistory();
        }
    }

    sendMessage() {
        const input = document.getElementById("chat-input");
        const message = input.value.trim();
        if (!message) return;

        this.chatHistory.push({ user: "You", text: message });
        localStorage.setItem("chatHistory", JSON.stringify(this.chatHistory));
        this.updateChatUI();
        input.value = "";

        console.log("Sending message to:", this.chatUrl);

        fetch(this.chatUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                channel: "default",
                message: message,
            }),
        })
        .then((res) => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then((data) => {
            if (data.reply) {
                this.chatHistory.push({ user: "AI", text: data.reply });
                localStorage.setItem("chatHistory", JSON.stringify(this.chatHistory));
                this.updateChatUI();
            } else {
                console.error("No reply field in response:", data);
                this.chatHistory.push({ user: "System", text: "No reply received from the server." });
                this.updateChatUI();
            }
        })
        .catch((err) => {
            console.error("Error sending message:", err.message);
            this.chatHistory.push({ user: "System", text: `Failed to send message: ${err.message}` });
            this.updateChatUI();
        });
    }

    loadChatHistory() {
        const chatMessages = this.chatWindow.querySelector(".chat-messages");
        chatMessages.innerHTML = "";
        this.chatHistory.forEach((msg) => {
            const messageDiv = document.createElement("div");
            messageDiv.textContent = `${msg.user}: ${msg.text}`;
            chatMessages.appendChild(messageDiv);
        });
    }

    updateChatUI() {
        if (this.chatWindow) {
            this.loadChatHistory();
        }
    }

    showMenu() {
        const menu = this.chatWindow.querySelector(".chat-menu");
        menu.style.display = menu.style.display === "none" ? "block" : "none";
    }

    deleteChat() {
        this.chatHistory = [];
        localStorage.setItem("chatHistory", JSON.stringify(this.chatHistory));
        this.loadChatHistory();
    }

    resetToTagMeIn() {
        localStorage.removeItem("chatUrl");
        this.chatUrl = "http://127.0.0.1:8787/chat";
        this.updateChatUI();
    }
}

// Instantiate the ChatInterface with a custom URL if needed, or default
const chatInterface = new ChatInterface();