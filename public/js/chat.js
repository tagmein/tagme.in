class ChatInterface {
    constructor() {
        this.chatWindow = null;
        this.chatHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];
        this.chatUrl = localStorage.getItem("chatUrl") || "http://localhost:8787/chat";
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

            // Add event listener for Enter key
            const input = document.getElementById("chat-input");
            input.addEventListener("keydown", (event) => {
                if (event.key === "Enter") {
                    this.sendMessage();
                }
            });
        } else {
            // If chat window already exists, reset to the main chat interface
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

            // Add event listener for Enter key
            const input = document.getElementById("chat-input");
            input.addEventListener("keydown", (event) => {
                if (event.key === "Enter") {
                    this.sendMessage();
                }
            });
        }
    }

    showChatList() {
        const chatList = [
            { id: 1, name: "General Chat" },
            { id: 2, name: "Support Chat" },
            { id: 3, name: "Feedback Chat" },
        ];

        let chatListHtml = "<ul>";
        chatList.forEach(chat => {
            chatListHtml += `<li>${chat.name}</li>`;
        });
        chatListHtml += "</ul>";

        const chatWindow = document.querySelector(".chat-window");
        if (chatWindow) {
            chatWindow.innerHTML = `
                <div class="chat-header">
                    <button onclick="chatInterface.openChat()">Back</button>
                    <span>Chat List</span>
                </div>
                <div class="chat-list">${chatListHtml}</div>
            `;
        }
    }

    closeChat() {
        if (this.chatWindow) {
            this.chatWindow.remove();
            this.chatWindow = null;
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

        console.log("Sending message to:", `${this.chatUrl}?channel=default&message=${encodeURIComponent(message)}`);

        fetch(`${this.chatUrl}?channel=default&message=${encodeURIComponent(message)}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
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
            .catch(err => {
                console.error("Error sending message:", err.message);
                this.chatHistory.push({ user: "System", text: "Failed to send message. Please try again." });
                this.updateChatUI();
            });
    }

    loadChatHistory() {
        const chatMessages = this.chatWindow.querySelector(".chat-messages");
        chatMessages.innerHTML = "";
        this.chatHistory.forEach(msg => {
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
        this.chatUrl = "http://localhost:8787/chat";
        this.updateChatUI();
    }
}

const chatInterface = new ChatInterface();