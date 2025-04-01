// public/js/chat.js - Frontend chatbot interface

class ChatInterface {
    constructor() {
        this.chatWindow = null;
        this.chatHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];
        this.chatUrl = localStorage.getItem("chatUrl") || "/chat";
        this.channel = null; // Store channel context
        this.message = null; // Store message context
        this.init();
    }

    init() {
        this.addChatButtonToHeader();
    }

    // Add a "Chat" button to the header
    addChatButtonToHeader() {
        const header = document.querySelector(".app-header"); // Target the app header
        if (!header) return;

        const chatButton = document.createElement("button");
        chatButton.innerText = "🗨️ Chat";
        chatButton.classList.add("chat-button");
        chatButton.addEventListener('click', () => this.openChat()); // Added event listener instead of inline function

        header.appendChild(chatButton); // Add button to header
    }

    // Open the chat window, optionally passing channel/message context
    openChat(channel = null, message = null) {
        this.channel = channel;
        this.message = message;

        if (!this.chatWindow) {
            this.chatWindow = document.createElement("div");
            this.chatWindow.classList.add("chat-window");
            this.chatWindow.innerHTML = `
                <div class="chat-header">
                    <span>AI Chat</span>
                    <button id="close-chat-btn">X</button>
                    <button id="delete-chat-btn">Delete Chat</button>
                </div>
                <div class="chat-messages"></div>
                <input type="text" id="chat-input" placeholder="Type a message...">
                <button id="send-chat-btn">Send</button>
            `;
            document.body.appendChild(this.chatWindow);
            this.loadChatHistory();

            // Bind event listeners
            document.getElementById("close-chat-btn").addEventListener('click', () => this.closeChat());
            document.getElementById("delete-chat-btn").addEventListener('click', () => this.deleteChat());
            document.getElementById("send-chat-btn").addEventListener('click', () => this.sendMessage());
        }
    }

    // Close the chat window
    closeChat() {
        if (this.chatWindow) {
            this.chatWindow.remove();
            this.chatWindow = null;
        }
    }

    // Send the user's message to the backend
    sendMessage() {
        const input = document.getElementById("chat-input");
        const message = input.value.trim();
        if (!message) return;

        // Store the message in history
        this.chatHistory.push({ user: "You", text: message });
        localStorage.setItem("chatHistory", JSON.stringify(this.chatHistory));
        this.updateChatUI();
        input.value = "";

        // Construct the URL with the message and channel context
        let url = `${this.chatUrl}?message=${encodeURIComponent(message)}`;
        if (this.channel) {
            url += `&channel=${encodeURIComponent(this.channel)}`;
        }

        // Send the message to the backend
        fetch(url)
            .then(res => res.json())
            .then(data => {
                this.chatHistory.push({ user: "AI", text: data.response });
                localStorage.setItem("chatHistory", JSON.stringify(this.chatHistory));
                this.updateChatUI();
            })
            .catch(error => {
                console.error("Error sending message:", error);
                alert("There was an error with the chat. Please try again later.");
            });
    }

    // Load chat history from localStorage
    loadChatHistory() {
        const chatMessages = this.chatWindow.querySelector(".chat-messages");
        chatMessages.innerHTML = "";
        this.chatHistory.forEach(msg => {
            const messageDiv = document.createElement("div");
            messageDiv.textContent = `${msg.user}: ${msg.text}`;
            chatMessages.appendChild(messageDiv);
        });
    }

    // Update the chat UI to display new messages
    updateChatUI() {
        if (this.chatWindow) {
            this.loadChatHistory();
        }
    }

    // Delete the current chat history
    deleteChat() {
        // Remove chat history from localStorage
        localStorage.removeItem("chatHistory");
        this.chatHistory = [];
        this.updateChatUI();
    }
}

const chatInterface = new ChatInterface();
