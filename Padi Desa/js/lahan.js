/**
 * ========================================
 * LAHAN CRUD OPERATIONS
 * Platform Padi Desa Cirebon Girang
 * ========================================
 */

const LahanManager = {
    // ===== GET ALL =====
    getAll() {
        return DB.getAll(DB.keys.LAHAN);
    },

    // ===== GET BY ID =====
    getById(id) {
        return DB.getById(DB.keys.LAHAN, id);
    },

    // ===== GET BY PETANI ID =====
    getByPetaniId(petaniId) {
        return DB.getLahanByPetani(petaniId);
    },

    // ===== CREATE =====
    create(data) {
        const lahan = {
            id: DB.generateId('lahan'),
            petani_id: data.petani_id,
            luas: parseFloat(data.luas) || 0,
            lokasi: data.lokasi || '',
            status: data.status || 'Aktif',
            created_at: new Date().toISOString()
        };
        
        // Also update total lahan in petani
        this.recalculateLuasPetani(data.petani_id, lahan.luas, true);
        
        return DB.create(DB.keys.LAHAN, lahan);
    },

    // ===== UPDATE =====
    update(id, data) {
        const existing = this.getById(id);
        if (!existing) return null;
        
        // Handle area diff for farmer total
        const diff = (parseFloat(data.luas) || 0) - existing.luas;

        const updated = {
            petani_id: data.petani_id || existing.petani_id,
            luas: parseFloat(data.luas) || existing.luas,
            lokasi: data.lokasi || existing.lokasi,
            status: data.status || existing.status
        };

        if (diff !== 0) {
            this.recalculateLuasPetani(updated.petani_id, diff, true);
        }

        return DB.update(DB.keys.LAHAN, id, updated);
    },

    // ===== DELETE =====
    delete(id) {
        const existing = this.getById(id);
        if (existing) {
            this.recalculateLuasPetani(existing.petani_id, -existing.luas, true);
        }
        return DB.delete(DB.keys.LAHAN, id);
    },

    // ===== RECALCULATE LUAS =====
    recalculateLuasPetani(petaniId, diff, isDiff = false) {
        const petani = DB.getById(DB.keys.PETANI, petaniId);
        if (petani) {
            const newLuas = isDiff ? (petani.luas_lahan || 0) + diff : diff;
            DB.update(DB.keys.PETANI, petaniId, { luas_lahan: newLuas > 0 ? newLuas : 0 });
        }
    },

    // ===== SEARCH =====
    search(keyword) {
        const fields = ['lokasi', 'status'];
        return DB.search(DB.keys.LAHAN, keyword, fields);
    }
};

window.LahanManager = LahanManager;
console.log('🌾 Lahan Manager initialized.');
