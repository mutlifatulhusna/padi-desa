/**
 * ========================================
 * AUTHENTICATION SYSTEM
 * Platform Padi Desa Cirebon Girang
 * ========================================
 */

// ===== USER DATABASE (Mock & Sync with LocalStorage DB) =====
const DEFAULT_USERS = [
    {
        id: 1,
        username: 'admin@desa.id',
        password: 'admin123',
        name: 'Admin Desa',
        role: 'admin',
        roleLabel: 'Admin',
        avatar: '👨‍💼'
    },
    {
        id: 2,
        username: 'perangkat@desa.id',
        password: 'perangkat123',
        name: 'Perangkat Desa',
        role: 'perangkat',
        roleLabel: 'Perangkat Desa',
        avatar: '👨‍💻'
    },
    {
        id: 4,
        username: 'petani@desa.id',
        password: 'petani123',
        name: 'Petani',
        role: 'petani',
        roleLabel: 'Petani',
        avatar: '🧑‍🌾'
    }
];

function getUsersList() {
    try {
        const stored = localStorage.getItem('db_users');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Pastikan password bawaan tetap ada jika db_users tidak menyimpan password
                return parsed.map(u => {
                    const def = DEFAULT_USERS.find(d => 
                        (d.username && u.username && d.username.toLowerCase() === u.username.toLowerCase()) || 
                        d.id === u.id
                    );
                    return {
                        ...def,
                        ...u,
                        password: u.password || (def ? def.password : '123456')
                    };
                });
            }
        }
    } catch (e) {}
    return DEFAULT_USERS;
}

// ===== SESSION KEYS =====
const SESSION_KEY = 'padi_desa_session';

// ===== DOM REFS =====
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const alertBox = document.getElementById('loginAlert');

// ===== UTILITY FUNCTIONS =====
function showAlert(message, type = 'error') {
    alertBox.textContent = message;
    alertBox.className = `alert ${type}`;
    alertBox.style.display = 'block';

    // Auto hide after 5 seconds
    clearTimeout(alertBox._timer);
    alertBox._timer = setTimeout(() => {
        alertBox.style.display = 'none';
    }, 5000);
}

function hideAlert() {
    alertBox.style.display = 'none';
    alertBox.className = 'alert';
}

function setLoading(isLoading) {
    if (isLoading) {
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
    } else {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk';
    }
}

// ===== SESSION MANAGEMENT =====
function saveSession(user) {
    const sessionData = {
        user: user,
        loginAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // 8 hours
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
}

function getSession() {
    try {
        const data = localStorage.getItem(SESSION_KEY);
        if (!data) return null;

        const session = JSON.parse(data);

        // Check expiration
        if (new Date(session.expiresAt) < new Date()) {
            clearSession();
            return null;
        }

        return session;
    } catch (e) {
        return null;
    }
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('padi_desa_token');
}

function getCurrentUser() {
    const session = getSession();
    return session ? session.user : null;
}

function isLoggedIn() {
    return getCurrentUser() !== null;
}

function redirectToDashboard() {
    window.location.href = 'dashboard.html';
}

function redirectToLogin() {
    window.location.href = 'login.html';
}

// ===== LOGIN FUNCTION =====
function login(username, password) {
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    // Map password resmi akun demo
    const demoMap = {
        'admin@desa.id': 'admin123',
        'perangkat@desa.id': 'perangkat123',
        'petani@desa.id': 'petani123'
    };

    const users = getUsersList();
    const user = users.find(u => (u.username || '').trim().toLowerCase() === cleanUser);

    if (user) {
        const expectedPass = demoMap[cleanUser] || user.password || '123456';
        if (cleanPass === expectedPass || (demoMap[cleanUser] && cleanPass === demoMap[cleanUser])) {
            const { password: _, ...safeUser } = user;
            saveSession(safeUser);
            return {
                success: true,
                message: `Selamat datang, ${safeUser.name}!`,
                user: safeUser
            };
        }
    }

    // Direct fallback ke DEFAULT_USERS jika db_users di localStorage kosong atau termodifikasi
    const defUser = DEFAULT_USERS.find(d => d.username.toLowerCase() === cleanUser);
    if (defUser && (cleanPass === defUser.password || cleanPass === demoMap[cleanUser])) {
        const { password: _, ...safeUser } = defUser;
        saveSession(safeUser);
        return {
            success: true,
            message: `Selamat datang, ${safeUser.name}!`,
            user: safeUser
        };
    }

    return {
        success: false,
        message: 'Email/username atau password salah. Silakan coba lagi.'
    };
}

// ===== LOGOUT FUNCTION =====
function logout() {
    clearSession();
    redirectToLogin();
}

// ===== HANDLE LOGIN FORM =====
if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        hideAlert();

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        // Validation
        if (!username || !password) {
            showAlert('Silakan isi email dan password terlebih dahulu.', 'error');
            return;
        }

        // Process login
        setLoading(true);

        // 1. Coba verifikasi langsung ke Backend MySQL (api/auth.php?login)
        const isHttp = window.location.protocol === 'http:' || window.location.protocol === 'https:';
        if (isHttp) {
            try {
                const isPagesDir = window.location.pathname.includes('/pages/');
                const authApiUrl = isPagesDir ? '../api/auth.php?login' : 'api/auth.php?login';
                const response = await fetch(authApiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                if (response.ok) {
                    const resData = await response.json();
                    if (resData && resData.success && resData.data && resData.data.user) {
                        const dbUser = resData.data.user;
                        dbUser.roleLabel = dbUser.role_label || dbUser.roleLabel || dbUser.role;
                        saveSession(dbUser);
                        if (resData.data.token) {
                            localStorage.setItem('padi_desa_token', resData.data.token);
                        }
                        showAlert(`Selamat datang, ${dbUser.name}!`, 'success');
                        setTimeout(() => {
                            redirectToDashboard();
                        }, 600);
                        return;
                    }
                }
            } catch (err) {
                console.warn('API auth error, using offline verification:', err);
            }
        }

        // 2. Fallback verifikasi lokal / offline
        setTimeout(() => {
            const result = login(username, password);

            if (result.success) {
                showAlert(result.message, 'success');
                setTimeout(() => {
                    redirectToDashboard();
                }, 600);
            } else {
                showAlert(result.message, 'error');
                setLoading(false);
                passwordInput.value = '';
                passwordInput.focus();
            }
        }, 300);
    });

    // Enter key support
    passwordInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });

    // Check if already logged in
    if (isLoggedIn()) {
        redirectToDashboard();
    }
}

// ===== EXPOSE FOR GLOBAL USE =====
window.auth = {
    login,
    logout,
    getCurrentUser,
    isLoggedIn,
    getSession,
    clearSession,
    redirectToDashboard,
    redirectToLogin
};

// ===== AUTO-LOGOUT ON INACTIVITY (optional) =====
let inactivityTimer;
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    if (isLoggedIn()) {
        inactivityTimer = setTimeout(() => {
            if (isLoggedIn()) {
                alert('Sesi Anda telah berakhir karena tidak ada aktivitas.');
                logout();
            }
        }, INACTIVITY_TIMEOUT);
    }
}

// Track user activity
document.addEventListener('click', resetInactivityTimer);
document.addEventListener('keypress', resetInactivityTimer);
document.addEventListener('scroll', resetInactivityTimer);
document.addEventListener('mousemove', resetInactivityTimer);

// Start timer if logged in
if (isLoggedIn()) {
    resetInactivityTimer();
}

console.log('🔐 Auth system initialized.');
console.log('📝 Demo users:', getUsersList().map(u => ({ username: u.username, role: u.role })));