/**
 * ========================================
 * PETANI CRUD OPERATIONS
 * Platform Padi Desa Cirebon Girang
 * ========================================
 */

const PetaniManager = {
    // ===== GET ALL PETANI =====
    getAll() {
        return DB.getAll(DB.keys.PETANI);
    },

    // ===== GET BY ID =====
    getById(id) {
        return DB.getById(DB.keys.PETANI, id);
    },

    // ===== GET WITH RELATIONS =====
    getWithRelations(id) {
        const petani = this.getById(id);
        if (!petani) return null;

        // Get kelompok tani
        const kelompok = petani.kelompok_tani_id ?
            DB.getKelompokById(petani.kelompok_tani_id) :
            null;

        // Get lahan
        const lahan = DB.getLahanByPetani(id);

        // Get panen
        const panen = DB.getPanenByPetani(id);

        return {
            ...petani,
            kelompok: kelompok,
            lahan: lahan,
            panen: panen
        };
    },

    // ===== CREATE =====
    create(data) {
        const petani = {
            id: DB.generateId('petani'),
            nama: data.nama,
            nik: data.nik,
            alamat: data.alamat,
            no_telepon: data.no_telepon,
            kelompok_tani_id: data.kelompok_tani_id || null,
            luas_lahan: parseFloat(data.luas_lahan) || 0,
            varietas_padi: data.varietas_padi,
            user_id: data.user_id || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        DB.create(DB.keys.PETANI, petani);

        // Also create lahan entry
        if (petani.luas_lahan > 0) {
            const lahan = {
                id: DB.generateId('lahan'),
                petani_id: petani.id,
                luas: petani.luas_lahan,
                lokasi: data.lokasi || 'Belum diisi',
                status: 'Aktif',
                created_at: new Date().toISOString()
            };
            DB.create(DB.keys.LAHAN, lahan);
        }

        return petani;
    },

    // ===== UPDATE =====
    update(id, data) {
        const existing = this.getById(id);
        if (!existing) return null;

        const updated = {
            nama: data.nama || existing.nama,
            nik: data.nik || existing.nik,
            alamat: data.alamat || existing.alamat,
            no_telepon: data.no_telepon || existing.no_telepon,
            kelompok_tani_id: data.kelompok_tani_id || existing.kelompok_tani_id,
            luas_lahan: parseFloat(data.luas_lahan) || existing.luas_lahan,
            varietas_padi: data.varietas_padi || existing.varietas_padi,
            user_id: data.user_id || existing.user_id,
            updated_at: new Date().toISOString()
        };

        return DB.update(DB.keys.PETANI, id, updated);
    },

    // ===== DELETE =====
    delete(id) {
        // Also delete related lahan
        const lahan = DB.getLahanByPetani(id);
        lahan.forEach(l => {
            DB.delete(DB.keys.LAHAN, l.id);
        });

        // Also delete related panen
        const panen = DB.getPanenByPetani(id);
        panen.forEach(p => {
            DB.delete(DB.keys.PANEN, p.id);
        });

        return DB.delete(DB.keys.PETANI, id);
    },

    // ===== SEARCH =====
    search(keyword) {
        const fields = ['nama', 'nik', 'alamat', 'no_telepon', 'varietas_padi'];
        return DB.search(DB.keys.PETANI, keyword, fields);
    },

    // ===== GET PETANI BY KELOMPOK =====
    getByKelompok(kelompokId) {
        return DB.getPetaniByKelompok(kelompokId);
    },

    // ===== GET PETANI BY USER =====
    getByUser(userId) {
        return DB.getPetaniByUserId(userId);
    },

    // ===== GET ALL KELOMPOK =====
    getAllKelompok() {
        return DB.getAll(DB.keys.KELOMPOK_TANI);
    },

    // ===== GET STATISTICS =====
    getStats() {
        const petani = this.getAll();
        const totalLuas = petani.reduce((sum, p) => sum + (p.luas_lahan || 0), 0);

        // Count by varietas
        const varietasCount = {};
        petani.forEach(p => {
            const v = p.varietas_padi || 'Tidak diketahui';
            varietasCount[v] = (varietasCount[v] || 0) + 1;
        });

        return {
            totalPetani: petani.length,
            totalLuasLahan: totalLuas,
            rataLuasLahan: petani.length > 0 ? (totalLuas / petani.length) : 0,
            varietasCount: varietasCount
        };
    },

    // ===== CHECK ACCESS =====
    canAccess(user, petaniId) {
        if (!user) return false;

        // Admin: full access
        if (user.role === 'admin') return true;

        // Perangkat Desa: can view all
        if (user.role === 'perangkat') return true;

        // Get petani data
        const petani = this.getById(petaniId);
        if (!petani) return false;

        // Petani: can access own data
        if (user.role === 'petani') {
            const userPetani = this.getByUser(user.id);
            return userPetani && userPetani.id === petaniId;
        }

        // Kelompok Tani: can access group members
        if (user.role === 'kelompok') {
            const userPetani = this.getByUser(user.id);
            if (!userPetani) return false;
            const members = this.getByKelompok(userPetani.kelompok_tani_id);
            return members.some(m => m.id === petaniId);
        }

        return false;
    },

    // ===== GET ACCESSIBLE PETANI =====
    getAccessiblePetani(user) {
        if (!user) return [];

        // Admin: all
        if (user.role === 'admin') return this.getAll();

        // Perangkat Desa: all
        if (user.role === 'perangkat') return this.getAll();

        // Petani: own data only
        if (user.role === 'petani') {
            const petani = this.getByUser(user.id);
            return petani ? [petani] : [];
        }

        // Kelompok Tani: group members
        if (user.role === 'kelompok') {
            const userPetani = this.getByUser(user.id);
            if (!userPetani) return [];
            return this.getByKelompok(userPetani.kelompok_tani_id);
        }

        return [];
    }
};

// ===== EXPOSE =====
window.PetaniManager = PetaniManager;

console.log('👨‍🌾 Petani Manager initialized.');