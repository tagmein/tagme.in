class ChatInterface {
    constructor() {
        this.chatWindow = null;
        this.chatHistory = JSON.parse(localStorage.getItem("chatHistory")) || [];
        this.chatUrl = localStorage.getItem("chatUrl") || "/chat";
        this.init();
    }
    init() {
        this.addChatButtonToHeader();
    }
    addChatButtonToHeader() {
        const header = document.querySelector(".app-header"); 
        if (!header) return;

        const chatButton = document.createElement("button");
        chatButton.innerText = "🗨️ Chat";
        chatButton.classList.add("chat-button");
        chatButton.onclick = () => this.openChat();
        header.appendChild(chatButton); // Add button to header
    }
    openChat() {
        if (!this.chatWindow) {
            this.chatWindow = document.createElement("div");
            this.chatWindow.classList.add("chat-window");
            this.chatWindow.innerHTML = `
                <div class="chat-header">
                    <span>AI Chat</span>
                    <button onclick="chatInterface.closeChat()">X</button>
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

        fetch(`${this.chatUrl}?message=${encodeURIComponent(message)}`)
            .then(res => res.json())
            .then(data => {
                this.suggestContent(data.response);
                this.chatHistory.push({ user: "AI", text: data.response });
                localStorage.setItem("chatHistory", JSON.stringify(this.chatHistory));
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
        this.chatUrl = "/chat";
        this.updateChatUI();
    }
    suggestContent(responseText) {
        const facts = this.extractFacts(responseText);
        if (facts.length) {
            facts.forEach(fact => {
                this.chatHistory.push({ user: "AI (suggested)", text: `Suggested fact: ${fact}` });
            });
            localStorage.setItem("chatHistory", JSON.stringify(this.chatHistory));
            this.updateChatUI();
        }
    }
    extractFacts(responseText) {
        const factRegex = /[A-Z][a-z]+/g;
        return responseText.match(factRegex) || [];
    }
}
const chatInterface = new ChatInterface();