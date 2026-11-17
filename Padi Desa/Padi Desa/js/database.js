/**
 * ========================================
 * DATABASE LAYER
 * Platform Padi Desa Cirebon Girang
 * Menggunakan LocalStorage sebagai database
 * ========================================
 */

const DB = {
    // ===== DATABASE KEYS =====
    keys: {
        USERS: 'db_users',
        PETANI: 'db_petani',
        KELOMPOK_TANI: 'db_kelompok_tani',
        LAHAN: 'db_lahan',
        PANEN: 'db_panen',
        PENGUMUMAN: 'db_pengumuman',
        COUNTERS: 'db_counters'
    },

    // ===== INITIALIZE DATABASE =====
    init() {
        // Initialize all collections if empty
        const collections = [
            this.keys.USERS,
            this.keys.PETANI,
            this.keys.KELOMPOK_TANI,
            this.keys.LAHAN,
            this.keys.PANEN,
            this.keys.PENGUMUMAN,
            this.keys.COUNTERS
        ];

        collections.forEach(key => {
            if (!localStorage.getItem(key)) {
                localStorage.setItem(key, JSON.stringify([]));
            }
        });

        // Initialize counters
        if (!localStorage.getItem(this.keys.COUNTERS)) {
            const counters = {
                users: 4,
                petani: 0,
                kelompok: 0,
                lahan: 0,
                panen: 0,
                pengumuman: 0
            };
            localStorage.setItem(this.keys.COUNTERS, JSON.stringify(counters));
        }

        // Seed data if empty
        this.seedData();
        // Purge any obsolete kelompok accounts from localStorage db_users
        try {
            const rawStoredUsers = localStorage.getItem(this.keys.USERS);
            if (rawStoredUsers) {
                const parsedU = JSON.parse(rawStoredUsers);
                if (Array.isArray(parsedU)) {
                    const cleanedU = parsedU.filter(u => u.username !== 'kelompok@desa.id' && u.role !== 'kelompok');
                    if (cleanedU.length !== parsedU.length) {
                        localStorage.setItem(this.keys.USERS, JSON.stringify(cleanedU));
                    }
                }
            }
        } catch (e) {}


        // Sync with real-time MySQL database if online
        this.syncFromMySQL();
    },

    // ===== SYNC FROM MYSQL DATABASE =====
    syncFromMySQL() {
        const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
        if (!isHttp) return;
        const isPagesDir = window.location.pathname.includes('/pages/');
        const apiUrl = isPagesDir ? '../api/sync.php' : 'api/sync.php';
        fetch(apiUrl)
            .then(res => res.json())
            .then(result => {
                if (result && result.success && result.data) {
                    const data = result.data;

                    // 1. Sync Users
                    if (Array.isArray(data.users) && data.users.length > 0) {
                        const currentStored = this.getAll(this.keys.USERS);
                        const formatted = data.users.map(u => {
                            const existing = currentStored.find(cur => cur.id == u.id || (cur.username && u.username && cur.username.toLowerCase() === u.username.toLowerCase()));
                            return {
                                id: parseInt(u.id),
                                username: u.username,
                                name: u.name,
                                role: u.role,
                                roleLabel: u.role_label || u.roleLabel,
                                avatar: u.avatar || '👤',
                                password: u.password || (existing ? existing.password : undefined),
                                created_at: u.created_at || new Date().toISOString()
                            };
                        });
                        localStorage.setItem(this.keys.USERS, JSON.stringify(formatted));

                        // Refresh active session in localStorage if user's name or info was changed in MySQL!
                        const sessRaw = localStorage.getItem('padi_desa_session');
                        if (sessRaw) {
                            try {
                                const sess = JSON.parse(sessRaw);
                                if (sess && sess.user) {
                                    const freshUser = formatted.find(u => u.id == sess.user.id || (u.username && sess.user.username && u.username.toLowerCase() === sess.user.username.toLowerCase()));
                                    if (freshUser) {
                                        sess.user = { ...sess.user, ...freshUser };
                                        localStorage.setItem('padi_desa_session', JSON.stringify(sess));
                                    }
                                }
                            } catch (e) {}
                        }
                    }

                    // 2. Sync Petani
                    if (Array.isArray(data.petani) && data.petani.length > 0) {
                        localStorage.setItem(this.keys.PETANI, JSON.stringify(data.petani));
                    }

                    // 3. Sync Kelompok Tani
                    if (Array.isArray(data.kelompok_tani) && data.kelompok_tani.length > 0) {
                        localStorage.setItem(this.keys.KELOMPOK_TANI, JSON.stringify(data.kelompok_tani));
                    }

                    // 4. Sync Lahan
                    if (Array.isArray(data.lahan) && data.lahan.length > 0) {
                        localStorage.setItem(this.keys.LAHAN, JSON.stringify(data.lahan));
                    }

                    // 5. Sync Panen
                    if (Array.isArray(data.panen) && data.panen.length > 0) {
                        localStorage.setItem(this.keys.PANEN, JSON.stringify(data.panen));
                    }

                    // 6. Sync Pengumuman
                    if (Array.isArray(data.pengumuman) && data.pengumuman.length > 0) {
                        localStorage.setItem(this.keys.PENGUMUMAN, JSON.stringify(data.pengumuman));
                    }
                }
            })
            .catch(e => console.warn('Sync from MySQL skipped:', e));
    },

    pushToMySQL(action, entity, data) {
        const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
        if (!isHttp) return;
        const isPagesDir = window.location.pathname.includes('/pages/');
        const apiUrl = isPagesDir ? '../api/sync.php' : 'api/sync.php';
        fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, entity, data })
        }).catch(e => console.warn('Push MySQL error:', e));
    },

    getEntityFromKey(key) {
        if (key === this.keys.PETANI) return 'petani';
        if (key === this.keys.KELOMPOK_TANI) return 'kelompok';
        if (key === this.keys.LAHAN) return 'lahan';
        if (key === this.keys.PANEN) return 'panen';
        if (key === this.keys.PENGUMUMAN) return 'pengumuman';
        return null;
    },

    // ===== SEED DATA =====
    seedData() {
        // Seed Users
        const users = this.getAll(this.keys.USERS);
        if (users.length === 0) {
            const defaultUsers = [
                {
                    id: 1,
                    username: 'admin@desa.id',
                    password: 'admin123',
                    name: 'Admin Desa',
                    role: 'admin',
                    roleLabel: 'Admin',
                    avatar: '👨‍💼',
                    created_at: new Date().toISOString()
                },
                {
                    id: 2,
                    username: 'perangkat@desa.id',
                    password: 'perangkat123',
                    name: 'Perangkat Desa',
                    role: 'perangkat',
                    roleLabel: 'Perangkat Desa',
                    avatar: '👨‍💻',
                    created_at: new Date().toISOString()
                },
                {
                    id: 4,
                    username: 'petani@desa.id',
                    password: 'petani123',
                    name: 'Petani',
                    role: 'petani',
                    roleLabel: 'Petani',
                    avatar: '🧑‍🌾',
                    created_at: new Date().toISOString()
                }
            ];
            this.saveAll(this.keys.USERS, defaultUsers);
        }
        const petani = this.getAll(this.keys.PETANI);
        const kelompok = this.getAll(this.keys.KELOMPOK_TANI);

        // Seed Kelompok Tani
        if (kelompok.length === 0) {
            const kelompokData = [
                {
                    id: this.generateId('kelompok'),
                    nama: 'Kelompok Tani Makmur',
                    ketua: 'Bapak Slamet',
                    anggota: 15,
                    desa: 'Cirebon Girang',
                    created_at: new Date().toISOString()
                },
                {
                    id: this.generateId('kelompok'),
                    nama: 'Kelompok Tani Sejahtera',
                    ketua: 'Bapak Joko',
                    anggota: 20,
                    desa: 'Cirebon Girang',
                    created_at: new Date().toISOString()
                },
                {
                    id: this.generateId('kelompok'),
                    nama: 'Kelompok Tani Berkah',
                    ketua: 'Bapak Ahmad',
                    anggota: 12,
                    desa: 'Cirebon Girang',
                    created_at: new Date().toISOString()
                }
            ];
            this.saveAll(this.keys.KELOMPOK_TANI, kelompokData);
        }

        // Seed Petani
        if (petani.length === 0) {
            const allKelompok = this.getAll(this.keys.KELOMPOK_TANI);
            const petaniData = [
                {
                    id: this.generateId('petani'),
                    nama: 'Bapak Samsul',
                    nik: '3209123456789001',
                    alamat: 'RT 01 RW 02, Cirebon Girang',
                    no_telepon: '081234567890',
                    kelompok_tani_id: allKelompok[0]?.id || null,
                    luas_lahan: 2.5,
                    varietas_padi: 'Ciherang',
                    user_id: 4, // petani@desa.id
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                {
                    id: this.generateId('petani'),
                    nama: 'Bapak Rohmat',
                    nik: '3209123456789002',
                    alamat: 'RT 02 RW 03, Cirebon Girang',
                    no_telepon: '081234567891',
                    kelompok_tani_id: allKelompok[1]?.id || null,
                    luas_lahan: 3.0,
                    varietas_padi: 'Mekongga',
                    user_id: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                {
                    id: this.generateId('petani'),
                    nama: 'Ibu Siti',
                    nik: '3209123456789003',
                    alamat: 'RT 03 RW 01, Cirebon Girang',
                    no_telepon: '081234567892',
                    kelompok_tani_id: allKelompok[2]?.id || null,
                    luas_lahan: 1.8,
                    varietas_padi: 'Inpari',
                    user_id: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                },
                {
                    id: this.generateId('petani'),
                    nama: 'Bapak Hendra',
                    nik: '3209123456789004',
                    alamat: 'RT 04 RW 02, Cirebon Girang',
                    no_telepon: '081234567893',
                    kelompok_tani_id: allKelompok[0]?.id || null,
                    luas_lahan: 4.2,
                    varietas_padi: 'Ciherang',
                    user_id: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            ];
            this.saveAll(this.keys.PETANI, petaniData);
        }

        // Seed Lahan
        const lahan = this.getAll(this.keys.LAHAN);
        if (lahan.length === 0) {
            const allPetani = this.getAll(this.keys.PETANI);
            const lahanData = [
                {
                    id: this.generateId('lahan'),
                    petani_id: allPetani[0]?.id || null,
                    luas: 2.5,
                    lokasi: 'Blok A, Sawah Utara',
                    status: 'Aktif',
                    created_at: new Date().toISOString()
                },
                {
                    id: this.generateId('lahan'),
                    petani_id: allPetani[1]?.id || null,
                    luas: 3.0,
                    lokasi: 'Blok B, Sawah Timur',
                    status: 'Aktif',
                    created_at: new Date().toISOString()
                }
            ];
            this.saveAll(this.keys.LAHAN, lahanData);
        }

        // Seed Pengumuman
        const pengumuman = this.getAll(this.keys.PENGUMUMAN);
        if (pengumuman.length === 0) {
            const pengumumanData = [
                {
                    id: this.generateId('pengumuman'),
                    judul: 'Penyuluhan Pertanian',
                    konten: 'Akan diadakan penyuluhan pertanian tentang pengendalian hama padi pada tanggal 15 Maret 2026.',
                    jenis: 'Penyuluhan',
                    created_by: 1,
                    created_at: new Date().toISOString()
                },
                {
                    id: this.generateId('pengumuman'),
                    judul: 'Informasi Harga Padi',
                    konten: 'Harga padi saat ini Rp 6.500/kg untuk varietas Ciherang.',
                    jenis: 'Informasi',
                    created_by: 1,
                    created_at: new Date().toISOString()
                }
            ];
            this.saveAll(this.keys.PENGUMUMAN, pengumumanData);
        }
    },

    // ===== GENERATE ID =====
    generateId(collection) {
        const counters = JSON.parse(localStorage.getItem(this.keys.COUNTERS));
        counters[collection] = (counters[collection] || 0) + 1;
        localStorage.setItem(this.keys.COUNTERS, JSON.stringify(counters));
        return `${collection}_${counters[collection]}_${Date.now()}`;
    },

    // ===== CRUD OPERATIONS =====
    getAll(key) {
        try {
            return JSON.parse(localStorage.getItem(key)) || [];
        } catch (e) {
            return [];
        }
    },

    saveAll(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },

    getById(key, id) {
        const data = this.getAll(key);
        return data.find(item => String(item.id) === String(id)) || null;
    },

    create(key, item) {
        const data = this.getAll(key);
        data.push(item);
        this.saveAll(key, data);
        const entity = this.getEntityFromKey(key);
        if (entity) this.pushToMySQL('save', entity, item);
        return item;
    },

    update(key, id, updates) {
        const data = this.getAll(key);
        const index = data.findIndex(item => String(item.id) === String(id));
        if (index === -1) return null;

        data[index] = { ...data[index], ...updates, updated_at: new Date().toISOString() };
        this.saveAll(key, data);
        const entity = this.getEntityFromKey(key);
        if (entity) this.pushToMySQL('save', entity, { id, ...updates });
        return data[index];
    },

    delete(key, id) {
        const data = this.getAll(key);
        const filtered = data.filter(item => String(item.id) !== String(id));
        this.saveAll(key, filtered);
        const entity = this.getEntityFromKey(key);
        if (entity) this.pushToMySQL('delete', entity, { id });
        return true;
    },

    search(key, searchTerm, fields) {
        const data = this.getAll(key);
        if (!searchTerm) return data;

        const term = searchTerm.toLowerCase();
        return data.filter(item => {
            return fields.some(field => {
                const value = item[field];
                return value && String(value).toLowerCase().includes(term);
            });
        });
    },

    // ===== RELATIONAL HELPERS =====
    getPetaniByUserId(userId) {
        if (!userId) return null;
        const petani = this.getAll(this.keys.PETANI);
        let found = petani.find(p => String(p.user_id) === String(userId));
        if (found) return found;

        // Fallback: match by session name or username
        const sessRaw = localStorage.getItem('padi_desa_session');
        if (sessRaw) {
            try {
                const sess = JSON.parse(sessRaw);
                if (sess && sess.user && sess.user.role === 'petani') {
                    found = petani.find(p => p.nama && sess.user.name && p.nama.toLowerCase() === sess.user.name.toLowerCase());
                    if (found) {
                        found.user_id = parseInt(userId);
                        this.update(this.keys.PETANI, found.id, { user_id: parseInt(userId) });
                        return found;
                    }
// Removed buggy auto-assign dummy farmer fallback
                }
            } catch (e) {}
        }
        return null;
    },

    getPetaniByKelompok(kelompokId) {
        const petani = this.getAll(this.keys.PETANI);
        return petani.filter(p => p.kelompok_tani_id === kelompokId);
    },

    getKelompokById(id) {
        return this.getById(this.keys.KELOMPOK_TANI, id);
    },

    getLahanByPetani(petaniId) {
        const lahan = this.getAll(this.keys.LAHAN);
        return lahan.filter(l => String(l.petani_id) === String(petaniId));
    },

    getPanenByPetani(petaniId) {
        const panen = this.getAll(this.keys.PANEN);
        return panen.filter(p => String(p.petani_id) === String(petaniId));
    },

    // ===== AUTH CHECK =====
    canAccessPetani(user, petaniData) {
        if (!user) return false;

        // Admin can access all
        if (user.role === 'admin') return true;

        // Perangkat desa can view all
        if (user.role === 'perangkat' || user.role === 'desa') return true;

        // Petani can only access their own data
        if (user.role === 'petani') {
            const userPetani = this.getPetaniByUserId(user.id);
            if (!userPetani) return false;
            return String(userPetani.id) === String(petaniData.id);
        }

        // Kelompok tani can access their group members
        if (user.role === 'kelompok') {
            // Get kelompok tani data for this user
            const userPetani = this.getPetaniByUserId(user.id);
            if (!userPetani) return false;
            const kelompok = this.getKelompokById(userPetani.kelompok_tani_id);
            if (!kelompok) return false;
            // Check if petani is in same kelompok
            const members = this.getPetaniByKelompok(kelompok.id);
            return members.some(m => m.id === petaniData.id);
        }

        return false;
    }
};

// ===== INIT DATABASE =====
DB.init();

// ===== EXPOSE =====
window.DB = DB;

console.log('💾 Database initialized.');
console.log('📊 Collections:', {
    petani: DB.getAll(DB.keys.PETANI).length,
    kelompok: DB.getAll(DB.keys.KELOMPOK_TANI).length,
    lahan: DB.getAll(DB.keys.LAHAN).length,
    panen: DB.getAll(DB.keys.PANEN).length,
    pengumuman: DB.getAll(DB.keys.PENGUMUMAN).length
});