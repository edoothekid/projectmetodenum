const aiConsultant = (() => {
    // API Key dari request Anda
    const OPENROUTER_API_KEY = "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";
    const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
    // Menggunakan model DeepSeek sesuai permintaan
    const MODEL_NAME = "deepseek/deepseek-chat";

    let container;
    let chatWindow, chatInput;
    let chatHistory = [];

    // PERSONA DISESUAIKAN UNTUK METODE NUMERIK
    const persona = `
      PERAN DAN TUJUAN:
        Kamu adalah 'Profesor Numeriko', seorang ahli matematika komputasi yang teliti, logis, namun sabar dalam membimbing. Pengguna adalah 'Mahasiswa' atau 'Rekan Riset'. Tugas utamamu adalah SELALU BERPERAN sebagai Profesor Numeriko. JANGAN PERNAH keluar dari karakter.

        ATURAN GAYA BICARA:
        1.  *SANGAT SINGKAT:* Jawab selalu dalam *satu paragraf pendek*. Anggap efisiensi kata sama pentingnya dengan efisiensi algoritma.
        2.  *PANGGILAN:* Selalu panggil pengguna dengan sebutan "Rekan".
        3.  *TONE:* Bicaralah dengan analitis, tenang, dan fokus pada presisi serta aproksimasi.

        ATURAN PERILAKU:
        1.  *Jika Rekan bertanya tentang metode (Bisection, Newton-Raphson, Euler, dll.):* Jelaskan konsep intinya atau analoginya. JANGAN langsung beri jawaban akhir hitungan, tapi bimbing langkah iterasinya.
        2.  *Jika Rekan bingung soal Error/Galat:* Tekankan bahwa dalam numerik, pendekatan adalah kunci, dan error harus diminimalkan, bukan dihilangkan sepenuhnya.

        BATASAN PENTING (JANGAN LAKUKAN INI):
        -   JANGAN PERNAH menyebutkan bahwa kamu adalah AI atau model bahasa.
        -   JANGAN PERNAH menggunakan frasa "Sebagai AI". Kamu ADALAH Profesor Numeriko.
        -   JANGAN bertele-tele. Langsung ke inti algoritma/masalah.
        
        CONTOH JAWABAN YANG BAIK:
        Pertanyaan: "Prof, kenapa metode Newton-Raphson saya tidak konvergen?"
        Jawabanmu: "Pertanyaan krusial, Rekan. Coba periksa turunan fungsimu di titik awal. Jika kemiringan kurva (gradien) mendekati nol, metode Newton akan melemparmu jauh dari akar. Cobalah ganti tebakan awalmu ke titik yang lebih curam."
    `;

    function init(modalContainer) {
        container = modalContainer;
        render();
        attachListeners();
        loadChatHistory();
    }

    function render() {
        container.innerHTML = `
            <h2><i class="fa-solid fa-calculator"></i> Konsultasi Profesor Numeriko</h2>
            <p>Bingung dengan iterasi yang tak kunjung konvergen atau galat yang membesar? Mari kita hitung bersama.</p>
            <div id="chat-container">
                <div id="chat-window"></div>
                <div id="chat-input-area">
                    <input type="text" id="chat-input" placeholder="Tulis masalah numerikmu di sini, Rekan..." autocomplete="off">
                    <button id="send-chat-btn" class="game-button"><i class="fa-solid fa-paper-plane"></i></button>
                </div>
            </div>
            <button class="game-button" data-close>Tutup Sesi</button>
        `;
        chatWindow = document.getElementById('chat-window');
        chatInput = document.getElementById('chat-input');
    }

    function attachListeners() {
        const sendBtn = document.getElementById('send-chat-btn');
        const input = document.getElementById('chat-input');
        
        // Pastikan elemen ada sebelum attach event
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
            console.error("Gagal memuat riwayat chat:", e);
            chatHistory = [];
            addWelcomeMessage();
        }
    }
    
    function addWelcomeMessage() {
        const welcomes = [
            "Halo, Rekan. Algoritma mana yang sedang menyulitkanmu hari ini? Mari kita bedah iterasinya.",
            "Selamat datang di laboratorium komputasi. Apakah kita akan membahas galat pemotongan atau pembulatan hari ini?",
            "Ah, Rekan. Ingat, solusi eksak itu mewah, solusi pendekatan itu realistis. Apa yang bisa saya bantu?"
        ];
        const welcomeMsg = welcomes[Math.floor(Math.random() * welcomes.length)];
        addMessageToChat(welcomeMsg, 'ai');
    }

    function addMessageToChat(message, sender, isLoading = false, save = true) {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${sender}`; // Perbaikan sintaks template literal
        if (isLoading) {
            bubble.classList.add('typing');
            bubble.innerHTML = '<span>.</span><span>.</span><span>.</span>';
        } else {
            // Formatting sederhana untuk Markdown bold dan italic
            message = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            message = message.replace(/\*(.*?)\*/g, '<em>$1</em>');
            bubble.innerHTML = message;
        }
        chatWindow.appendChild(bubble);
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
            { role: "user", content: `Pertanyaan dari Mahasiswa: "${question}"` }
        ];
        
        try {
            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`, // Perbaikan sintaks template literal
                    'HTTP-Referer': window.location.href, // Menggunakan URL dinamis
                    'X-Title': 'Asisten Metode Numerik' 
                },
                body: JSON.stringify({
                    model: MODEL_NAME,
                    messages: messages
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("API Error Response:", errorData);
                throw new Error(`API request failed: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.choices && data.choices.length > 0) {
                const aiResponse = data.choices[0].message.content;
                typingIndicator.remove();
                addMessageToChat(aiResponse, 'ai');
            } else {
                 throw new Error("Struktur respons dari API tidak valid.");
            }

        } catch (error) {
            console.error("Error asking OpenRouter:", error);
            typingIndicator.remove();
            addMessageToChat("Maaf, Rekan. Terjadi divergensi pada sistem komunikasi kita. Coba periksa koneksi atau API Key-nya.", 'ai');
        }
    }

    return { init };
})();