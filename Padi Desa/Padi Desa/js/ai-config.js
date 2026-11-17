/**
 * =======================================================
 * AI CONFIGURATION & MULTI-KEY VAULT CONTROLLER (ADMIN)
 * Platform Padi Desa Cirebon Girang - Clean & Minimalist
 * =======================================================
 */

// 1. DAFTAR MODEL AI DENGAN KETERANGAN RINGKAS & PADAT
const AVAILABLE_MODELS = [
    // Google Gemini
    {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'Google Gemini',
        tagClass: 'tag-gemini',
        sub: 'Rekomendasi • Cepat & Hemat'
    },
    {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'Google Gemini',
        tagClass: 'tag-gemini',
        sub: 'Super Cerdas • Analisis Dalam'
    },
    {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash',
        provider: 'Google Gemini',
        tagClass: 'tag-gemini',
        sub: 'Teknologi Google Terbaru'
    },
    {
        id: 'gemini-1.0-pro',
        name: 'Gemini 1.0 Pro',
        provider: 'Google Gemini',
        tagClass: 'tag-gemini',
        sub: 'Stabil & Format Teratur'
    },

    // OpenAI ChatGPT
    {
        id: 'gpt-4o-mini',
        name: 'OpenAI GPT-4o Mini',
        provider: 'OpenAI',
        tagClass: 'tag-openai',
        sub: 'Ringkas, Cepat & Cerdas'
    },
    {
        id: 'gpt-4o',
        name: 'OpenAI GPT-4o',
        provider: 'OpenAI',
        tagClass: 'tag-openai',
        sub: 'Flagship Multimodal'
    },

    // DeepSeek & Open Source
    {
        id: 'deepseek-chat',
        name: 'DeepSeek-V3 / R1',
        provider: 'DeepSeek',
        tagClass: 'tag-deepseek',
        sub: 'Penalaran Logika Tinggi'
    },
    {
        id: 'llama-3.3-70b-versatile',
        name: 'Meta Llama 3.3 70B',
        provider: 'Groq Cloud',
        tagClass: 'tag-groq',
        sub: 'Respons Kilat (< 1 detik)'
    },
    {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'Anthropic',
        tagClass: 'tag-other',
        sub: 'Bahasa Luwes & Alami'
    },
    {
        id: 'mistral-small',
        name: 'Mistral Small',
        provider: 'Mistral AI',
        tagClass: 'tag-other',
        sub: 'Ringkas & Presisi'
    }
];

// State Lokal
let currentConfig = {
    active_model: 'gemini-1.5-flash',
    temperature: 0.3,
    auto_failover: true,
    api_keys: []
};

// 2. CEK HAK AKSES KHUSUS ADMIN
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = window.auth ? auth.getCurrentUser() : null;
    
    // Validasi apakah role adalah admin
    if (!currentUser || currentUser.role !== 'admin') {
        alert('⛔ Akses Ditolak!\nFitur Konfigurasi AI khusus disediakan untuk Administrator Sistem.');
        window.location.href = '../dashboard.html';
        return;
    }

    syncModelUI(currentConfig.active_model);
    loadConfigurationFromServer();
});

// 3. HANDLER & SINKRONISASI DROPDOWN MODEL AI
function handleModelDropdownChange(modelId) {
    currentConfig.active_model = modelId;
    syncModelUI(modelId);
    const selectedObj = AVAILABLE_MODELS.find(m => m.id === modelId);
    showToast(`🤖 Model Aktif: ${selectedObj ? selectedObj.name : modelId}`);
}

function syncModelUI(modelId) {
    const selectedObj = AVAILABLE_MODELS.find(m => m.id === modelId) || AVAILABLE_MODELS[0];
    
    // 1. Sinkronisasi nilai Dropdown
    const selectEl = document.getElementById('aiModelSelect');
    if (selectEl && selectEl.value !== modelId) {
        selectEl.value = modelId;
    }

    // 2. Sinkronisasi Status Bar di Atas
    const statEl = document.getElementById('statActiveModelName');
    if (statEl && selectedObj) {
        statEl.textContent = selectedObj.name;
    }

    // 3. Sinkronisasi Pill Badge Informasi Model
    const pillName = document.getElementById('modelPillName');
    const pillDesc = document.getElementById('modelPillDesc');
    if (pillName && selectedObj) pillName.textContent = selectedObj.name;
    if (pillDesc && selectedObj) pillDesc.textContent = `${selectedObj.provider} • ${selectedObj.sub}`;
}

// 4. LOAD CONFIG DARI BACKEND
async function loadConfigurationFromServer() {
    try {
        const res = await fetch('../api/ai_config.php');
        if (res.ok) {
            const json = await res.json();
            if (json.success && json.data) {
                currentConfig = json.data;

                // Sync Temperature
                if (currentConfig.temperature !== undefined) {
                    const tempSlider = document.getElementById('tempRange');
                    if (tempSlider) {
                        tempSlider.value = currentConfig.temperature;
                        updateTempDisplay(currentConfig.temperature);
                    }
                }

                // Sync Active Model
                if (currentConfig.active_model) {
                    syncModelUI(currentConfig.active_model);
                }

                renderKeysTable();
                updateStatsOverview();
                return;
            }
        }
    } catch (e) {
        console.warn('Gagal memuat konfigurasi dari server, menggunakan default:', e);
    }

    renderKeysTable();
    updateStatsOverview();
}

// 5. RENDER DAFTAR KUNCI RINGKAS
function renderKeysTable() {
    const tbody = document.getElementById('keysTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const keys = currentConfig.api_keys || [];

    if (keys.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:18px; color:#8aaa9a;">
                    Belum ada kunci API terdaftar. Klik <strong>+ Tambah Kunci</strong> untuk mendaftarkan.
                </td>
            </tr>
        `;
        return;
    }

    keys.forEach((k, index) => {
        const tr = document.createElement('tr');
        const isActive = !!k.is_active;

        let tagStatus = isActive 
            ? `<span class="badge-status-aktif"><i class="fas fa-check-circle"></i> Kunci Utama</span>`
            : `<span class="badge-status-cadangan"><i class="fas fa-clock"></i> Cadangan</span>`;

        let keyPreview = k.raw_key_preview || (k.key ? (k.key.substring(0, 6) + '...' + k.key.substring(k.key.length - 4)) : '-');

        tr.innerHTML = `
            <td style="color:#6a8c7b; font-weight:600;">${index + 1}</td>
            <td style="font-weight:600; color:#1e3a2f;">${k.label || 'Kunci ' + (index + 1)}</td>
            <td><span class="m-tag tag-gemini">${(k.provider || 'gemini').toUpperCase()}</span></td>
            <td><code class="key-text">${keyPreview}</code></td>
            <td>${tagStatus}</td>
            <td id="test-res-${k.id}">
                <span style="color:#8aaa9a; font-size:11px;">Belum diuji</span>
            </td>
            <td style="text-align: right;">
                ${!isActive ? `
                    <button type="button" class="btn-table-act btn-set-primary" title="Jadikan Kunci Utama" onclick="makeKeyActive('${k.id}')">
                        Utama
                    </button>
                ` : `
                    <span style="font-size:11px; font-weight:700; color:#16a34a; margin-right:4px;">✓ Utama</span>
                `}
                <button type="button" class="btn-table-act btn-test-one" title="Uji Koneksi" onclick="testSingleKeyLive('${k.id}')">
                    Uji
                </button>
                <button type="button" class="btn-table-act btn-del-key" title="Hapus Kunci" onclick="deleteKey('${k.id}')">
                    Hapus
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateStatsOverview() {
    const totalKeys = (currentConfig.api_keys || []).length;
    const activeCount = (currentConfig.api_keys || []).filter(k => k.is_active).length;

    const totalEl = document.getElementById('statTotalKeys');
    if (totalEl) {
        totalEl.textContent = `${totalKeys} Kunci (${activeCount} Aktif)`;
    }
}

// 6. TOGGLE JADIKAN KUNCI UTAMA
async function makeKeyActive(keyId) {
    if (!currentConfig.api_keys) return;

    currentConfig.api_keys.forEach(k => {
        k.is_active = (k.id === keyId);
    });

    renderKeysTable();
    updateStatsOverview();
    showToast('⭐ Kunci utama berhasil dialihkan!');
    await saveAllConfigurations(true);
}

// 7. HAPUS KUNCI
async function deleteKey(keyId) {
    if (!confirm('Hapus kunci API ini dari daftar?')) return;

    currentConfig.api_keys = currentConfig.api_keys.filter(k => k.id !== keyId);
    
    if (currentConfig.api_keys.length > 0 && !currentConfig.api_keys.some(k => k.is_active)) {
        currentConfig.api_keys[0].is_active = true;
    }

    renderKeysTable();
    updateStatsOverview();
    showToast('🗑️ Kunci berhasil dihapus.');
    await saveAllConfigurations(true);
}

// 8. TEST SINGLE KEY SECARA LIVE
async function testSingleKeyLive(keyId) {
    const k = (currentConfig.api_keys || []).find(item => item.id === keyId);
    if (!k) return;

    const resultCell = document.getElementById(`test-res-${keyId}`);
    if (resultCell) {
        resultCell.innerHTML = `<span style="color:#0369a1; font-size:11px;"><i class="fas fa-spinner fa-spin"></i> Menguji...</span>`;
    }

    try {
        const res = await fetch('../api/ai_config.php?action=test_key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                key: k.key,
                provider: k.provider || 'gemini',
                model: currentConfig.active_model || 'gemini-1.5-flash'
            })
        });

        const data = await res.json();
        if (resultCell) {
            if (data.result && data.result.valid) {
                resultCell.innerHTML = `<span style="color:#16a34a; font-weight:700; font-size:11px;"><i class="fas fa-check-circle"></i> Terhubung (${data.result.latency_ms}ms)</span>`;
            } else if (data.result && data.result.is_placeholder) {
                resultCell.innerHTML = `<span style="color:#d97706; font-size:11px;" title="${data.result.message}"><i class="fas fa-info-circle"></i> Kunci Contoh</span>`;
            } else if (data.result && data.result.http_code === 429) {
                resultCell.innerHTML = `<span style="color:#f59e0b; font-size:11px;" title="${data.result.message}"><i class="fas fa-exclamation-circle"></i> Limit Kuota (429)</span>`;
            } else {
                const msg = (data.result && data.result.message) ? data.result.message : 'Koneksi Gagal';
                resultCell.innerHTML = `<span style="color:#dc2626; font-size:11px;" title="${msg}"><i class="fas fa-times-circle"></i> ${msg.length > 18 ? msg.substring(0, 16) + '...' : msg}</span>`;
            }
        }
    } catch (e) {
        if (resultCell) {
            resultCell.innerHTML = `<span style="color:#dc2626; font-size:11px;"><i class="fas fa-exclamation-triangle"></i> Jaringan Error</span>`;
        }
    }
}

// 9. TEST SEMUA KUNCI SEKALIGUS
async function testAllKeysLive() {
    showToast('⚡ Menguji seluruh kunci...');
    const keys = currentConfig.api_keys || [];
    for (const k of keys) {
        await testSingleKeyLive(k.id);
    }
    showToast('✅ Pengujian selesai!');
}

// 10. MODAL TAMBAH KUNCI
function openAddKeyModal() {
    const modal = document.getElementById('modalKey');
    const form = document.getElementById('keyForm');
    if (form) form.reset();
    
    document.getElementById('keyModalId').value = '';
    document.getElementById('modalKeyTitle').innerHTML = '<i class="fas fa-key" style="color:#2d6a4f;"></i> Tambah Kunci Cadangan';
    
    if (modal) modal.classList.add('active');
}

function closeKeyModal() {
    const modal = document.getElementById('modalKey');
    if (modal) modal.classList.remove('active');
}

function toggleKeyVisibility() {
    const input = document.getElementById('keyModalValue');
    const icon = document.getElementById('toggleEyeIcon');
    if (!input || !icon) return;

    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

async function handleSaveKeyFromModal(e) {
    e.preventDefault();

    const label = document.getElementById('keyModalLabel').value.trim();
    const provider = document.getElementById('keyModalProvider').value;
    const keyVal = document.getElementById('keyModalValue').value.trim();
    const isActive = document.getElementById('keyModalIsActive').checked;

    if (!keyVal) {
        alert('Nilai Kunci API wajib diisi!');
        return;
    }

    const newKeyObj = {
        id: 'key_' + Date.now(),
        label: label || `Kunci Cadangan ${(currentConfig.api_keys.length + 1)}`,
        provider: provider,
        key: keyVal,
        is_active: isActive,
        status: 'ready'
    };

    if (isActive) {
        currentConfig.api_keys.forEach(k => k.is_active = false);
    }

    currentConfig.api_keys.push(newKeyObj);

    closeKeyModal();
    renderKeysTable();
    updateStatsOverview();
    showToast('🔑 Kunci baru berhasil ditambahkan & disimpan!');

    // Simpan langsung ke server
    await saveAllConfigurations(true);

    setTimeout(() => {
        testSingleKeyLive(newKeyObj.id);
    }, 400);
}

// 11. TEMPERATURE SLIDER HANDLER
function updateTempDisplay(val) {
    const num = parseFloat(val).toFixed(2);
    const displayEl = document.getElementById('tempDisplay');
    if (displayEl) displayEl.textContent = num;
    currentConfig.temperature = parseFloat(num);
}

// 12. SIMPAN SELURUH KONFIGURASI KE SERVER
async function saveAllConfigurations(silent = false) {
    try {
        const res = await fetch('../api/ai_config.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentConfig)
        });

        const data = await res.json();
        if (data.success) {
            if (!silent) showToast('✅ Berhasil Menyimpan! Model & Kunci aktif di server.');
        } else {
            if (!silent) alert('Gagal menyimpan: ' + (data.message || 'Terjadi kesalahan'));
        }
    } catch (e) {
        console.error('Error saving config:', e);
        localStorage.setItem('db_ai_runtime_config', JSON.stringify(currentConfig));
        if (!silent) showToast('✅ Disimpan ke browser.');
    }
}

// 13. TOAST ALERT
function showToast(msg) {
    const toast = document.getElementById('toastBox');
    const msgEl = document.getElementById('toastMsg');
    if (!toast || !msgEl) return;

    msgEl.textContent = msg;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
