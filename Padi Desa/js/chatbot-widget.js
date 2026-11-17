/**
 * =======================================================
 * FLOATING CHATBOT WIDGET CONTROLLER (3 CHATBOT MODES)
 * Platform Padi Desa Cirebon Girang
 * 
 * 1. Chatbot Petani (Akses data terbatas - pribadi, kelompok, & konsultasi padi)
 * 2. Chatbot Admin (Akses data penuh tanpa batas - user, password, NIK, total rekap)
 * 3. Chatbot Desa (Akses data terbatas - agregat desa, kelompok tani, pengumuman)
 * =======================================================
 */

(function () {
    // Bersihkan widget lama jika sebelumnya sudah terinjeksi di DOM
    const oldWidget = document.getElementById('padiDesaChatbotWidget');
    if (oldWidget) {
        oldWidget.remove();
    }

    // Bersihkan elemen tab lama jika ada
    document.querySelectorAll('.chatbot-role-tabs, .chatbot-mode-desc, #chatbotRoleTabs, #botModeDesc').forEach(el => el.remove());

    const CACHE_BUST = '20261112_v15';
    // Tentukan path ke API dan CSS relatif terhadap lokasi saat ini
    const isPagesDir = window.location.pathname.includes('/pages/');
    const apiPath = isPagesDir ? '../api/chat.php' : 'api/chat.php';
    const cssPath = (isPagesDir ? '../css/chatbot-widget.css' : 'css/chatbot-widget.css') + '?v=' + CACHE_BUST;
    const brainScriptPath = (isPagesDir ? '../js/pak-tani-brain.js' : 'js/pak-tani-brain.js') + '?v=' + CACHE_BUST;

    // Inject pak-tani-brain.js jika belum ada
    if (!window.PakTaniBrain && !document.querySelector(`script[src*="pak-tani-brain.js"]`)) {
        const brainScript = document.createElement('script');
        brainScript.src = brainScriptPath;
        document.head.appendChild(brainScript);
    }

    // Inject CSS jika belum ada
    if (!document.querySelector(`link[href*="chatbot-widget.css"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssPath;
        document.head.appendChild(link);
    }

    // Ambil session pengguna saat ini secara akurat
    function getActiveUser() {
        let u = null;
        try {
            if (window.auth && typeof auth.getCurrentUser === 'function') {
                u = auth.getCurrentUser();
            }
        } catch (e) {}
        if (!u) {
            try {
                const sess = JSON.parse(localStorage.getItem('padi_desa_session') || '{}');
                u = sess.user || null;
            } catch (e) {}
        }
        return u;
    }

    let currentUser = getActiveUser();

    /**
     * Ambil token yang tersimpan dari proses login (dibuat auth.php)
     * Otomatis bersihkan token lama / basi yang beda akun agar tidak tertukar!
     */
    function getStoredToken() {
        const tok = localStorage.getItem('padi_desa_token') || '';
        if (tok && currentUser) {
            try {
                const dec = JSON.parse(atob(tok));
                // Bersihkan jika token sudah kadaluarsa
                if (dec.exp && dec.exp < (Date.now() / 1000)) {
                    localStorage.removeItem('padi_desa_token');
                    return '';
                }
                // Bersihkan jika token milik user lain yang pernah login sebelumnya
                if (dec.user_id && currentUser.id && String(dec.user_id) !== String(currentUser.id)) {
                    localStorage.removeItem('padi_desa_token');
                    return '';
                }
                if (dec.username && currentUser.username && dec.username.toLowerCase() !== currentUser.username.toLowerCase()) {
                    localStorage.removeItem('padi_desa_token');
                    return '';
                }
            } catch (e) {
                localStorage.removeItem('padi_desa_token');
                return '';
            }
        }
        return tok;
    }

    /**
     * CATATAN KEAMANAN:
     * currentBotMode digunakan HANYA untuk tampilan UI (warna header, saran chip).
     * Role SESUNGGUHNYA ditentukan server dari token/user ID di MySQL.
     * Pengguna tidak dapat meningkatkan hak akses hanya dengan mengubah UI mode.
     */
    let currentBotMode = 'petani';
    if (currentUser && currentUser.role === 'admin') {
        currentBotMode = 'admin';
    } else if (currentUser && currentUser.role === 'perangkat') {
        currentBotMode = 'desa';
    }

    /** Role pengguna yang login (dari session, untuk pembatasan UI tab) */
    const userRole = (currentUser && currentUser.role) ? currentUser.role.toLowerCase() : 'petani';

    // Buat Container Widget
    const widgetContainer = document.createElement('div');
    widgetContainer.id = 'padiDesaChatbotWidget';

    widgetContainer.innerHTML = `
        <!-- Floating Action Button -->
        <button class="chatbot-float-btn" id="chatbotFloatBtn" title="Tanya AI Asisten">
            <span class="pulse-dot"></span>
            <i class="fas fa-robot"></i>
        </button>

        <!-- Chatbot Popup Window -->
        <div class="chatbot-window hidden" id="chatbotWindow">
            <!-- Header -->
            <div class="chatbot-header" id="chatbotHeader">
                <div class="chatbot-header-info">
                    <div class="chatbot-avatar" id="botHeaderAvatar">
                        <i class="fas fa-seedling"></i>
                    </div>
                    <div class="chatbot-title">
                        <h4 id="botHeaderTitle">Asisten Padi Desa</h4>
                        <p><span class="online-indicator"></span> <span id="botHeaderSubtitle">Asisten Pertanian Online</span></p>
                    </div>
                </div>
                <div class="chatbot-header-actions">
                    <button id="chatbotCloseBtn" title="Tutup Chat"><i class="fas fa-times"></i></button>
                </div>
            </div>

            <!-- Suggestion Quick Chips (Langsung di bawah header) -->
            <div class="chatbot-suggestions" id="chatbotSuggestions">
                <!-- Diisi otomatis berdasarkan role user -->
            </div>

            <!-- Chat Message List -->
            <div class="chatbot-messages" id="chatbotMessages">
                <div class="chat-bubble-row bot" id="botWelcomeRow">
                    <div class="chat-bubble-avatar" id="welcomeAvatar"><i class="fas fa-seedling"></i></div>
                    <div class="chat-bubble-content" id="welcomeText">
                        Halo! Saya **Asisten Padi Desa**, siap membantu Anda.
                    </div>
                </div>
                <!-- Typing indicator -->
                <div class="chat-typing" id="chatbotTyping">
                    <span></span><span></span><span></span>
                </div>
            </div>

            <!-- Footer Input -->
            <div class="chatbot-footer">
                <input type="text" id="chatbotInput" placeholder="Ketik pertanyaan seputar pertanian / data..." autocomplete="off" />
                <button id="chatbotSendBtn" title="Kirim"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
    `;

    document.body.appendChild(widgetContainer);

    // DOM Elements
    const floatBtn = document.getElementById('chatbotFloatBtn');
    const chatWindow = document.getElementById('chatbotWindow');
    const closeBtn = document.getElementById('chatbotCloseBtn');
    const sendBtn = document.getElementById('chatbotSendBtn');
    const inputEl = document.getElementById('chatbotInput');
    const messagesEl = document.getElementById('chatbotMessages');
    const typingEl = document.getElementById('chatbotTyping');
    const headerEl = document.getElementById('chatbotHeader');
    const headerTitleEl = document.getElementById('botHeaderTitle');
    const headerSubtitleEl = document.getElementById('botHeaderSubtitle');
    const headerAvatarEl = document.getElementById('botHeaderAvatar');
    const suggestionsEl = document.getElementById('chatbotSuggestions');
    const welcomeRow = document.getElementById('botWelcomeRow');
    const welcomeText = document.getElementById('welcomeText');
    const welcomeAvatar = document.getElementById('welcomeAvatar');

    // Update UI berdasarkan profil bot otomatis sesuai role
    function applyBotMode(mode) {
        currentBotMode = mode;

        const profileMap = {
            petani: {
                name: 'Asisten Padi Desa',
                roleLabel: 'Asisten Petani',
                avatarIcon: 'fa-seedling',
                headerColor: 'linear-gradient(135deg, #1e3a2f 0%, #2d6a4f 100%)',
                welcome: "Halo! Saya **Asisten Padi Desa**. Saya siap membantu memantau data lahan sawah Anda, riwayat panen, serta panduan praktis budidaya padi. Ada yang bisa saya bantu hari ini?",
                suggestions: [
                    { label: '🌾 Lahan Saya', query: 'Bagaimana status lahan pertanian saya?' },
                    { label: '📊 Panen Saya', query: 'Tampilkan catatan hasil panen saya' },
                    { label: '🧪 Takaran Pupuk', query: 'Bagaimana takaran pemupukan padi yang ideal?' },
                    { label: '🐛 Hama Wereng', query: 'Cara mengendalikan hama wereng pada padi' }
                ]
            },
            admin: {
                name: 'Asisten Padi Desa',
                roleLabel: 'Administrator Sistem',
                avatarIcon: 'fa-shield-halved',
                headerColor: 'linear-gradient(135deg, #1e3a2f 0%, #0f241c 100%)',
                welcome: "Halo Administrator! Saya **Asisten Padi Desa**. Saya terhubung ke database sistem untuk membantu Anda memantau seluruh data pengguna, rekapitulasi petani, lahan, dan hasil panen.",
                suggestions: [
                    { label: '👥 Data Pengguna', query: 'Tampilkan semua data pengguna sistem' },
                    { label: '🌾 Data Petani', query: 'Tampilkan data seluruh petani lengkap' },
                    { label: '🗺️ Rekap Lahan', query: 'Tampilkan rekap seluruh lahan pertanian desa' },
                    { label: '📊 Rekap Panen', query: 'Berapa total seluruh hasil panen padi?' }
                ]
            },
            desa: {
                name: 'Asisten Padi Desa',
                roleLabel: 'Pamong Desa',
                avatarIcon: 'fa-landmark',
                headerColor: 'linear-gradient(135deg, #1e3a2f 0%, #1d4ed8 100%)',
                welcome: "Selamat datang! Saya **Asisten Padi Desa**. Saya siap menyajikan data sebaran kelompok tani, rekapitulasi panen desa, dan pengumuman pertanian terkini.",
                suggestions: [
                    { label: '📋 Kelompok Tani', query: 'Daftar semua kelompok tani di desa' },
                    { label: '🌾 Rekap Petani', query: 'Berapa total petani desa dan luas lahan?' },
                    { label: '📊 Total Panen Desa', query: 'Berapa total hasil panen padi seluruh desa?' },
                    { label: '📢 Pengumuman Desa', query: 'Tampilkan pengumuman desa terbaru' }
                ]
            }
        };

        const profile = profileMap[mode] || profileMap.petani;

        if (window.PakTaniBrain) {
            window.PakTaniBrain.botProfiles = profileMap;
        }

        // Hapus elemen tab atau keterangan residual jika ada
        document.querySelectorAll('.chatbot-role-tabs, .chatbot-mode-desc, #chatbotRoleTabs, #botModeDesc').forEach(el => el.remove());

        // Update Header
        if (headerTitleEl) headerTitleEl.textContent = profile.name;
        if (headerSubtitleEl) headerSubtitleEl.innerHTML = `<span class="online-indicator"></span> ${profile.roleLabel}`;
        if (headerEl) headerEl.style.background = profile.headerColor;
        if (headerAvatarEl) headerAvatarEl.innerHTML = `<i class="fas ${profile.avatarIcon}"></i>`;

        // Update Suggestions Chips
        if (suggestionsEl) {
            suggestionsEl.innerHTML = '';
            profile.suggestions.forEach(s => {
                const chip = document.createElement('button');
                chip.className = 'suggestion-chip';
                chip.textContent = s.label;
                chip.addEventListener('click', () => sendUserMessage(s.query));
                suggestionsEl.appendChild(chip);
            });
        }

        // Update Pesan Selamat Datang Awal
        if (welcomeAvatar) welcomeAvatar.innerHTML = `<i class="fas ${profile.avatarIcon}"></i>`;
        if (welcomeText) welcomeText.innerHTML = formatMarkdown(profile.welcome);
    }

    // Toggle Popup
    function toggleChat() {
        const isHidden = chatWindow.classList.contains('hidden');
        if (isHidden) {
            // Refresh profil bot sesuai user aktif saat jendela dibuka
            try {
                let freshUser = null;
                if (window.auth && typeof auth.getCurrentUser === 'function') freshUser = auth.getCurrentUser();
                if (!freshUser) {
                    const sess = JSON.parse(localStorage.getItem('padi_desa_session') || '{}');
                    freshUser = sess.user || null;
                }
                if (freshUser && freshUser.role) {
                    const mode = freshUser.role === 'admin' ? 'admin' : (freshUser.role === 'perangkat' ? 'desa' : 'petani');
                    applyBotMode(mode);
                }
            } catch (e) {}

            chatWindow.classList.remove('hidden');
            floatBtn.style.transform = 'scale(0.9)';
            inputEl.focus();
        } else {
            chatWindow.classList.add('hidden');
            floatBtn.style.transform = '';
        }
    }

    floatBtn.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', () => {
        chatWindow.classList.add('hidden');
        floatBtn.style.transform = '';
    });

    // Format Markdown ke HTML rapi
    function formatMarkdown(text) {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/^### (.*$)/gim, '<div style="font-weight:700; margin:6px 0 2px 0;">$1</div>')
            .replace(/^## (.*$)/gim, '<div style="font-weight:700; font-size:14px; margin:6px 0 2px 0;">$1</div>')
            .replace(/^# (.*$)/gim, '<div style="font-weight:700; font-size:15px; margin:6px 0 2px 0;">$1</div>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code style="background:#e8f0e6; padding:2px 5px; border-radius:4px; font-size:12px; font-weight:600;">$1</code>')
            .replace(/^\s*[-•]\s+(.*$)/gim, '• $1')
            .replace(/\n/g, '<br>');
    }

    // Helper kirim pesan
    function appendMessage(text, sender, isError = false) {
        const row = document.createElement('div');
        row.className = `chat-bubble-row ${sender}${isError ? ' error' : ''}`;

        const brain = window.PakTaniBrain;
        const profile = (brain && brain.botProfiles && brain.botProfiles[currentBotMode]) ? brain.botProfiles[currentBotMode] : null;
        const botIcon = profile ? profile.avatarIcon : 'fa-robot';

        const avatar = sender === 'bot'
            ? `<i class="fas ${botIcon}"></i>`
            : '<i class="fas fa-user"></i>';

        row.innerHTML = `
            <div class="chat-bubble-avatar">${avatar}</div>
            <div class="chat-bubble-content"></div>
        `;

        const bubbleEl = row.querySelector('.chat-bubble-content');
        if (sender === 'bot') {
            bubbleEl.innerHTML = formatMarkdown(text);
        } else {
            bubbleEl.textContent = text;
        }

        messagesEl.insertBefore(row, typingEl);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    async function sendUserMessage(overrideText = null) {
        const text = (overrideText || inputEl.value).trim();
        if (!text) return;

        appendMessage(text, 'user');
        inputEl.value = '';
        sendBtn.disabled = true;

        typingEl.classList.add('active');
        messagesEl.scrollTop = messagesEl.scrollHeight;

        try {
            // Ambil session user aktif secara dinamis (refresh tiap kirim pesan)
            let userObj = null;
            try {
                if (window.auth && typeof auth.getCurrentUser === 'function') {
                    userObj = auth.getCurrentUser();
                }
            } catch (e) {}
            if (!userObj) {
                try {
                    const sess = JSON.parse(localStorage.getItem('padi_desa_session') || '{}');
                    userObj = sess.user || null;
                } catch (e) {}
            }

            // Token dari localStorage (dibuat oleh auth.php saat login)
            const token = getStoredToken();
            const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';

            // Kirim ke Backend PHP+MySQL+Gemini
            const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
            if (isHttp) {
                try {
                    const res = await fetch(apiPath, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Chat-Token': token
                        },
                        body: JSON.stringify({
                            message: text,
                            current_page: currentPage,
                            user: userObj ? {
                                id:       userObj.id,
                                username: userObj.username,
                                name:     userObj.name,
                                role:     userObj.role
                            } : null,
                            token: token
                        })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        typingEl.classList.remove('active');
                        if (data.reply) {
                            appendMessage(data.reply, 'bot');
                            sendBtn.disabled = false;
                            inputEl.focus();
                            return;
                        }
                    }
                } catch (fetchErr) {
                    console.warn('Backend API tidak terjangkau, mencoba fallback lokal:', fetchErr);
                }
            }

            // Fallback lokal (hanya jika server tidak tersedia)
            // CATATAN: fallback ini memberikan jawaban terbatas tanpa data MySQL
            setTimeout(() => {
                typingEl.classList.remove('active');
                appendMessage(
                    '⚠️ Koneksi ke server tidak tersedia. ' +
                    'Pastikan Laragon/server berjalan dan coba lagi. ' +
                    'Data database tidak dapat dibaca dalam mode offline.',
                    'bot', true
                );
                sendBtn.disabled = false;
                inputEl.focus();
            }, 300);

        } catch (err) {
            console.warn('Chatbot handler error:', err);
            typingEl.classList.remove('active');
            appendMessage(`⚠️ Terjadi kendala teknis: ${err.message}`, 'bot', true);
            sendBtn.disabled = false;
            inputEl.focus();
        }
    }

    sendBtn.addEventListener('click', () => sendUserMessage());
    inputEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendUserMessage();
    });

    // Inisialisasi awal UI
    applyBotMode(currentBotMode);

})();
