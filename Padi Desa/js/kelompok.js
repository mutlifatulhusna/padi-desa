/**
 * ========================================
 * KELOMPOK TANI CRUD OPERATIONS
 * Platform Padi Desa Cirebon Girang
 * ========================================
 */

const KelompokManager = {
    // ===== GET ALL =====
    getAll() {
        return DB.getAll(DB.keys.KELOMPOK_TANI);
    },

    // ===== GET BY ID =====
    getById(id) {
        return DB.getById(DB.keys.KELOMPOK_TANI, id);
    },

    // ===== CREATE =====
    create(data) {
        const kelompok = {
            id: DB.generateId('kelompok'),
            nama: data.nama,
            ketua: data.ketua,
            anggota: parseInt(data.anggota) || 0,
            desa: data.desa || 'Cirebon Girang',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        return DB.create(DB.keys.KELOMPOK_TANI, kelompok);
    },

    // ===== UPDATE =====
    update(id, data) {
        const existing = this.getById(id);
        if (!existing) return null;

        const updated = {
            nama: data.nama || existing.nama,
            ketua: data.ketua || existing.ketua,
            anggota: data.anggota !== undefined ? parseInt(data.anggota) : existing.anggota,
            desa: data.desa || existing.desa,
            updated_at: new Date().toISOString()
        };

        return DB.update(DB.keys.KELOMPOK_TANI, id, updated);
    },

    // ===== DELETE =====
    delete(id) {
        // Find farmers that belong to this group and unset their group
        const petani = DB.getPetaniByKelompok(id);
        petani.forEach(p => {
            DB.update(DB.keys.PETANI, p.id, { kelompok_tani_id: null });
        });

        return DB.delete(DB.keys.KELOMPOK_TANI, id);
    },

    // ===== SEARCH =====
    search(keyword) {
        const fields = ['nama', 'ketua', 'desa'];
        return DB.search(DB.keys.KELOMPOK_TANI, keyword, fields);
    }
};

window.KelompokManager = KelompokManager;
console.log('👥 Kelompok Manager initialized.');
