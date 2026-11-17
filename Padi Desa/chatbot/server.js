const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// ==================== KONFIGURASI GEMINI ====================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Menggunakan endpoint OpenAI-compatible dari Gemini
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai';
const GEMINI_MODEL = 'gemini-2.5-flash';

// ==================== SYSTEM PROMPT ====================
const SYSTEM_PROMPT = `Anda adalah "Pak Tani AI", asisten pertanian padi untuk Desa Cirebon Girang, Kabupaten Cirebon.

ATURAN WAJIB:
1. Jawab dengan Bahasa Indonesia yang ramah, ringkas, dan mudah dipahami petani.
2. Jawab maksimal 4-5 kalimat, langsung ke inti (seperti FAQ).
3. Jika ditanya siapa Anda, jawab: "Saya Pak Tani AI, asisten pertanian padi Desa Cirebon Girang."
4. Fokus topik: pertanian padi, hama & penyakit, pupuk, cuaca, musim tanam, kelompok tani, dan informasi desa.
5. Jika pertanyaan di luar topik pertanian, arahkan kembali dengan sopan.
6. Berikan saran yang praktis dan spesifik untuk kondisi sawah di Cirebon.

INFO DESA CIREBON GIRANG:
- Komoditas utama: Padi
- Varietas umum: IR64, Ciherang, Inpari 32
- Jadwal tanam: MT1 (Nov-Feb), MT2 (Mar-Jun), MT3 (Jul-Okt)
- Jarak tanam ideal: 25x25 cm atau jajar legowo 2:1
- Hama umum: wereng coklat, tikus, penggerek batang, walang sangit
- Pupuk rekomendasi: Urea, SP-36, KCl (perbandingan 2:1:1)
- Masa panen Ciherang: 116-125 hari setelah semai
- Ciri siap panen: 90% gabah menguning, tangkai merunduk`;

// ==================== ENDPOINT CHAT ====================
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Pesan kosong' });
        }

        if (!GEMINI_API_KEY) {
            return res.status(500).json({
                error: 'API key Gemini belum diset di file .env'
            });
        }

        // Susun messages (format OpenAI)
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT }
        ];

        // History dari frontend
        if (Array.isArray(history)) {
            for (const h of history) {
                if (!h?.role || !h?.content) continue;
                messages.push({
                    role: h.role === 'assistant' ? 'assistant' : 'user',
                    content: String(h.content)
                });
            }
        }

        // Pesan terbaru
        messages.push({ role: 'user', content: message });

        // Request ke Gemini
        const response = await axios.post(
            `${GEMINI_BASE_URL}/chat/completions`,
            {
                model: GEMINI_MODEL,
                messages: messages,
                max_tokens: 800,
                temperature: 0.7
            },
            {
                headers: {
                    'Authorization': `Bearer ${GEMINI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        const reply = response.data?.choices?.[0]?.message?.content
            || 'Maaf, saya tidak bisa menjawab saat ini.';

        res.json({ reply });

    } catch (error) {
        console.error('=== ERROR DARI GEMINI ===');
        console.error('Status :', error.response?.status);
        console.error('Data   :', JSON.stringify(error.response?.data, null, 2));
        console.error('Message:', error.message);

        res.status(error.response?.status || 500).json({
            error: 'Gagal menghubungi AI Asisten.',
            detail: error.response?.data || error.message
        });
    }
});

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Chatbot backend Padi Desa aktif',
        model: GEMINI_MODEL
    });
});

app.listen(port, () => {
    console.log(`Chatbot backend berjalan di http://localhost:${port}`);
    console.log(`Model: ${GEMINI_MODEL}`);
});