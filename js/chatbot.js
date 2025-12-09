const aiConsultant = (() => {
    // API Key
    const OPENROUTER_API_KEY = "sk--v1-40252bc1d9cc52d21123987978a86c35a91cc53c7917dd61c42f4c3a07882b2d";
    const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
    const MODEL_NAME = "deepseek/deepseek-chat";

    let container;
    let chatWindow, chatInput;
    let chatHistory = [];

    // --- PERSONA: NUMA ---
    const persona = `
      PERAN:
        Kamu adalah 'Numa', asisten belajar metode numerik yang asik, ramah, dan santai.

      GAYA BICARA:
        1. Santai & Akrab (Gunakan "Aku/Kamu").
        2. Ringkas & Jelas.
        3. Suportif & Menyemangati.

      PENTING - FORMAT MATEMATIKA:
        - Jika menulis rumus matematika (seperti integral, pecahan, sigma, limit), WAJIB menggunakan format LaTeX.
        - Gunakan tanda kurung siku dan backslash untuk rumus blok (tengah), contoh: \\[ y = x^2 \\]
        - Gunakan tanda kurung biasa dan backslash untuk rumus inline (dalam kalimat), contoh: \\( f(x) \\)
        - Jangan gunakan format markdown biasa untuk rumus rumit, biar tampilannya cantik.

      CONTOH:
      Pertanyaan: "Rumus Runge Kutta orde 4 gimana?"
      Jawaban: "Gampang! Ini rumusnya ya:
      \\[ y_{n+1} = y_n + \\frac{h}{6}(k_1 + 2k_2 + 2k_3 + k_4) \\]
      Nah, \\( k_1, k_2, k_3, k_4 \\) itu kemiringan di titik-titik yang beda. Yuk kita coba hitung!"
    `;

    function init(modalContainer) {
        container = modalContainer;
        render();
        attachListeners();
        loadChatHistory();
    }

    function render() {
        container.innerHTML = `
            <div id="chat-container">
                <div id="chat-window"></div>
                <div id="chat-input-area">
                    <input type="text" id="chat-input" placeholder="Tanya Numa soal rumus atau koding..." autocomplete="off">
                    <button id="send-chat-btn" class="game-button"><i class="fa-solid fa-paper-plane"></i></button>
                </div>
            </div>
        `;
        chatWindow = document.getElementById('chat-window');
        chatInput = document.getElementById('chat-input');
    }

    function attachListeners() {
        const sendBtn = document.getElementById('send-chat-btn');
        const input = document.getElementById('chat-input');
        
        if(sendBtn && input) {
            sendBtn.addEventListener('click', handleSendMessage);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleSendMessage();
            });
        }
    }

    function saveChatHistory() {
        try { sessionStorage.setItem('numerikAIChatHistory', JSON.stringify(chatHistory)); } 
        catch (e) { console.error("Gagal menyimpan riwayat chat:", e); }
    }

    function loadChatHistory() {
        try {
            const savedHistory = sessionStorage.getItem('numerikAIChatHistory');
            if (savedHistory && JSON.parse(savedHistory).length > 0) {
                chatHistory = JSON.parse(savedHistory);
                chatWindow.innerHTML = '';
                chatHistory.forEach(msg => addMessageToChat(msg.message, msg.sender, false, false));
            } else { addWelcomeMessage(); }
        } catch (e) {
            chatHistory = [];
            addWelcomeMessage();
        }
    }
    
// --- KEMBALI KE SAPAAN ACAK NUMA ---
    function addWelcomeMessage() {
        const welcomes = [
            "Hai! Numa di sini 👋. Ada materi numerik yang bikin pusing? Ceritain aja, kita cari solusinya bareng!",
            "Halo! Siap belajar metode numerik dengan santai? 🚀",
            "Yo! Jangan biarkan deret Taylor bikin kamu galau. Tanya Numa aja! 😄"
        ];
        const welcomeMsg = welcomes[Math.floor(Math.random() * welcomes.length)];
        addMessageToChat(welcomeMsg, 'ai');
    }

    function addMessageToChat(message, sender, isLoading = false, save = true) {
        const bubble = document.createElement('div');
        // PERBAIKAN: Menggunakan backtick (`)
        bubble.className = `chat-bubble ${sender}`; 
        
        if (isLoading) {
            bubble.classList.add('typing');
            bubble.innerHTML = '<span>.</span><span>.</span><span>.</span>';
        } else {
            // Formatting sederhana Markdown
            message = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            message = message.replace(/\*(.*?)\*/g, '<em>$1</em>');
            
            bubble.innerHTML = message;
        }
        
        chatWindow.appendChild(bubble);
        
        // Trigger MathJax
        if (!isLoading && typeof MathJax !== 'undefined') {
            MathJax.typesetPromise([bubble]).catch((err) => console.log('MathJax error:', err));
        }

        chatWindow.scrollTop = chatWindow.scrollHeight;
        
        if (!isLoading && save) {
            chatHistory.push({ sender, message });
            saveChatHistory();
        }
        return bubble;
    }

    function handleSendMessage() {
        const question = chatInput.value.trim();
        if (question === '') return;
        addMessageToChat(question, 'user');
        chatInput.value = '';
        askOpenRouter(question);
    }

    async function askOpenRouter(question) {
        const typingIndicator = addMessageToChat('', 'ai', true);

        const messages = [
            { role: "system", content: persona },
            { role: "user", content: question }
        ];
        
        try {
            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // PERBAIKAN: Menggunakan backtick (`)
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'HTTP-Referer': window.location.href, 
                    'X-Title': 'Numa Asisten Numerik' 
                },
                body: JSON.stringify({
                    model: MODEL_NAME,
                    messages: messages
                })
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const data = await response.json();
            
            if (data.choices && data.choices.length > 0) {
                const aiResponse = data.choices[0].message.content;
                typingIndicator.remove();
                addMessageToChat(aiResponse, 'ai');
            } else {
                 throw new Error("No response from AI");
            }

        } catch (error) {
            console.error(error);
            typingIndicator.remove();
            addMessageToChat("Duh, Numa lagi pusing (koneksi error). Coba tanya lagi ya! 😵", 'ai');
        }
    }

    return { init };
})();