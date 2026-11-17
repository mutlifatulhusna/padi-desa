/**
 * ========================================
 * DASHBOARD CONTROLLER
 * Platform Padi Desa Cirebon Girang
 * ========================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verify User Authentication
    const currentUser = window.auth ? auth.getCurrentUser() : null;
    
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    // 2. Update UI with User Info
    const elUserName = document.getElementById('userName');
    const elUserRole = document.getElementById('userRole');
    const elUserAvatar = document.getElementById('userAvatar');
    const elRoleBadge = document.getElementById('roleBadge');
    
    if (elUserName) elUserName.textContent = currentUser.name;
    if (elUserRole) elUserRole.textContent = currentUser.roleLabel;
    if (elUserAvatar) elUserAvatar.textContent = currentUser.avatar;
    if (elRoleBadge) {
        elRoleBadge.textContent = currentUser.roleLabel;
        elRoleBadge.className = `badge role-badge ${currentUser.role}`;
    }

    // Update Welcome Message (Dashboard only)
    const elWelcomeTitle = document.getElementById('welcomeTitle');
    if (elWelcomeTitle) {
        elWelcomeTitle.textContent = `🌾 Selamat Datang, ${currentUser.name}!`;
    }

    // 3. Render Sidebar Menu based on Role
    const sidebarMenu = document.getElementById('sidebarMenu');
    
    if (sidebarMenu) {
        const MENU_ITEMS = [
            { label: 'Beranda', icon: 'fa-home', url: 'dashboard.html', roles: ['admin', 'perangkat', 'desa', 'petani'] },
            { label: 'Tambah Lahan', icon: 'fa-plus-circle', url: 'javascript:void(0)', isAction: 'tambahLahan', roles: ['petani'] },
            { label: 'Data Lahan', icon: 'fa-layer-group', url: 'pages/lahan.html', roles: ['admin', 'perangkat', 'desa', 'petani'] },
            { label: 'Data Panen', icon: 'fa-seedling', url: 'pages/panen.html', roles: ['admin', 'perangkat', 'desa', 'petani'] },
            { label: 'Pengumuman', icon: 'fa-bullhorn', url: 'pages/pengumuman.html', roles: ['admin', 'perangkat', 'desa', 'petani'] },
            { label: 'Notifikasi & Pesanan', icon: 'fa-bell', url: 'pages/status-pesanan.html', isAction: 'notifikasi', roles: ['admin', 'perangkat', 'desa', 'petani'] },
            { label: 'Edit Profil Saya', icon: 'fa-user-edit', url: 'javascript:void(0)', isAction: 'editProfil', roles: ['petani'] },
            { label: 'Data Petani', icon: 'fa-users', url: 'pages/petani.html', roles: ['admin', 'perangkat', 'desa'] },
            { label: 'Kelompok Tani', icon: 'fa-users-cog', url: 'pages/kelompok.html', roles: ['admin', 'perangkat', 'desa'] },
            { label: 'Manajemen User', icon: 'fa-user-shield', url: 'pages/user.html', roles: ['admin'] },
            { label: 'Konfigurasi AI', icon: 'fa-robot', url: 'pages/ai-config.html', roles: ['admin'] },
            { label: 'Ganti Password', icon: 'fa-key', url: 'javascript:void(0)', isAction: 'gantiPassword', roles: ['admin', 'perangkat', 'desa', 'petani'] }
        ];

        let menuHTML = '<div class="menu-label">Menu Utama</div>';

        // Check if we are inside a sub-folder (e.g. pages/)
        const isInsidePages = window.location.pathname.includes('/pages/');

        MENU_ITEMS.forEach(item => {
            if (item.roles.includes(currentUser.role)) {
                // Determine active state based on URL
                let isActive = window.location.pathname.includes(item.url) || 
                               (window.location.pathname.endsWith('dashboard.html') && item.url === 'dashboard.html');
                
                // Format relative URL
                let finalUrl = item.url;
                if (isInsidePages) {
                    if (item.url === 'dashboard.html') finalUrl = '../dashboard.html';
                    else if (item.url.startsWith('pages/')) finalUrl = item.url.replace('pages/', '');
                } else {
                    if (item.url === 'dashboard.html') finalUrl = 'dashboard.html';
                }

                let clickAttr = '';
                let extraId = '';
                let iconStyle = '';
                if (item.isAction === 'tambahLahan') {
                    clickAttr = isInsidePages ? 'href="../dashboard.html?action=tambah-lahan"' : 'href="javascript:void(0)" onclick="openTambahLahanModal()"';
                    extraId = 'id="menuTambahLahan"';
                    iconStyle = 'style="color: #6fcf97;"';
                } else if (item.isAction === 'editProfil') {
                    clickAttr = isInsidePages ? 'href="../dashboard.html?action=edit-profil"' : 'href="javascript:void(0)" onclick="openEditProfileModal()"';
                    extraId = 'id="menuEditProfil"';
                } else if (item.isAction === 'gantiPassword') {
                    clickAttr = isInsidePages ? 'href="../dashboard.html?action=ganti-password"' : 'href="javascript:void(0)" onclick="openGantiPasswordModal()"';
                    extraId = 'id="menuGantiPassword"';
                    iconStyle = 'style="color: #f59e0b;"';
                } else if (item.isAction === 'notifikasi') {
                    clickAttr = isInsidePages ? 'href="status-pesanan.html"' : 'href="javascript:void(0)" onclick="goToNotifikasiSection()"';
                    extraId = 'id="menuNotifikasi"';
                    iconStyle = 'style="color: #10b981;"';
                } else {
                    clickAttr = `href="${finalUrl}"`;
                }

                menuHTML += `
                    <a ${clickAttr} ${extraId} class="${isActive ? 'active' : ''}">
                        <i class="fas ${item.icon}" ${iconStyle}></i> ${item.label}
                    </a>
                `;
            }
        });

        sidebarMenu.innerHTML = menuHTML;
    }

    // 4. Toggle Dashboard Role Contents
    const roleContents = document.querySelectorAll('.role-content');
    if (roleContents.length > 0) {
        // Hide all
        roleContents.forEach(el => el.classList.remove('active'));
        
        // Show specific for current user role
        const activeContent = document.getElementById(`content${capitalize(currentUser.role)}`);
        if (activeContent) {
            activeContent.classList.add('active');
        } else {
            // fallback if not found (though we covered admin, perangkat, kelompok, petani)
            const fallbackAdmin = document.getElementById('contentAdmin');
            if(fallbackAdmin && currentUser.role === 'admin') fallbackAdmin.classList.add('active');
        }
    }

    // 5. Generate Stats (Optional)
    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid && window.DB) {
        let statsHTML = '';
        
        const totalPengumuman = DB.getAll(DB.keys.PENGUMUMAN).length;

        if (currentUser.role === 'petani') {
            const myPetani = DB.getPetaniByUserId(currentUser.id);
            const myLahan = myPetani ? DB.getLahanByPetani(myPetani.id) : [];
            const myPanen = myPetani ? DB.getPanenByPetani(myPetani.id) : [];
            const myTotalLuas = myLahan.reduce((sum, l) => sum + (parseFloat(l.luas) || 0), 0);

            statsHTML += createStatCard('Lahan Milik Saya', myLahan.length + ' Bidang', 'fa-layer-group');
            statsHTML += createStatCard('Total Luas Lahan', myTotalLuas.toFixed(2) + ' ha', 'fa-map-marked-alt');
            statsHTML += createStatCard('Riwayat Panen', myPanen.length + ' Kali', 'fa-seedling');
            statsHTML += createStatCard('Pengumuman Desa', totalPengumuman, 'fa-bullhorn');

            const welcomeDesc = document.getElementById('welcomeDesc');
            if (welcomeDesc) {
                welcomeDesc.textContent = 'Kelola data lahan sawah, hasil panen, dan profil pribadi Anda di sini.';
            }
        } else {
            const totalPetani = DB.getAll(DB.keys.PETANI).length;
            const totalLahan = DB.getAll(DB.keys.LAHAN).length;
            const totalPanen = DB.getAll(DB.keys.PANEN).length;

            statsHTML += createStatCard('Total Petani', totalPetani, 'fa-users');
            statsHTML += createStatCard('Total Lahan', totalLahan, 'fa-layer-group');
            statsHTML += createStatCard('Data Panen', totalPanen, 'fa-seedling');
            statsHTML += createStatCard('Pengumuman', totalPengumuman, 'fa-bullhorn');
        }

        statsGrid.innerHTML = statsHTML;
    }

    // 6. Mobile Sidebar Toggle
    const hamburgerDash = document.getElementById('hamburgerDash');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (hamburgerDash && sidebar && sidebarOverlay) {
        hamburgerDash.addEventListener('click', () => {
            sidebar.classList.add('open');
            sidebarOverlay.classList.add('active');
        });

        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            sidebarOverlay.classList.remove('active');
        });
    }
});

// Utility
function capitalize(s) {
    if (typeof s !== 'string') return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function createStatCard(label, number, icon) {
    return `
        <div class="stat-card">
            <i class="fas ${icon} stat-icon"></i>
            <div class="stat-number">${number}</div>
            <div class="stat-label">${label}</div>
        </div>
    `;
}

// Global Logout function mapped to sidebar button
window.handleLogout = function() {
    if (window.auth) {
        auth.logout();
    }
};


// ==========================================
// PETANI DASHBOARD & PROFILE CONTROLLER
// ==========================================

function getCurrentPetani() {
    const user = window.auth ? auth.getCurrentUser() : null;
    if (!user) return null;
    return window.DB ? DB.getPetaniByUserId(user.id) : null;
}

async function loadPetaniDashboardData() {
    const user = window.auth ? auth.getCurrentUser() : null;
    if (!user || user.role !== 'petani') return;

    let petani = getCurrentPetani();
    if (!petani && window.DB) {
        const allP = DB.getAll(DB.keys.PETANI) || [];
        petani = allP.find(p => (p.user_id && String(p.user_id) === String(user.id)) || (p.nama && user.name && p.nama.toLowerCase() === user.name.toLowerCase()));
    }

    const namaEl = document.getElementById('petaniCardNama');
    const waEl = document.getElementById('petaniCardWa');
    const emailEl = document.getElementById('petaniCardEmail');
    const kelompokEl = document.getElementById('petaniCardKelompok');
    const varietasEl = document.getElementById('petaniCardVarietas');
    const alamatEl = document.getElementById('petaniCardAlamat');
    const luasEl = document.getElementById('petaniCardTotalLuas');
    const avatarBadgeEl = document.getElementById('petaniBadgeAvatar');

    // 1. Tampilkan data dari user session langsung
    if (avatarBadgeEl) avatarBadgeEl.textContent = user.avatar || '🧑‍🌾';
    if (namaEl) namaEl.textContent = user.name || (petani ? petani.nama : 'Petani');
    
    const initialWa = (petani && petani.no_telepon) ? petani.no_telepon : (user.no_telepon || '');
    if (waEl) {
        if (initialWa) {
            waEl.innerHTML = `<a href="https://wa.me/62${initialWa.replace(/^0/, '')}" target="_blank" style="color:#16a34a; text-decoration:none; font-weight:700;"><i class="fab fa-whatsapp"></i> ${initialWa}</a>`;
        } else {
            waEl.innerHTML = '<span style="color:#8aaa9a;">Belum diisi</span>';
        }
    }

    if (emailEl) emailEl.textContent = user.username || user.email || 'petani@desa.id';
    if (varietasEl) varietasEl.textContent = (petani && petani.varietas_padi) ? petani.varietas_padi : (user.varietas_padi || 'Ciherang / Umum');
    if (alamatEl) alamatEl.textContent = (petani && petani.alamat) ? petani.alamat : (user.alamat || 'Desa Cirebon Girang');
    if (kelompokEl) kelompokEl.textContent = (petani && petani.kelompok_nama) ? petani.kelompok_nama : 'Kelompok Tani Makmur';

    // 2. Tarik data lahan realtime dari database MySQL jika online
    const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
    if (isHttp) {
        try {
            const resLahan = await fetch(`api/lahan.php?user_id=${user.id}`);
            if (resLahan.ok) {
                const resLahanData = await resLahan.json();
                if (resLahanData && resLahanData.success && Array.isArray(resLahanData.data) && resLahanData.data.length > 0) {
                    renderPetaniLahanFromList(resLahanData.data);
                } else {
                    renderPetaniLahanTable(petani);
                }
            } else {
                renderPetaniLahanTable(petani);
            }

            // Sync profil petani dari api/sync.php
            const resSync = await fetch('api/sync.php');
            if (resSync.ok) {
                const syncData = await resSync.json();
                if (syncData && syncData.success && syncData.data) {
                    const freshPetani = (syncData.data.petani || []).find(p => 
                        String(p.user_id) === String(user.id) || 
                        (p.nama && user.name && p.nama.toLowerCase() === user.name.toLowerCase())
                    );
                    if (freshPetani) {
                        petani = freshPetani;
                        if (namaEl) namaEl.textContent = freshPetani.nama;
                        if (waEl && freshPetani.no_telepon) {
                            waEl.innerHTML = `<a href="https://wa.me/62${freshPetani.no_telepon.replace(/^0/, '')}" target="_blank" style="color:#16a34a; text-decoration:none; font-weight:700;"><i class="fab fa-whatsapp"></i> ${freshPetani.no_telepon}</a>`;
                        }
                        if (emailEl) emailEl.textContent = user.username || user.email || 'petani@desa.id';
                        if (varietasEl && freshPetani.varietas_padi) varietasEl.textContent = freshPetani.varietas_padi;
                        if (alamatEl && freshPetani.alamat) alamatEl.textContent = freshPetani.alamat;
                        if (kelompokEl) kelompokEl.textContent = freshPetani.kelompok_nama || 'Kelompok Tani Makmur';
                    }
                }
            }
        } catch (e) {
            console.warn('Realtime sync fallback to localStorage:', e);
            renderPetaniLahanTable(petani);
        }
    } else {
        renderPetaniLahanTable(petani);
    }
}

function renderPetaniLahanFromList(lahanList) {
    const tbody = document.getElementById('petaniLahanTableBody');
    const emptyBox = document.getElementById('petaniLahanEmpty');
    const luasEl = document.getElementById('petaniCardTotalLuas');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!Array.isArray(lahanList) || lahanList.length === 0) {
        if (emptyBox) emptyBox.style.display = 'block';
        if (luasEl) luasEl.textContent = '0.00 ha';
        return;
    }

    if (emptyBox) emptyBox.style.display = 'none';

    let totalLuas = 0;
    lahanList.forEach((l, idx) => {
        const luas = parseFloat(l.luas) || 0;
        totalLuas += luas;

        let badgeClass = 'status-aktif';
        if (l.status === 'Masa Tanam') badgeClass = 'status-tanam';
        else if (l.status === 'Masa Istirahat') badgeClass = 'status-istirahat';
        else if (l.status === 'Panen') badgeClass = 'status-panen';

        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #f0f5ee';
        tr.innerHTML = `
            <td style="padding: 12px 14px;">${idx + 1}</td>
            <td style="padding: 12px 14px; font-weight:600; color:#1e3a2f;">${l.lokasi || 'Sawah Cirebon Girang'}</td>
            <td style="padding: 12px 14px; font-weight:700; color:#2d6a4f;">${luas.toFixed(2)} ha</td>
            <td style="padding: 12px 14px;"><span class="status-badge ${badgeClass}">${l.status || 'Aktif'}</span></td>
            <td style="padding: 12px 14px; text-align: center;">
                <button type="button" class="btn-action-sm btn-edit-sm" title="Edit Lahan" onclick="openTambahLahanModal('${l.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button type="button" class="btn-action-sm btn-delete-sm" title="Hapus Lahan" onclick="handleDeleteLahan('${l.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (luasEl) luasEl.textContent = totalLuas.toFixed(2) + ' ha';
}

function renderPetaniLahanTable(petani) {
    const tbody = document.getElementById('petaniLahanTableBody');
    const emptyBox = document.getElementById('petaniLahanEmpty');
    const luasEl = document.getElementById('petaniCardTotalLuas');
    if (!tbody || !window.DB) return;

    tbody.innerHTML = '';
    if (!petani) {
        if (emptyBox) emptyBox.style.display = 'block';
        if (luasEl) luasEl.textContent = '0.00 ha';
        return;
    }

    const lahanList = DB.getLahanByPetani(petani.id) || [];
    renderPetaniLahanFromList(lahanList);
}

// ===== MODAL TAMBAH / EDIT LAHAN =====
window.openTambahLahanModal = function(lahanId = null) {
    console.log('openTambahLahanModal called with ID:', lahanId);
    const modal = document.getElementById('modalTambahLahan');
    if (!modal) {
        console.error('Modal #modalTambahLahan not found in DOM!');
        alert('Modal tambah lahan tidak ditemukan!');
        return;
    }

    modal.classList.add('active');
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('z-index', '999999', 'important');

    const form = document.getElementById('formTambahLahan');
    if (form) form.reset();

    const titleEl = document.getElementById('modalLahanTitle');
    const editIdEl = document.getElementById('lahanEditId');
    const lokasiEl = document.getElementById('lahanLokasi');
    const luasEl = document.getElementById('lahanLuas');
    const statusEl = document.getElementById('lahanStatus');

    if (lahanId) {
        if (titleEl) titleEl.innerHTML = '<i class="fas fa-edit" style="color:#2d6a4f;"></i> Edit Data Lahan';
        if (editIdEl) editIdEl.value = lahanId;
        if (window.DB) {
            const l = DB.getById(DB.keys.LAHAN, lahanId);
            if (l) {
                if (lokasiEl) lokasiEl.value = l.lokasi || '';
                if (luasEl) luasEl.value = l.luas || '';
                if (statusEl) statusEl.value = l.status || 'Aktif';
            }
        }
    } else {
        if (titleEl) titleEl.innerHTML = '<i class="fas fa-plus-circle" style="color:#2d6a4f;"></i> Tambah Lahan Baru';
        if (editIdEl) editIdEl.value = '';
    }

    setTimeout(() => {
        if (lokasiEl) lokasiEl.focus();
    }, 100);
};

window.closeTambahLahanModal = function() {
    const modal = document.getElementById('modalTambahLahan');
    if (modal) {
        modal.classList.remove('active');
        modal.style.setProperty('display', 'none', 'important');
    }
};

// ==========================================
// NOTIFICATION SYSTEM & BELL CONTROLLER
// ==========================================
const NOTIF_STORAGE_KEY = 'db_notifications';

function getStoredNotifications() {
    try {
        const stored = localStorage.getItem(NOTIF_STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {}

    const defaults = [
        {
            id: 'notif_welcome',
            title: 'Selamat Datang di Platform Padi! 🌾',
            message: 'Akun Anda telah aktif dan terhubung ke sistem pertanian Desa Cirebon Girang.',
            time: 'Baru saja',
            date: 'Hari ini',
            unread: true,
            icon: 'fas fa-seedling',
            iconClass: 'notif-icon-lahan'
        },
        {
            id: 'notif_wa_active',
            title: 'WhatsApp Gateway Terhubung 📲',
            message: 'Gateway Fonnte aktif. Setiap kali Anda menambah petak lahan, konfirmasi instan dikirim via WhatsApp.',
            time: 'Aktif',
            date: 'Hari ini',
            unread: false,
            icon: 'fab fa-whatsapp',
            iconClass: 'notif-icon-wa'
        }
    ];
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
}

function saveStoredNotifications(notifs) {
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifs));
}

function addSystemNotification(notif) {
    const list = getStoredNotifications();
    const newNotif = {
        id: 'notif_' + Date.now(),
        title: notif.title || 'Notifikasi Baru',
        message: notif.message || '',
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        unread: true,
        icon: notif.icon || 'fas fa-bell',
        iconClass: notif.iconClass || 'notif-icon-info',
        ...notif
    };
    list.unshift(newNotif);
    if (list.length > 25) list.pop();
    saveStoredNotifications(list);
    renderNotificationList();
    showToastNotification(newNotif.title, newNotif.message);
}

function renderNotificationList() {
    const listEl = document.getElementById('notifList');
    const badgeEl = document.getElementById('notifBadge');
    if (!listEl) return;

    const notifs = getStoredNotifications();
    const unreadCount = notifs.filter(n => n.unread).length;

    if (badgeEl) {
        if (unreadCount > 0) {
            badgeEl.textContent = unreadCount > 9 ? '9+' : unreadCount;
            badgeEl.style.display = 'flex';
        } else {
            badgeEl.style.display = 'none';
        }
    }

    if (notifs.length === 0) {
        listEl.innerHTML = `
            <div class="notif-empty">
                <i class="fas fa-bell-slash" style="font-size:28px; margin-bottom:8px; display:block; color:#a5d6a7;"></i>
                Tidak ada notifikasi saat ini
            </div>
        `;
        return;
    }

    listEl.innerHTML = notifs.map(n => `
        <div class="notif-item ${n.unread ? 'unread' : ''}" onclick="markNotificationAsRead('${n.id}')">
            <div class="notif-item-icon ${n.iconClass || 'notif-icon-lahan'}">
                <i class="${n.icon || 'fas fa-bell'}"></i>
            </div>
            <div class="notif-item-body">
                <div class="notif-item-title">${n.title}</div>
                <div class="notif-item-text">${n.message}</div>
                <div class="notif-item-time">
                    <i class="far fa-clock"></i> ${n.date} &bull; ${n.time}
                </div>
            </div>
        </div>
    `).join('');
}

window.goToNotifikasiSection = function() {
    const sec = document.getElementById('pesananSection');
    if (sec) {
        sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        sec.style.transition = 'all 0.5s ease';
        sec.style.boxShadow = '0 0 0 4px #2d6a4f, 0 10px 30px rgba(45, 106, 79, 0.2)';
        sec.style.borderRadius = '20px';
        setTimeout(() => {
            sec.style.boxShadow = '';
        }, 2500);
    } else {
        const isInsidePages = window.location.pathname.includes('/pages/');
        window.location.href = isInsidePages ? 'status-pesanan.html' : 'pages/status-pesanan.html';
    }
};

window.toggleNotificationDropdown = function() {
    const dropdown = document.getElementById('notifDropdown');
    if (!dropdown) return;
    dropdown.classList.toggle('show');
};

window.clearNotifications = function() {
    const notifs = getStoredNotifications();
    notifs.forEach(n => n.unread = false);
    saveStoredNotifications(notifs);
    renderNotificationList();
};

window.markNotificationAsRead = function(id) {
    const notifs = getStoredNotifications();
    const item = notifs.find(n => n.id === id);
    if (item) {
        item.unread = false;
        saveStoredNotifications(notifs);
        renderNotificationList();
    }
};

document.addEventListener('click', function(e) {
    const wrapper = document.getElementById('notifWrapper');
    const dropdown = document.getElementById('notifDropdown');
    if (wrapper && dropdown && !wrapper.contains(e.target)) {
        dropdown.classList.remove('show');
    }
});

function showToastNotification(title, message) {
    const toastBox = document.getElementById('psToastBox');
    if (!toastBox) return;
    const toast = document.createElement('div');
    toast.className = 'ps-toast';
    toast.style.background = 'linear-gradient(135deg, #1e3a2f, #2d6a4f)';
    toast.style.color = '#fff';
    toast.style.border = '1px solid #40916c';
    toast.innerHTML = `
        <div class="ps-toast-ico" style="font-size:22px;">🌾</div>
        <div style="flex:1;">
            <div class="ps-toast-title" style="color:#fff; font-weight:700;">${title}</div>
            <div class="ps-toast-msg" style="color:#d8f3dc; font-size:12px;">${message}</div>
        </div>
        <button class="ps-toast-x" style="color:#fff;" onclick="this.parentElement.remove()">&#x2715;</button>
    `;
    toastBox.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(40px)';
            toast.style.transition = '0.3s';
            setTimeout(() => toast.remove(), 300);
        }
    }, 5500);
}

// ===== HANDLE SAVE LAHAN (DATABASE MYSQL & WHATSAPP) =====
window.handleSaveLahan = async function(e) {
    e.preventDefault();
    const editId = document.getElementById('lahanEditId').value;
    const lokasi = document.getElementById('lahanLokasi').value.trim();
    const luas = parseFloat(document.getElementById('lahanLuas').value) || 0;
    const status = document.getElementById('lahanStatus').value;
    const sendWaCheckbox = document.getElementById('lahanSendWa');
    const sendWa = sendWaCheckbox ? sendWaCheckbox.checked : true;

    if (!lokasi || luas <= 0) {
        alert('Mohon isi lokasi lahan dan luas lahan yang valid (> 0)!');
        return;
    }

    const saveBtn = document.getElementById('btnSaveLahan');
    const originalBtnText = saveBtn ? saveBtn.innerHTML : '';
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan ke Database & WA...';
    }

    const user = window.auth ? auth.getCurrentUser() : null;
    if (!user) return;

    let petani = getCurrentPetani();
    const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';

    try {
        if (editId) {
            // ===== 1. UPDATE LAHAN =====
            if (isHttp) {
                const isPagesDir = window.location.pathname.includes('/pages/');
                const apiUrl = isPagesDir ? '../api/lahan.php' : 'api/lahan.php';
                await fetch(apiUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: parseInt(editId),
                        lokasi: lokasi,
                        luas: luas,
                        status: status
                    })
                });
            }

            if (window.LahanManager) {
                LahanManager.update(editId, { lokasi, luas, status });
            }

            addSystemNotification({
                title: 'Data Lahan Diperbarui 🌾',
                message: `Lahan di "${lokasi}" (${luas.toFixed(2)} Ha) berhasil diperbarui di database.`,
                icon: 'fas fa-edit',
                iconClass: 'notif-icon-lahan'
            });

            showToastNotification('✅ Lahan Diperbarui!', `Data petak lahan di "${lokasi}" telah disimpan.`);

        } else {
            // ===== 2. TAMBAH LAHAN BARU (KE DATABASE MYSQL & FONNTE WA) =====
            let apiResData = null;
            if (isHttp) {
                const isPagesDir = window.location.pathname.includes('/pages/');
                const apiUrl = isPagesDir ? '../api/lahan.php' : 'api/lahan.php';
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        petani_id: (petani && isFinite(petani.id)) ? parseInt(petani.id) : null,
                        user_id: user.id ? parseInt(user.id) : null,
                        lokasi: lokasi,
                        luas: luas,
                        status: status,
                        no_telepon: (petani && petani.no_telepon) ? petani.no_telepon : ''
                    })
                });
                apiResData = await response.json();
            }

            const newLahanId = (apiResData && apiResData.data && apiResData.data.lahan) 
                ? apiResData.data.lahan.id 
                : (Date.now());

            // Sync with local storage
            if (petani) {
                const newLahanObj = {
                    id: newLahanId,
                    petani_id: petani.id,
                    lokasi: lokasi,
                    luas: luas,
                    status: status,
                    created_at: new Date().toISOString()
                };
                DB.create(DB.keys.LAHAN, newLahanObj);

                const newTotal = (apiResData && apiResData.data && apiResData.data.lahan && apiResData.data.lahan.total_luas_petani)
                    ? apiResData.data.lahan.total_luas_petani
                    : ((parseFloat(petani.luas_lahan) || 0) + luas);
                DB.update(DB.keys.PETANI, petani.id, { luas_lahan: newTotal });
            }

            const waSent = apiResData && apiResData.data && apiResData.data.wa_sent;
            const waTarget = (apiResData && apiResData.data && apiResData.data.wa_target) || (petani ? petani.no_telepon : '');

            addSystemNotification({
                title: 'Lahan Baru Berhasil Ditambahkan! 🌾',
                message: `Petak sawah seluas ${luas.toFixed(2)} Ha di "${lokasi}" telah terhubung ke database.${waSent ? ' Notifikasi WhatsApp telah dikirimkan ke ' + waTarget + ' 📲' : ''}`,
                icon: 'fas fa-layer-group',
                iconClass: 'notif-icon-lahan'
            });

            showToastNotification('🌾 Lahan Berhasil Ditambahkan!', `Tersimpan di database.${waSent ? ' Notifikasi WhatsApp terkirim ke ' + waTarget + ' 📲' : ''}`);
        }

        closeTambahLahanModal();
        if (typeof DB.syncFromMySQL === 'function') {
            DB.syncFromMySQL();
        }

        setTimeout(() => {
            loadPetaniDashboardData();
            window.location.reload();
        }, 1200);

    } catch (err) {
        console.error('Error saving lahan:', err);
        alert('Terjadi kesalahan saat menyimpan lahan: ' + err.message);
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnText;
        }
    }
};

window.handleDeleteLahan = async function(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus data petak lahan ini dari database?')) return;
    
    const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
    if (isHttp && isFinite(id)) {
        try {
            const isPagesDir = window.location.pathname.includes('/pages/');
            const apiUrl = isPagesDir ? '../api/lahan.php?id=' + id : 'api/lahan.php?id=' + id;
            await fetch(apiUrl, { method: 'DELETE' });
        } catch (e) {
            console.warn('API delete lahan error:', e);
        }
    }

    if (window.LahanManager) {
        LahanManager.delete(id);
    }

    addSystemNotification({
        title: 'Data Lahan Dihapus 🗑️',
        message: 'Satu petak lahan telah dihapus dari database sistem.',
        icon: 'fas fa-trash',
        iconClass: 'notif-icon-info'
    });

    showToastNotification('Data Lahan Dihapus', 'Petak lahan telah dihapus dari sistem.');
    setTimeout(() => {
        loadPetaniDashboardData();
        window.location.reload();
    }, 800);
};

// ===== MODAL EDIT PROFIL (ADAPTIVE UNTUK ADMIN, PERANGKAT, & PETANI) =====
window.prefillEditProfileModal = function() {
    const modal = document.getElementById('modalEditProfile');
    const form = document.getElementById('formEditProfile');
    if (!modal || !form) return;

    const user = window.auth ? auth.getCurrentUser() : null;
    if (!user) return;
    const role = (user.role || 'petani').toLowerCase();
    const petani = typeof getCurrentPetani === 'function' ? getCurrentPetani() : null;

    // Header & Role UI
    const modalTitle = document.getElementById('modalEditProfileTitle');
    const rowPetani = document.getElementById('rowPetaniOnlyFields');

    if (modalTitle) {
        if (role === 'admin') {
            modalTitle.innerHTML = '<i class="fas fa-user-shield" style="color: #2d6a4f;"></i> Edit Profil Admin';
        } else if (role === 'perangkat' || role === 'desa') {
            modalTitle.innerHTML = '<i class="fas fa-landmark" style="color: #1a56db;"></i> Edit Profil Perangkat Desa';
        } else {
            modalTitle.innerHTML = '<i class="fas fa-user-edit" style="color: #2d6a4f;"></i> Edit Profil Petani';
        }
    }

    if (rowPetani) {
        if (role === 'petani') {
            rowPetani.style.display = 'grid';
        } else {
            rowPetani.style.display = 'none';
        }
    }

    // Populate Fields
    const profNama = document.getElementById('profNama');
    const profWa = document.getElementById('profWa');
    const profEmail = document.getElementById('profEmail');
    const profVarietas = document.getElementById('profVarietas');
    const profKelompok = document.getElementById('profKelompok');
    const profAvatar = document.getElementById('profAvatar');
    const profAlamat = document.getElementById('profAlamat');
    const profPassword = document.getElementById('profPassword');

    if (profNama) profNama.value = user.name || (petani ? petani.nama : '');
    if (profWa) profWa.value = user.no_telepon || (petani && petani.no_telepon ? petani.no_telepon : '');
    if (profEmail) profEmail.value = user.username || '';
    if (profAlamat) profAlamat.value = (petani && petani.alamat) ? petani.alamat : (user.alamat || '');
    if (profAvatar) profAvatar.value = user.avatar || (role === 'admin' ? '👑' : (role === 'perangkat' || role === 'desa' ? '🏛️' : '🧑‍🌾'));
    if (profPassword) profPassword.value = '';

    if (role === 'petani') {
        if (profVarietas) profVarietas.value = (petani && petani.varietas_padi) ? petani.varietas_padi : 'Ciherang';
        if (profKelompok && window.DB) {
            const kelompoks = DB.getAll(DB.keys.KELOMPOK_TANI) || [];
            profKelompok.innerHTML = '<option value="">-- Pilih Kelompok Tani --</option>';
            kelompoks.forEach(k => {
                const isSel = petani && String(petani.kelompok_tani_id) === String(k.id) ? 'selected' : '';
                profKelompok.innerHTML += `<option value="${k.id}" ${isSel}>${k.nama}</option>`;
            });
        }
    }
};

window.openEditProfileModal = function() {
    const modal = document.getElementById('modalEditProfile');
    if (!modal) return;
    if (typeof window.prefillEditProfileModal === 'function') {
        window.prefillEditProfileModal();
    }
    modal.classList.add('active');
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('z-index', '999999', 'important');
};

window.closeEditProfileModal = function() {
    const modal = document.getElementById('modalEditProfile');
    if (modal) {
        modal.classList.remove('active');
        modal.style.setProperty('display', 'none', 'important');
    }
};

window.handleSaveProfile = async function(e) {
    e.preventDefault();
    const user = window.auth ? auth.getCurrentUser() : null;
    if (!user) return;
    const role = (user.role || 'petani').toLowerCase();

    const nama = document.getElementById('profNama') ? document.getElementById('profNama').value.trim() : '';
    const wa = document.getElementById('profWa') ? document.getElementById('profWa').value.trim() : '';
    const email = document.getElementById('profEmail') ? document.getElementById('profEmail').value.trim().toLowerCase() : '';
    const avatar = document.getElementById('profAvatar') ? document.getElementById('profAvatar').value : '👤';
    const alamat = document.getElementById('profAlamat') ? document.getElementById('profAlamat').value.trim() : '';
    const newPassword = document.getElementById('profPassword') ? document.getElementById('profPassword').value.trim() : '';

    if (!nama) {
        alert('Nama lengkap tidak boleh kosong!');
        return;
    }

    const btnSave = document.getElementById('btnSaveProfile');
    if (btnSave) {
        btnSave.disabled = true;
        btnSave.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    }

    try {
        // 1. Update Petani Record if role is petani
        if (role === 'petani') {
            const varietas = document.getElementById('profVarietas') ? document.getElementById('profVarietas').value.trim() : '';
            const kelompokId = document.getElementById('profKelompok') ? document.getElementById('profKelompok').value : null;

            let petani = typeof getCurrentPetani === 'function' ? getCurrentPetani() : null;
            const petaniData = {
                nama: nama,
                no_telepon: wa,
                nik: '',
                varietas_padi: varietas,
                kelompok_tani_id: kelompokId ? (parseInt(kelompokId) || kelompokId) : null,
                alamat: alamat,
                user_id: user.id
            };

            if (petani) {
                DB.update(DB.keys.PETANI, petani.id, petaniData);
            } else {
                petani = {
                    id: DB.generateId('petani'),
                    ...petaniData,
                    luas_lahan: 0,
                    created_at: new Date().toISOString()
                };
                DB.create(DB.keys.PETANI, petani);
            }
            if (typeof DB.pushToMySQL === 'function') {
                DB.pushToMySQL('save', 'petani', { id: petani.id, ...petaniData });
            }
        }

        // 2. Update User Record
        const userUpdates = {
            name: nama,
            username: email || user.username,
            no_telepon: wa,
            avatar: avatar,
            alamat: alamat
        };
        if (newPassword) {
            userUpdates.password = newPassword;
        }

        DB.update(DB.keys.USERS, user.id, userUpdates);

        // Update active session in localStorage
        const sessRaw = localStorage.getItem('padi_desa_session');
        if (sessRaw) {
            try {
                const sess = JSON.parse(sessRaw);
                if (sess && sess.user) {
                    sess.user.name = nama;
                    sess.user.username = email || user.username;
                    sess.user.no_telepon = wa;
                    sess.user.avatar = avatar;
                    localStorage.setItem('padi_desa_session', JSON.stringify(sess));
                }
            } catch (err) {}
        }

        // Sync user update to MySQL api/users.php
        await fetch('api/users.php', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: user.id,
                name: nama,
                username: email || user.username,
                no_telepon: wa,
                avatar: avatar,
                password: newPassword || undefined
            })
        }).catch(e => console.warn('Sync MySQL user error:', e));

        const roleLabel = role === 'admin' ? 'Admin' : (role === 'perangkat' || role === 'desa' ? 'Perangkat Desa' : 'Petani');
        alert(`✅ Profil ${roleLabel} berhasil diperbarui dan tersimpan ke database!`);

        closeEditProfileModal();
        if (typeof loadPetaniDashboardData === 'function') {
            loadPetaniDashboardData();
        }
        window.location.reload();
    } catch (err) {
        console.error('Error saving profile:', err);
        alert('Terjadi kesalahan saat menyimpan profil: ' + err.message);
    } finally {
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.innerHTML = '<i class="fas fa-save"></i> Simpan Profil';
        }
    }
};

// ===== MODAL GANTI / LUPA PASSWORD (SEMUA ROLE) =====
window.openGantiPasswordModal = function() {
    const modal = document.getElementById('modalGantiPassword');
    if (!modal) return;
    const formNormal = document.getElementById('formGantiPassword');
    const formLupa = document.getElementById('formLupaPasswordDashboard');
    if (formNormal) formNormal.reset();
    if (formLupa) formLupa.reset();

    if (typeof switchPwdMode === 'function') {
        switchPwdMode('normal');
    }

    modal.classList.add('active');
    modal.style.setProperty('display', 'flex', 'important');
    modal.style.setProperty('z-index', '999999', 'important');
    setTimeout(() => {
        const oldEl = document.getElementById('pwdOld');
        if (oldEl) oldEl.focus();
    }, 100);
};

window.switchPwdMode = function(mode) {
    const formNormal = document.getElementById('formGantiPassword');
    const formLupa = document.getElementById('formLupaPasswordDashboard');
    const tabNormal = document.getElementById('tabGantiNormal');
    const tabLupa = document.getElementById('tabGantiLupa');
    const headerTitle = document.getElementById('modalPwdHeaderTitle');
    const user = window.auth ? auth.getCurrentUser() : null;

    if (mode === 'lupa') {
        if (formNormal) formNormal.style.display = 'none';
        if (formLupa) formLupa.style.display = 'block';
        if (headerTitle) headerTitle.innerHTML = '<i class="fas fa-shield-alt" style="color: #2563eb;"></i> Reset Kata Sandi (Lupa Sandi)';
        
        if (tabNormal) {
            tabNormal.style.background = 'transparent';
            tabNormal.style.color = '#5a7a6a';
            tabNormal.style.boxShadow = 'none';
            tabNormal.style.fontWeight = '600';
        }
        if (tabLupa) {
            tabLupa.style.background = '#fff';
            tabLupa.style.color = '#1e3a2f';
            tabLupa.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
            tabLupa.style.fontWeight = '700';
        }

        const emailInput = document.getElementById('lupaDashEmail');
        if (emailInput && user) {
            emailInput.value = user.username || user.email || '';
        }
        const waInput = document.getElementById('lupaDashWa');
        if (waInput && user && user.no_telepon) {
            waInput.placeholder = 'Contoh: ' + user.no_telepon;
        }
        setTimeout(() => {
            if (waInput) waInput.focus();
        }, 100);
    } else {
        if (formNormal) formNormal.style.display = 'block';
        if (formLupa) formLupa.style.display = 'none';
        if (headerTitle) headerTitle.innerHTML = '<i class="fas fa-key" style="color: #2d6a4f;"></i> Ganti Kata Sandi';

        if (tabNormal) {
            tabNormal.style.background = '#fff';
            tabNormal.style.color = '#1e3a2f';
            tabNormal.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
            tabNormal.style.fontWeight = '700';
        }
        if (tabLupa) {
            tabLupa.style.background = 'transparent';
            tabLupa.style.color = '#5a7a6a';
            tabLupa.style.boxShadow = 'none';
            tabLupa.style.fontWeight = '600';
        }
        setTimeout(() => {
            const oldEl = document.getElementById('pwdOld');
            if (oldEl) oldEl.focus();
        }, 100);
    }
};

window.handleResetLupaPasswordDashboard = async function(e) {
    e.preventDefault();
    const user = window.auth ? auth.getCurrentUser() : null;
    const email = document.getElementById('lupaDashEmail').value.trim() || (user ? user.username : '');
    const noWa = document.getElementById('lupaDashWa').value.trim();
    const newPwd = document.getElementById('lupaDashNewPwd').value;
    const confirmPwd = document.getElementById('lupaDashConfirmPwd').value;
    const submitBtn = document.getElementById('btnSubmitLupaDash');

    if (!email || !noWa) {
        alert('Mohon masukkan nomor WhatsApp terdaftar Anda!');
        return;
    }

    if (newPwd.length < 5) {
        alert('Kata sandi baru minimal harus 5 karakter!');
        return;
    }

    if (newPwd !== confirmPwd) {
        alert('Konfirmasi kata sandi tidak cocok!');
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mereset Sandi...';
    }

    try {
        const isPagesDir = window.location.pathname.includes('/pages/');
        const apiUrl = isPagesDir ? '../api/auth.php?action=forgot_password' : 'api/auth.php?action=forgot_password';

        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                no_wa: noWa,
                new_password: newPwd
            })
        });

        const rawText = await res.text();
        let data = null;
        try {
            data = JSON.parse(rawText);
        } catch (jsonErr) {
            console.error('Raw response was not JSON:', rawText);
        }

        if (data && data.success) {
            alert('🎉 Berhasil! Kata sandi baru Anda telah berhasil direset dan disimpan ke database MySQL.');
            closeGantiPasswordModal();
            // Update local users table if exists
            if (window.DB && user) {
                const allUsers = DB.getAll(DB.keys.USERS) || [];
                const targetU = allUsers.find(u => String(u.id) === String(user.id));
                if (targetU) {
                    targetU.password = newPwd;
                    localStorage.setItem(DB.keys.USERS, JSON.stringify(allUsers));
                }
            }
        } else {
            alert('❌ ' + ((data && data.message) ? data.message : 'Verifikasi nomor WhatsApp gagal atau server bermasalah!'));
        }
    } catch (err) {
        console.error('Reset error:', err);
        alert('Terjadi kesalahan koneksi ke server.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Reset & Simpan Sandi';
        }
    }
};

window.closeGantiPasswordModal = function() {
    const modal = document.getElementById('modalGantiPassword');
    if (modal) {
        modal.classList.remove('active');
        modal.style.setProperty('display', 'none', 'important');
    }
};

window.togglePwdVisibility = function(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        if (icon) icon.className = 'fas fa-eye';
    }
};

window.handleSaveGantiPassword = async function(e) {
    e.preventDefault();
    const user = window.auth ? auth.getCurrentUser() : null;
    if (!user) {
        alert('Sesi login telah berakhir. Silakan login kembali.');
        window.location.href = 'login.html';
        return;
    }

    const oldPassword = document.getElementById('pwdOld').value;
    const newPassword = document.getElementById('pwdNew').value;
    const confirmPassword = document.getElementById('pwdConfirm').value;

    if (newPassword.length < 5) {
        alert('Kata sandi baru minimal harus 5 karakter!');
        return;
    }

    if (newPassword !== confirmPassword) {
        alert('Konfirmasi kata sandi tidak cocok dengan kata sandi baru!');
        return;
    }

    const submitBtn = document.getElementById('btnSubmitGantiPwd');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
    }

    try {
        const isPagesDir = window.location.pathname.includes('/pages/');
        const apiUrl = isPagesDir ? '../api/auth.php?action=change_password' : 'api/auth.php?action=change_password';
        
        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: user.id,
                old_password: oldPassword,
                new_password: newPassword
            })
        });

        const data = await res.json();
        if (data.success) {
            alert('✅ Berhasil! Kata sandi baru Anda telah disimpan ke database MySQL.');
            closeGantiPasswordModal();
            // Update local users table if exists
            if (window.DB) {
                const allUsers = DB.getAll(DB.keys.USERS) || [];
                const targetU = allUsers.find(u => String(u.id) === String(user.id));
                if (targetU) {
                    targetU.password = newPassword;
                    localStorage.setItem(DB.keys.USERS, JSON.stringify(allUsers));
                }
            }
        } else {
            alert('❌ ' + (data.message || 'Gagal mengubah kata sandi!'));
        }
    } catch (err) {
        console.error('Change password error:', err);
        alert('Terjadi kesalahan koneksi saat memperbarui kata sandi.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Sandi Baru';
        }
    }
};

// Auto check url query for action triggers (e.g. ?action=tambah-lahan or ?action=edit-profil or ?action=ganti-password)
document.addEventListener('DOMContentLoaded', () => {
    if (typeof renderNotificationList === 'function') {
        renderNotificationList();
    }
    loadPetaniDashboardData();
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'tambah-lahan') {
        setTimeout(openTambahLahanModal, 300);
    } else if (urlParams.get('action') === 'edit-profil') {
        setTimeout(openEditProfileModal, 300);
    } else if (urlParams.get('action') === 'ganti-password') {
        setTimeout(openGantiPasswordModal, 300);
    } else if (urlParams.get('action') === 'notifikasi' || urlParams.get('section') === 'pesanan' || window.location.hash === '#pesananSection') {
        setTimeout(() => {
            if (typeof goToNotifikasiSection === 'function') goToNotifikasiSection();
        }, 400);
    }
});
