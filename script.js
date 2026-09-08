document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       CONFIG
    ===================================================== */

    const MODEL = "openai/gpt-6-astra";


    /* =====================================================
       ELEMENTS
    ===================================================== */

    const sidebar =
        document.getElementById("sidebar");

    const menuBtn =
        document.getElementById("menuBtn");

    const closeSidebar =
        document.getElementById("closeSidebar");

    const messageInput =
        document.getElementById("messageInput");

    const sendBtn =
        document.getElementById("sendBtn");

    const micBtn =
        document.getElementById("micBtn");

    const attachBtn =
        document.getElementById("attachBtn");

    const attachmentMenu =
        document.getElementById("attachmentMenu");

    const fileInput =
        document.getElementById("fileInput");

    const chatArea =
        document.getElementById("chatArea");

    const welcome =
        document.getElementById("welcome");

    const historyList =
        document.getElementById("historyList");

    const signinBtn =
        document.getElementById("signinBtn");

    const aboutBtn =
        document.getElementById("aboutBtn");

    const toast =
        document.getElementById("toast");


    let sending = false;

    let chats = [];

    let currentChatId = null;


    /* =====================================================
       MOBILE SIDEBAR
    ===================================================== */

    menuBtn?.addEventListener("click", () => {
        sidebar?.classList.add("open");
    });


    closeSidebar?.addEventListener("click", () => {
        sidebar?.classList.remove("open");
    });


    /* =====================================================
       ATTACHMENT MENU
    ===================================================== */

    attachBtn?.addEventListener("click", (event) => {

        event.stopPropagation();

        if (!attachmentMenu) return;

        const isOpen =
            attachmentMenu.style.display === "block";

        attachmentMenu.style.display =
            isOpen ? "none" : "block";

    });


    document.addEventListener("click", (event) => {

        if (
            attachmentMenu &&
            attachBtn &&
            !attachmentMenu.contains(event.target) &&
            !attachBtn.contains(event.target)
        ) {
            attachmentMenu.style.display = "none";
        }

    });


    /* =====================================================
       ATTACHMENT ACTIONS
    ===================================================== */

    document
        .querySelectorAll(".attachment-menu button")
        .forEach(button => {

            button.addEventListener("click", () => {

                const action =
                    button.dataset.action;

                attachmentMenu.style.display =
                    "none";


                if (action === "files") {

                    fileInput?.click();

                    return;
                }


                if (action === "photos") {

                    fileInput?.setAttribute(
                        "accept",
                        "image/*"
                    );

                    fileInput?.click();

                    return;
                }


                showToast(
                    actionText(action) +
                    " will be available soon."
                );

            });

        });


    function actionText(action) {

        const names = {
            camera: "Camera",
            photos: "Photos",
            files: "Files",
            plugins: "Plugins",
            think: "Think harder"
        };

        return names[action] || "Option";

    }


    /* =====================================================
       FILE INPUT
    ===================================================== */

    fileInput?.addEventListener(
        "change",
        async () => {

            const files =
                Array.from(fileInput.files || []);

            if (!files.length) return;


            let names =
                files
                    .map(file => file.name)
                    .join(", ");


            showToast(
                files.length +
                " file(s) selected"
            );


            /*
             * Text files are added to the next prompt.
             */

            let text = "";


            for (const file of files) {

                if (
                    file.type.startsWith("text/") ||
                    /\.(txt|md|json|csv|html|css|js|py|xml)$/i
                        .test(file.name)
                ) {

                    try {

                        const content =
                            await file.text();

                        text +=
                            `\n\n--- ${file.name} ---\n` +
                            content;

                    } catch (error) {

                        console.error(
                            "File read error:",
                            error
                        );

                    }

                }

            }


            if (text && messageInput) {

                messageInput.value +=
                    text;

                messageInput.dispatchEvent(
                    new Event("input")
                );

                messageInput.focus();

            }


            fileInput.value = "";

        }
    );


    /* =====================================================
       TEXTAREA
    ===================================================== */

    messageInput?.addEventListener(
        "input",
        () => {

            messageInput.style.height =
                "auto";

            messageInput.style.height =
                Math.min(
                    messageInput.scrollHeight,
                    180
                ) + "px";

        }
    );


    messageInput?.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();

            }

        }
    );


    /* =====================================================
       SEND BUTTON
    ===================================================== */

    sendBtn?.addEventListener(
        "click",
        sendMessage
    );


    /* =====================================================
       SEND MESSAGE
    ===================================================== */

    async function sendMessage() {

        if (sending) return;

        if (!messageInput) return;

        const question =
            messageInput.value.trim();

        if (!question) return;


        sending = true;


        messageInput.value = "";

        messageInput.style.height =
            "auto";


        hideWelcome();


        /* Create chat if needed */

        if (!currentChatId) {

            createChat(
                makeTitle(question)
            );

        }


        /* Add user message */

        addMessage(
            "user",
            question
        );


        /* Save */

        saveCurrentChat();


        /* Typing */

        const typing =
            addTyping();


        try {

            /*
             * ONLY AI REQUEST.
             *
             * No:
             * puter.auth.signIn()
             * puter.auth.isSignedIn()
             * authenticateWithPuter()
             * token storage
             */

            if (
                typeof puter === "undefined" ||
                !puter.ai ||
                typeof puter.ai.chat !== "function"
            ) {

                throw new Error(
                    "Puter AI library could not be loaded."
                );

            }


            const response =
                await puter.ai.chat(
                    question,
                    {
                        model: MODEL,
                        normalize: true
                    }
                );


            removeTyping(typing);


            const answer =
                extractResponse(response);


            addMessage(
                "ai",
                answer
            );


            saveCurrentChat();


        } catch (error) {

            removeTyping(typing);


            console.error(
                "Kuchupuchu AI Error:",
                error
            );


            addMessage(
                "ai",
                "I couldn't get a response right now.\n\n" +
                readableError(error)
            );

        }


        sending = false;

    }


    /* =====================================================
       RESPONSE EXTRACTION
    ===================================================== */

    function extractResponse(response) {

        if (!response) {
            return "No response received.";
        }


        if (typeof response === "string") {
            return response;
        }


        if (
            response.message &&
            typeof response.message.content === "string"
        ) {

            return response.message.content;

        }


        if (
            response.message &&
            Array.isArray(response.message.content)
        ) {

            return response.message.content
                .map(block => {

                    if (typeof block === "string") {
                        return block;
                    }

                    return (
                        block.text ||
                        block.content ||
                        ""
                    );

                })
                .join("\n");

        }


        if (
            typeof response.content === "string"
        ) {

            return response.content;

        }


        return JSON.stringify(
            response,
            null,
            2
        );

    }


    /* =====================================================
       ERROR
    ===================================================== */

    function readableError(error) {

        if (!error) {
            return "Unknown error.";
        }


        if (typeof error === "string") {
            return error;
        }


        if (error.message) {
            return error.message;
        }


        try {

            return JSON.stringify(
                error,
                null,
                2
            );

        } catch {

            return "Unknown error.";

        }

    }


    /* =====================================================
       ADD MESSAGE
    ===================================================== */

    function addMessage(type, text) {

        const message =
            document.createElement("div");

        message.className =
            `message ${type}-message`;


        const avatar =
            type === "user"
                ? "S"
                : "K";


        message.innerHTML = `

            <div class="message-avatar">
                ${avatar}
            </div>

            <div class="message-content">
                ${formatText(text)}
            </div>

        `;


        chatArea.appendChild(message);


        scrollToBottom();

    }


    /* =====================================================
       FORMAT TEXT
    ===================================================== */

    function formatText(text) {

        let safe =
            escapeHTML(
                String(text || "")
            );


        /* Bold */

        safe =
            safe.replace(
                /\*\*(.*?)\*\*/g,
                "<strong>$1</strong>"
            );


        /* Inline code */

        safe =
            safe.replace(
                /`([^`]+)`/g,
                "<code>$1</code>"
            );


        /* New lines */

        safe =
            safe.replace(
                /\n/g,
                "<br>"
            );


        return safe;

    }


    function escapeHTML(text) {

        const div =
            document.createElement("div");

        div.textContent = text;

        return div.innerHTML;

    }


    /* =====================================================
       TYPING
    ===================================================== */

    function addTyping() {

        const message =
            document.createElement("div");

        message.className =
            "message ai-message typing-message";


        message.innerHTML = `

            <div class="message-avatar">
                K
            </div>

            <div class="message-content">

                <div class="typing">

                    <span></span>
                    <span></span>
                    <span></span>

                </div>

            </div>

        `;


        chatArea.appendChild(message);

        scrollToBottom();


        return message;

    }


    function removeTyping(element) {

        element?.remove();

    }


    /* =====================================================
       WELCOME
    ===================================================== */

    function hideWelcome() {

        if (welcome) {
            welcome.style.display = "none";
        }

    }


    function showWelcome() {

        if (welcome) {
            welcome.style.display = "block";
        }

    }


    /* =====================================================
       SCROLL
    ===================================================== */

    function scrollToBottom() {

        requestAnimationFrame(() => {

            chatArea.scrollTo({
                top: chatArea.scrollHeight,
                behavior: "smooth"
            });

        });

    }


    /* =====================================================
       SUGGESTIONS
    ===================================================== */

    document
        .querySelectorAll(".suggestion")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const title =
                        button.querySelector(
                            "strong"
                        );

                    if (!title) return;

                    messageInput.value =
                        title.textContent;

                    messageInput.focus();

                    messageInput.dispatchEvent(
                        new Event("input")
                    );

                }
            );

        });


    /* =====================================================
       NEW CHAT
    ===================================================== */

    document
        .querySelector(
            '[data-section="chat"]'
        )
        ?.addEventListener(
            "click",
            () => {

                newChat();

                if (window.innerWidth <= 800) {

                    sidebar.classList.remove(
                        "open"
                    );

                }

            }
        );


    function newChat() {

        currentChatId = null;

        chatArea
            .querySelectorAll(".message")
            .forEach(message => {
                message.remove();
            });


        messageInput.value = "";

        messageInput.style.height =
            "auto";


        showWelcome();

        messageInput.focus();

    }


    /* =====================================================
       CHAT HISTORY
    ===================================================== */

    function loadChats() {

        try {

            const saved =
                localStorage.getItem(
                    "kuchupuchu_chats"
                );


            chats =
                saved
                    ? JSON.parse(saved)
                    : [];

        } catch {

            chats = [];

        }


        renderHistory();

    }


    function saveChats() {

        localStorage.setItem(
            "kuchupuchu_chats",
            JSON.stringify(chats)
        );

    }


    function createChat(title) {

        const chat = {

            id:
                Date.now().toString(),

            title:
                title || "New conversation",

            messages: []

        };


        chats.unshift(chat);

        currentChatId =
            chat.id;


        saveChats();

        renderHistory();

    }


    function saveCurrentChat() {

        if (!currentChatId) return;


        const chat =
            chats.find(
                item =>
                    item.id === currentChatId
            );


        if (!chat) return;


        const messages =
            Array.from(
                chatArea.querySelectorAll(
                    ".message:not(.typing-message)"
                )
            );


        chat.messages =
            messages.map(message => {

                const isUser =
                    message.classList.contains(
                        "user-message"
                    );


                const content =
                    message.querySelector(
                        ".message-content"
                    );


                return {

                    role:
                        isUser
                            ? "user"
                            : "ai",

                    content:
                        content?.innerText || ""

                };

            });


        saveChats();

    }


    function renderHistory() {

        if (!historyList) return;


        historyList.innerHTML = "";


        chats
            .slice(0, 8)
            .forEach(chat => {

                const button =
                    document.createElement("button");


                button.className =
                    "chat-history";


                button.innerHTML = `
                    <span>◌</span>
                    <span>${escapeHTML(chat.title)}</span>
                `;


                button.addEventListener(
                    "click",
                    () => {

                        loadChat(chat.id);

                        if (
                            window.innerWidth <= 800
                        ) {

                            sidebar.classList.remove(
                                "open"
                            );

                        }

                    }
                );


                historyList.appendChild(
                    button
                );

            });

    }


    function loadChat(id) {

        const chat =
            chats.find(
                item => item.id === id
            );


        if (!chat) return;


        currentChatId =
            chat.id;


        chatArea
            .querySelectorAll(".message")
            .forEach(message => {
                message.remove();
            });


        if (
            chat.messages.length === 0
        ) {

            showWelcome();

            return;

        }


        hideWelcome();


        chat.messages.forEach(message => {

            addMessage(
                message.role,
                message.content
            );

        });


        scrollToBottom();

    }


    function makeTitle(text) {

        return text
            .replace(/\s+/g, " ")
            .slice(0, 35);

    }


    /* =====================================================
       NAVIGATION
    ===================================================== */

    document
        .querySelectorAll(".nav-item")
        .forEach(item => {

            item.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(".nav-item")
                        .forEach(nav => {
                            nav.classList.remove(
                                "active"
                            );
                        });


                    item.classList.add(
                        "active"
                    );


                    const section =
                        item.dataset.section;


                    if (section !== "chat") {

                        showToast(
                            item
                                .querySelector(
                                    "span:last-child"
                                )
                                ?.textContent +
                            " selected"
                        );

                    }

                }
            );

        });


    /* =====================================================
       SIGN IN BUTTON — UI ONLY
    ===================================================== */

    signinBtn?.addEventListener(
        "click",
        () => {

            showToast(
                "Sign in option selected"
            );

        }
    );


    /* =====================================================
       ABOUT
    ===================================================== */

    aboutBtn?.addEventListener(
        "click",
        () => {

            showToast(
                "Kuchupuchu AI • by Shivu © 2026"
            );

        }
    );


    /* =====================================================
       MIC — UI ONLY
    ===================================================== */

    micBtn?.addEventListener(
        "click",
        () => {

            showToast(
                "Voice input will be added later."
            );

        }
    );


    /* =====================================================
       TOAST
    ===================================================== */

    function showToast(message) {

        if (!toast) return;


        toast.textContent =
            message;


        toast.classList.add(
            "show"
        );


        clearTimeout(
            window.kuchupuchuToast
        );


        window.kuchupuchuToast =
            setTimeout(() => {

                toast.classList.remove(
                    "show"
                );

            }, 1800);

    }


    /* =====================================================
       KEYBOARD SHORTCUT
    ===================================================== */

    document.addEventListener(
        "keydown",
        event => {

            if (
                (event.ctrlKey || event.metaKey) &&
                event.key.toLowerCase() === "k"
            ) {

                event.preventDefault();

                showToast(
                    "Search is coming soon."
                );

            }

        }
    );


    /* =====================================================
       START
    ===================================================== */

    loadChats();

});