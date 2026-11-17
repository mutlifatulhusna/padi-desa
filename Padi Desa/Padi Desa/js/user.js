/**
 * ========================================
 * USER MANAGEMENT CRUD OPERATIONS
 * Platform Padi Desa Cirebon Girang
 * ========================================
 */

const UserManager = {
    // Map of role identifier to user-friendly label & default avatar
    rolesConfig: {
        admin: { label: 'Admin', avatar: '👨‍💼' },
        perangkat: { label: 'Perangkat Desa', avatar: '👨‍💻' },
        desa: { label: 'Perangkat Desa', avatar: '👨‍💻' },
        petani: { label: 'Petani', avatar: '🧑‍🌾' }
    },

    // ===== GET ALL USERS =====
    getAll() {
        return DB.getAll(DB.keys.USERS);
    },

    // ===== GET USER BY ID =====
    getById(id) {
        const users = this.getAll();
        return users.find(u => String(u.id) === String(id)) || null;
    },

    // ===== CREATE USER =====
    create(data) {
        const roleInfo = this.rolesConfig[data.role] || { label: data.role, avatar: '👤' };
        
        // Auto increment numeric ID or custom ID
        const counters = JSON.parse(localStorage.getItem(DB.keys.COUNTERS)) || {};
        counters.users = (counters.users || 4) + 1;
        localStorage.setItem(DB.keys.COUNTERS, JSON.stringify(counters));

        const newUser = {
            id: counters.users,
            username: (data.username || '').trim().toLowerCase(),
            password: data.password || '123456',
            name: (data.name || '').trim(),
            no_telepon: (data.no_telepon || '').trim(),
            role: data.role,
            roleLabel: roleInfo.label,
            avatar: data.avatar || roleInfo.avatar,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        DB.create(DB.keys.USERS, newUser);

        // Sync ke database MySQL jika online
        const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
        if (isHttp) {
            const isPagesDir = window.location.pathname.includes('/pages/');
            const apiUrl = isPagesDir ? '../api/users.php' : 'api/users.php';
            fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            }).catch(e => console.warn('Sync MySQL create user error:', e));
        }

        return newUser;
    },

    // ===== UPDATE USER =====
    update(id, data) {
        const existing = this.getById(id);
        if (!existing) return null;

        const roleInfo = this.rolesConfig[data.role || existing.role] || { label: data.role, avatar: '👤' };

        const updates = {
            username: data.username !== undefined ? data.username.trim().toLowerCase() : existing.username,
            name: data.name !== undefined ? data.name.trim() : existing.name,
            no_telepon: data.no_telepon !== undefined ? data.no_telepon.trim() : (existing.no_telepon || ''),
            role: data.role !== undefined ? data.role : existing.role,
            roleLabel: roleInfo.label,
            avatar: data.avatar || roleInfo.avatar,
            updated_at: new Date().toISOString()
        };

        // Only update password if provided
        if (data.password && data.password.trim() !== '') {
            updates.password = data.password.trim();
        }

        const updated = DB.update(DB.keys.USERS, existing.id, updates);

        // Sync ke database MySQL jika online
        const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
        if (isHttp) {
            const isPagesDir = window.location.pathname.includes('/pages/');
            const apiUrl = isPagesDir ? '../api/users.php' : 'api/users.php';
            fetch(apiUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: existing.id, ...updates, password: data.password })
            }).catch(e => console.warn('Sync MySQL update user error:', e));
        }

        // If currently logged-in user is updated, update active session as well
        const currentSessionUser = auth.getCurrentUser();
        if (currentSessionUser && String(currentSessionUser.id) === String(existing.id)) {
            const { password: _, ...safeSessionUser } = { ...existing, ...updates };
            auth.saveSession ? auth.saveSession(safeSessionUser) : localStorage.setItem('padi_desa_session', JSON.stringify({
                user: safeSessionUser,
                loginAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
            }));
        }

        return updated;
    },

    // ===== DELETE USER =====
    delete(id) {
        const currentUser = auth.getCurrentUser();
        if (currentUser && String(currentUser.id) === String(id)) {
            alert('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan!');
            return false;
        }

        // Sync ke database MySQL jika online
        const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
        if (isHttp) {
            const isPagesDir = window.location.pathname.includes('/pages/');
            const apiUrl = isPagesDir ? `../api/users.php?id=${id}` : `api/users.php?id=${id}`;
            fetch(apiUrl, { method: 'DELETE' }).catch(e => console.warn('Sync MySQL delete user error:', e));
        }

        return DB.delete(DB.keys.USERS, id);
    },

    // ===== SEARCH USERS =====
    search(searchTerm) {
        return DB.search(DB.keys.USERS, searchTerm, ['name', 'username', 'no_telepon', 'role', 'roleLabel']);
    },

    // ===== CHECK IF USERNAME EXISTS =====
    isUsernameTaken(username, excludeId = null) {
        const users = this.getAll();
        return users.some(u => 
            u.username.toLowerCase() === username.trim().toLowerCase() && 
            (excludeId === null || String(u.id) !== String(excludeId))
        );
    },

    // ===== SYNC FROM MYSQL =====
    async syncFromMySQL() {
        const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
        if (!isHttp) return;
        try {
            const isPagesDir = window.location.pathname.includes('/pages/');
            const apiUrl = isPagesDir ? '../api/users.php' : 'api/users.php';
            const res = await fetch(apiUrl);
            const json = await res.json();
            if (json && json.success && Array.isArray(json.data)) {
                // Merge/update local DB
                const localUsers = this.getAll();
                json.data.forEach(remoteUser => {
                    const localIdx = localUsers.findIndex(u => String(u.id) === String(remoteUser.id));
                    const mapped = {
                        id: remoteUser.id,
                        username: remoteUser.username,
                        name: remoteUser.name,
                        role: remoteUser.role,
                        roleLabel: remoteUser.role_label || remoteUser.role,
                        avatar: remoteUser.avatar || '👤',
                        no_telepon: remoteUser.no_telepon || '',
                        password: localIdx >= 0 && localUsers[localIdx].password ? localUsers[localIdx].password : '••••••••',
                        created_at: remoteUser.created_at,
                        updated_at: remoteUser.updated_at
                    };
                    if (localIdx >= 0) {
                        localUsers[localIdx] = { ...localUsers[localIdx], ...mapped };
                    } else {
                        localUsers.push(mapped);
                    }
                });
                DB.setAll(DB.keys.USERS, localUsers);
                return localUsers;
            }
        } catch (e) {
            console.warn('Sync users from MySQL failed:', e);
        }
        return this.getAll();
    }
};

window.UserManager = UserManager;
