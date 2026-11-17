<?php
/**
 * ========================================
 * USERS API ENDPOINTS (MySQL)
 * Platform Padi Desa Cirebon Girang
 * ========================================
 */

require_once 'config.php';
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Helper to determine role label from role
function getRoleLabel($role) {
    $role = strtolower(trim((string)$role));
    switch ($role) {
        case 'admin':
            return 'Admin';
        case 'perangkat':
        case 'perangkat_desa':
        case 'desa':
            return 'Perangkat Desa';
        case 'kelompok':
            return 'Kelompok Tani';
        case 'petani':
        default:
            return 'Petani';
    }
}

// ===== GET ALL USERS OR BY ID =====
if ($method === 'GET') {
    if (isset($_GET['id'])) {
        $id = intval($_GET['id']);
        $user = getById('users', $id);
        if (!$user) {
            sendResponse(false, 'Pengguna tidak ditemukan', null, 404);
        }
        sendResponse(true, 'Pengguna ditemukan', $user);
    } else {
        $users = getAll('users', 'ORDER BY id ASC');
        sendResponse(true, 'Data pengguna berhasil diambil', $users);
    }
}

// ===== CREATE USER =====
if ($method === 'POST') {
    $inputJSON = file_get_contents('php://input');
    $data = json_decode($inputJSON, true) ?: $_POST;

    $username = trim($data['username'] ?? '');
    $name = trim($data['name'] ?? '');
    $role = trim($data['role'] ?? 'petani');
    $roleLabel = trim($data['roleLabel'] ?? getRoleLabel($role));
    $avatar = trim($data['avatar'] ?? '👤');
    $no_telepon = trim($data['no_telepon'] ?? '');
    $password = trim($data['password'] ?? '123456');

    if (empty($username) || empty($name)) {
        sendResponse(false, 'Nama dan username wajib diisi', null, 400);
    }

    $conn = getDBConnection();

    // Check if ID is provided (sync or specific ID)
    if (!empty($data['id'])) {
        $id = intval($data['id']);
        // Check if exists
        $check = $conn->query("SELECT id FROM users WHERE id = $id LIMIT 1");
        if ($check && $check->num_rows > 0) {
            // Update instead
            if (!empty($data['password'])) {
                $hash = md5($password);
                $stmt = $conn->prepare("UPDATE users SET username=?, name=?, role=?, role_label=?, avatar=?, no_telepon=?, password=?, updated_at=NOW() WHERE id=?");
                $stmt->bind_param("sssssssi", $username, $name, $role, $roleLabel, $avatar, $no_telepon, $hash, $id);
            } else {
                $stmt = $conn->prepare("UPDATE users SET username=?, name=?, role=?, role_label=?, avatar=?, no_telepon=?, updated_at=NOW() WHERE id=?");
                $stmt->bind_param("ssssssi", $username, $name, $role, $roleLabel, $avatar, $no_telepon, $id);
            }
            $stmt->execute();
            $stmt->close();
            $conn->close();
            sendResponse(true, 'Data pengguna berhasil diperbarui', ['id' => $id]);
        }
    }

    // Insert new user
    $hash = md5($password);
    $stmt = $conn->prepare("INSERT INTO users (username, password, name, role, role_label, avatar, no_telepon, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())");
    $stmt->bind_param("sssssss", $username, $hash, $name, $role, $roleLabel, $avatar, $no_telepon);
    
    if ($stmt->execute()) {
        $newId = $conn->insert_id;
        $stmt->close();
        $conn->close();
        sendResponse(true, 'Pengguna berhasil ditambahkan', ['id' => $newId]);
    } else {
        $err = $stmt->error;
        $stmt->close();
        $conn->close();
        sendResponse(false, 'Gagal menambahkan pengguna: ' . $err, null, 500);
    }
}

// ===== UPDATE USER =====
if ($method === 'PUT') {
    $inputJSON = file_get_contents('php://input');
    $data = json_decode($inputJSON, true);

    $id = intval($data['id'] ?? $_GET['id'] ?? 0);
    if ($id <= 0) {
        sendResponse(false, 'ID pengguna tidak valid', null, 400);
    }

    $conn = getDBConnection();
    $existing = getById('users', $id);
    if (!$existing) {
        $conn->close();
        sendResponse(false, 'Pengguna tidak ditemukan', null, 404);
    }

    $username = trim($data['username'] ?? $existing['username']);
    $name = trim($data['name'] ?? $existing['name']);
    $role = trim($data['role'] ?? $existing['role']);
    $roleLabel = trim($data['roleLabel'] ?? getRoleLabel($role));
    $avatar = trim($data['avatar'] ?? $existing['avatar']);
    $no_telepon = isset($data['no_telepon']) ? trim($data['no_telepon']) : ($existing['no_telepon'] ?? '');

    if (!empty($data['password'])) {
        $hash = md5(trim($data['password']));
        $stmt = $conn->prepare("UPDATE users SET username=?, name=?, role=?, role_label=?, avatar=?, no_telepon=?, password=?, updated_at=NOW() WHERE id=?");
        $stmt->bind_param("sssssssi", $username, $name, $role, $roleLabel, $avatar, $no_telepon, $hash, $id);
    } else {
        $stmt = $conn->prepare("UPDATE users SET username=?, name=?, role=?, role_label=?, avatar=?, no_telepon=?, updated_at=NOW() WHERE id=?");
        $stmt->bind_param("ssssssi", $username, $name, $role, $roleLabel, $avatar, $no_telepon, $id);
    }

    if ($stmt->execute()) {
        $stmt->close();
        $conn->close();
        sendResponse(true, 'Data pengguna berhasil diperbarui', ['id' => $id]);
    } else {
        $err = $stmt->error;
        $stmt->close();
        $conn->close();
        sendResponse(false, 'Gagal memperbarui pengguna: ' . $err, null, 500);
    }
}

// ===== DELETE USER =====
if ($method === 'DELETE') {
    $id = intval($_GET['id'] ?? 0);
    if ($id <= 0) {
        sendResponse(false, 'ID pengguna tidak valid', null, 400);
    }

    $conn = getDBConnection();
    $stmt = $conn->prepare("DELETE FROM users WHERE id = ?");
    $stmt->bind_param("i", $id);
    if ($stmt->execute()) {
        $stmt->close();
        $conn->close();
        sendResponse(true, 'Pengguna berhasil dihapus');
    } else {
        $err = $stmt->error;
        $stmt->close();
        $conn->close();
        sendResponse(false, 'Gagal menghapus pengguna: ' . $err, null, 500);
    }
}
?>
