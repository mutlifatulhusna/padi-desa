/**
 * ========================================
 * PANEN CRUD OPERATIONS
 * Platform Padi Desa Cirebon Girang
 * ========================================
 */

const PanenManager = {
    // ===== GET ALL =====
    getAll() {
        return DB.getAll(DB.keys.PANEN);
    },

    // ===== GET BY ID =====
    getById(id) {
        return DB.getById(DB.keys.PANEN, id);
    },

    // ===== GET BY PETANI ID =====
    getByPetaniId(petaniId) {
        return DB.getPanenByPetani(petaniId);
    },

    // ===== CREATE =====
    create(data) {
        const panen = {
            id: DB.generateId('panen'),
            petani_id: data.petani_id,
            tanggal: data.tanggal || new Date().toISOString().split('T')[0],
            jumlah: parseFloat(data.jumlah) || 0, // In tons or kg
            kualitas: data.kualitas || 'Baik',
            created_at: new Date().toISOString()
        };
        return DB.create(DB.keys.PANEN, panen);
    },

    // ===== UPDATE =====
    update(id, data) {
        const existing = this.getById(id);
        if (!existing) return null;

        const updated = {
            petani_id: data.petani_id || existing.petani_id,
            tanggal: data.tanggal || existing.tanggal,
            jumlah: parseFloat(data.jumlah) || existing.jumlah,
            kualitas: data.kualitas || existing.kualitas
        };

        return DB.update(DB.keys.PANEN, id, updated);
    },

    // ===== DELETE =====
    delete(id) {
        return DB.delete(DB.keys.PANEN, id);
    },

    // ===== SEARCH =====
    search(keyword) {
        const fields = ['tanggal', 'kualitas'];
        return DB.search(DB.keys.PANEN, keyword, fields);
    }
};

window.PanenManager = PanenManager;
console.log('🌾 Panen Manager initialized.');
