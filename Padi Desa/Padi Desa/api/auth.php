<?php
/**
 * ========================================
 * AUTHENTICATION & PASSWORD MANAGEMENT API
 * Platform Padi Desa Cirebon Girang
 * ========================================
 */

require_once 'config.php';
require_once 'db.php';

// Helper to normalize Indonesian phone numbers
function normalizePhoneNumber($phone) {
    $cleaned = preg_replace('/[^0-9]/', '', (string)$phone);
    if (str_starts_with($cleaned, '62')) {
        $cleaned = '0' . substr($cleaned, 2);
    }
    return $cleaned;
}

// ===== 1. REGISTER (PENDAFTARAN AKUN PETANI / USER TANPA NIK) =====
if ($_SERVER['REQUEST_METHOD'] === 'POST' && (isset($_GET['register']) || (isset($_GET['action']) && $_GET['action'] === 'register'))) {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?: [];
    if (empty($input) && !empty($_POST)) {
        $input = $_POST;
    }
    
    validateRequired($input, ['username', 'password', 'name']);
    
    $username = trim(sanitize($input['username']));
    $rawPassword = $input['password'];
    $name = trim(sanitize($input['name']));
    $noTelepon = isset($input['no_telepon']) ? trim(sanitize($input['no_telepon'])) : (isset($input['telepon']) ? trim(sanitize($input['telepon'])) : '');
    $noTelepon = normalizePhoneNumber($noTelepon);
    $alamat = isset($input['alamat']) ? trim(sanitize($input['alamat'])) : '';
    $kelompokTaniId = (!empty($input['kelompok_tani_id']) && is_numeric($input['kelompok_tani_id'])) ? (int)$input['kelompok_tani_id'] : null;
    $luasLahan = isset($input['luas_lahan']) ? (float)$input['luas_lahan'] : 0.0;
    $varietasPadi = !empty($input['varietas_padi']) ? trim(sanitize($input['varietas_padi'])) : 'Ciherang';
    $role = 'petani';
    $roleLabel = 'Petani';
    $avatar = '🧑‍🌾';
    $nik = !empty($input['nik']) ? trim(sanitize($input['nik'])) : null;
    
    if (strlen($rawPassword) < 5) {
        sendResponse(false, 'Password minimal harus 5 karakter!', [], 400);
    }
    
    $conn = getDBConnection();
    
    // Cek duplikasi username / email
    $stmt = $conn->prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?)");
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($res && $res->num_rows > 0) {
        $stmt->close();
        $conn->close();
        sendResponse(false, 'Email/Username "' . $username . '" sudah terdaftar! Silakan gunakan email lain atau langsung login.', [], 409);
    }
    $stmt->close();
    
    // Simpan ke tabel users
    $hashedPassword = md5($rawPassword);
    $stmtUser = $conn->prepare("INSERT INTO users (username, password, name, role, role_label, avatar, no_telepon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())");
    $stmtUser->bind_param('sssssss', $username, $hashedPassword, $name, $role, $roleLabel, $avatar, $noTelepon);
    
    if (!$stmtUser->execute()) {
        $err = $stmtUser->error;
        $stmtUser->close();
        $conn->close();
        sendResponse(false, 'Gagal mendaftarkan akun: ' . $err, [], 500);
    }
    $newUserId = $conn->insert_id;
    $stmtUser->close();
    
    // Simpan ke tabel petani
    $stmtPetani = $conn->prepare("INSERT INTO petani (nama, nik, alamat, no_telepon, kelompok_tani_id, luas_lahan, varietas_padi, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())");
    $stmtPetani->bind_param('ssssidsi', $name, $nik, $alamat, $noTelepon, $kelompokTaniId, $luasLahan, $varietasPadi, $newUserId);
    
    $newPetaniId = 0;
    if ($stmtPetani->execute()) {
        $newPetaniId = $conn->insert_id;
    }
    $stmtPetani->close();
    
    // Jika luas lahan diisi > 0, buat catatan otomatis di tabel lahan
    if ($newPetaniId > 0 && $luasLahan > 0) {
        $lokasiLahan = !empty($alamat) ? $alamat : ('Lahan Pertanian ' . $name);
        $statusLahan = 'Aktif';
        $stmtLahan = $conn->prepare("INSERT INTO lahan (petani_id, luas, lokasi, status, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())");
        $stmtLahan->bind_param('idss', $newPetaniId, $luasLahan, $lokasiLahan, $statusLahan);
        $stmtLahan->execute();
        $stmtLahan->close();
    }
    
    $conn->close();
    
    $userData = [
        'id'            => $newUserId,
        'username'      => $username,
        'name'          => $name,
        'role'          => $role,
        'role_label'    => $roleLabel,
        'avatar'        => $avatar,
        'petani_id'     => $newPetaniId,
        'no_telepon'    => $noTelepon,
        'alamat'        => $alamat,
        'luas_lahan'    => $luasLahan,
        'varietas_padi' => $varietasPadi
    ];
    
    sendResponse(true, 'Pendaftaran berhasil! Akun petani Anda telah terhubung ke database. Silakan masuk.', [
        'user' => $userData
    ], 201);
}

// ===== 2. LOGIN =====
if ($_SERVER['REQUEST_METHOD'] === 'POST' && (isset($_GET['login']) || (isset($_GET['action']) && $_GET['action'] === 'login'))) {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?: [];
    if (empty($input) && !empty($_POST)) {
        $input = $_POST;
    }
    
    validateRequired($input, ['username', 'password']);
    
    $username = sanitize($input['username']);
    $password = md5($input['password']);
    
    $conn = getDBConnection();
    $sql = "SELECT id, username, name, role, role_label, avatar, no_telepon FROM users WHERE username = ? AND password = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('ss', $username, $password);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();
    $conn->close();
    
    if ($user) {
        $token = base64_encode(json_encode([
            'user_id' => $user['id'],
            'username' => $user['username'],
            'role' => $user['role'],
            'exp' => time() + (8 * 60 * 60)
        ]));
        
        sendResponse(true, 'Login berhasil', [
            'user' => $user,
            'token' => $token
        ]);
    } else {
        sendResponse(false, 'Username/Email atau password salah!', [], 401);
    }
}

// ===== 3. GANTI PASSWORD (UNTUK SEMUA ROLE LOGIN: ADMIN, DESA, PETANI) =====
if ($_SERVER['REQUEST_METHOD'] === 'POST' && (isset($_GET['change_password']) || (isset($_GET['action']) && $_GET['action'] === 'change_password'))) {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?: [];
    if (empty($input) && !empty($_POST)) {
        $input = $_POST;
    }

    validateRequired($input, ['user_id', 'old_password', 'new_password']);

    $userId = (int)$input['user_id'];
    $oldPassword = $input['old_password'];
    $newPassword = $input['new_password'];

    if (strlen($newPassword) < 5) {
        sendResponse(false, 'Password baru minimal harus 5 karakter!', [], 400);
    }

    $conn = getDBConnection();

    // 1. Cek user dan verifikasi password lama
    $stmt = $conn->prepare("SELECT id, username, password FROM users WHERE id = ?");
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $res = $stmt->get_result();
    $user = $res ? $res->fetch_assoc() : null;
    $stmt->close();

    if (!$user) {
        $conn->close();
        sendResponse(false, 'Pengguna tidak ditemukan dalam database!', [], 404);
    }

    // Verifikasi password lama
    if (md5($oldPassword) !== $user['password']) {
        $conn->close();
        sendResponse(false, 'Kata sandi lama yang Anda masukkan salah!', [], 400);
    }

    // 2. Update password baru di database
    $newHashed = md5($newPassword);
    $stmtUpdate = $conn->prepare("UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?");
    $stmtUpdate->bind_param('si', $newHashed, $userId);
    $updated = $stmtUpdate->execute();
    $stmtUpdate->close();
    $conn->close();

    if ($updated) {
        sendResponse(true, 'Kata sandi berhasil diperbarui di database! Silakan gunakan kata sandi baru untuk login selanjutnya.');
    } else {
        sendResponse(false, 'Gagal memperbarui kata sandi di server!', [], 500);
    }
}

// ===== 4. LUPA SANDI (RESET DENGAN EMAIL + NO WHATSAPP) =====
if ($_SERVER['REQUEST_METHOD'] === 'POST' && (isset($_GET['forgot_password']) || (isset($_GET['action']) && $_GET['action'] === 'forgot_password'))) {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?: [];
    if (empty($input) && !empty($_POST)) {
        $input = $_POST;
    }

    validateRequired($input, ['email', 'no_wa']);

    $email = trim(sanitize($input['email']));
    $rawWa = trim(sanitize($input['no_wa']));
    $normWa = normalizePhoneNumber($rawWa);
    $newPassword = isset($input['new_password']) ? trim($input['new_password']) : '';

    $conn = getDBConnection();

    // Cari user berdasarkan email (username)
    $stmt = $conn->prepare("SELECT u.id, u.username, u.name, u.role, u.no_telepon as u_phone, p.no_telepon as p_phone 
                            FROM users u 
                            LEFT JOIN petani p ON u.id = p.user_id 
                            WHERE LOWER(u.username) = LOWER(?) LIMIT 1");
    $stmt->bind_param('s', $email);
    $stmt->execute();
    $res = $stmt->get_result();
    $user = $res ? $res->fetch_assoc() : null;
    $stmt->close();

    if (!$user) {
        $conn->close();
        sendResponse(false, 'Akun dengan alamat email/Gmail tersebut tidak ditemukan!', [], 404);
    }

    // Cocokkan nomor WhatsApp (baik dari tabel users atau petani)
    $phone1 = normalizePhoneNumber($user['u_phone'] ?? '');
    $phone2 = normalizePhoneNumber($user['p_phone'] ?? '');

    $matched = false;
    if (!empty($normWa)) {
        if ($phone1 === $normWa || $phone2 === $normWa) {
            $matched = true;
        } elseif (str_ends_with($phone1, substr($normWa, -8)) || str_ends_with($phone2, substr($normWa, -8))) {
            // Toleransi pencocokan 8 digit terakhir jika format 08 vs 62
            $matched = true;
        }
    }

    if (!$matched) {
        $conn->close();
        sendResponse(false, 'Nomor WhatsApp tidak cocok dengan akun yang terdaftar!', [], 400);
    }

    // Jika hanya cek verifikasi (tanpa input password baru)
    if (empty($newPassword)) {
        $conn->close();
        sendResponse(true, 'Identitas akun terverifikasi!', [
            'user_id' => $user['id'],
            'name'    => $user['name'],
            'email'   => $user['username']
        ]);
    }

    // Reset password baru
    if (strlen($newPassword) < 5) {
        $conn->close();
        sendResponse(false, 'Kata sandi baru minimal harus 5 karakter!', [], 400);
    }

    $newHashed = md5($newPassword);
    $stmtUpdate = $conn->prepare("UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?");
    $stmtUpdate->bind_param('si', $newHashed, $user['id']);
    $success = $stmtUpdate->execute();
    $stmtUpdate->close();
    $conn->close();

    if ($success) {
        // Kirim notifikasi konfirmasi WhatsApp jika Fonnte gateway tersedia
        $targetWa = !empty($normWa) ? $normWa : ($phone1 ?: $phone2);
        $fonnteConfigPath = __DIR__ . '/../includes/fonnte_config.php';
        if (!empty($targetWa) && file_exists($fonnteConfigPath)) {
            $waMsg = "🌾 *Platform Padi Desa Cirebon Girang*\n\n"
                   . "Halo *" . $user['name'] . "*,\n"
                   . "Kata sandi akun Anda (" . $user['username'] . ") baru saja berhasil diperbarui/direset melalui sistem.\n\n"
                   . "Jika ini bukan Anda, segera hubungi Administrator atau Perangkat Desa.";
            try {
                require_once $fonnteConfigPath;
                if (function_exists('sendFonnteWhatsApp')) {
                    sendFonnteWhatsApp($targetWa, $waMsg);
                }
            } catch (Exception $e) {}
        }

        sendResponse(true, 'Kata sandi berhasil direset! Silakan gunakan kata sandi baru untuk login.', [
            'user_id' => $user['id']
        ]);
    } else {
        sendResponse(false, 'Gagal mengupdate kata sandi baru di database!', [], 500);
    }
}

// ===== 5. LOGOUT =====
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['logout'])) {
    sendResponse(true, 'Logout berhasil');
}

// ===== 6. VERIFY TOKEN =====
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['verify'])) {
    $headers = getallheaders();
    $token = isset($headers['Authorization']) ? str_replace('Bearer ', '', $headers['Authorization']) : '';
    
    if (empty($token)) {
        sendResponse(false, 'Token tidak ditemukan', [], 401);
    }
    
    try {
        $decoded = json_decode(base64_decode($token), true);
        
        if (!isset($decoded['exp']) || $decoded['exp'] < time()) {
            sendResponse(false, 'Token kadaluarsa', [], 401);
        }
        
        $user = getById('users', $decoded['user_id']);
        
        if (!$user) {
            sendResponse(false, 'User tidak ditemukan', [], 401);
        }
        
        unset($user['password']);
        sendResponse(true, 'Token valid', ['user' => $user]);
        
    } catch (Exception $e) {
        sendResponse(false, 'Token tidak valid', [], 401);
    }
}
?>
