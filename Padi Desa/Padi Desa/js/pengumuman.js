/**
 * ========================================
 * PENGUMUMAN CRUD OPERATIONS
 * Platform Padi Desa Cirebon Girang
 * ========================================
 */

const PengumumanManager = {
    // ===== GET ALL =====
    getAll() {
        return DB.getAll(DB.keys.PENGUMUMAN).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },

    // ===== GET BY ID =====
    getById(id) {
        const direct = DB.getById(DB.keys.PENGUMUMAN, id);
        if (direct) return direct;
        const all = this.getAll();
        return all.find(item => String(item.id) === String(id)) || null;
    },

    // ===== CREATE =====
    create(data) {
        const pengumuman = {
            id: DB.generateId('pengumuman'),
            judul: data.judul,
            konten: data.konten,
            jenis: data.jenis || 'Informasi',
            created_by: data.created_by,
            created_at: new Date().toISOString()
        };
        return DB.create(DB.keys.PENGUMUMAN, pengumuman);
    },

    // ===== UPDATE =====
    update(id, data) {
        const existing = this.getById(id);
        if (!existing) return null;

        const updated = {
            judul: data.judul || existing.judul,
            konten: data.konten || existing.konten,
            jenis: data.jenis || existing.jenis
        };

        return DB.update(DB.keys.PENGUMUMAN, id, updated);
    },

    // ===== DELETE =====
    delete(id) {
        return DB.delete(DB.keys.PENGUMUMAN, id);
    },

    // ===== SEARCH =====
    search(keyword) {
        const fields = ['judul', 'konten', 'jenis'];
        const results = DB.search(DB.keys.PENGUMUMAN, keyword, fields);
        return results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
};

window.PengumumanManager = PengumumanManager;
console.log('📢 Pengumuman Manager initialized.');
