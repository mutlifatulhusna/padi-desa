<?php
/**
 * =======================================================
 * LAHAN API ENDPOINTS & WHATSAPP NOTIFICATIONS
 * Platform Padi Desa Cirebon Girang
 * =======================================================
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/../includes/fonnte_config.php';

$method = $_SERVER['REQUEST_METHOD'];

// ===== 1. GET LAHAN =====
if ($method === 'GET') {
    $conn = getDBConnection();
    
    // By ID
    if (isset($_GET['id'])) {
        $id = intval($_GET['id']);
        $sql = "SELECT l.*, p.nama as petani_nama, p.no_telepon as petani_wa, p.nik as petani_nik 
                FROM lahan l 
                LEFT JOIN petani p ON l.petani_id = p.id 
                WHERE l.id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('i', $id);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        $conn->close();
        
        if ($row) {
            sendResponse(true, 'Data lahan ditemukan', $row);
        } else {
            sendResponse(false, 'Data lahan tidak ditemukan', [], 404);
        }
    }
    
    // By User ID (Petani yang sedang login)
    if (isset($_GET['user_id'])) {
        $userId = intval($_GET['user_id']);
        $sql = "SELECT l.*, p.nama as petani_nama 
                FROM lahan l 
                INNER JOIN petani p ON l.petani_id = p.id 
                WHERE p.user_id = ? 
                ORDER BY l.id DESC";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('i', $userId);
        $stmt->execute();
        $result = $stmt->get_result();
        $data = [];
        while ($r = $result->fetch_assoc()) {
            $data[] = $r;
        }
        $stmt->close();
        $conn->close();
        sendResponse(true, 'Data lahan petani berhasil diambil', $data);
    }
    
    // By Petani ID
    if (isset($_GET['petani_id'])) {
        $petaniId = intval($_GET['petani_id']);
        $sql = "SELECT l.*, p.nama as petani_nama 
                FROM lahan l 
                LEFT JOIN petani p ON l.petani_id = p.id 
                WHERE l.petani_id = ? 
                ORDER BY l.id DESC";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('i', $petaniId);
        $stmt->execute();
        $result = $stmt->get_result();
        $data = [];
        while ($r = $result->fetch_assoc()) {
            $data[] = $r;
        }
        $stmt->close();
        $conn->close();
        sendResponse(true, 'Data lahan petani berhasil diambil', $data);
    }
    
    // Get All Lahan
    $sql = "SELECT l.*, p.nama as petani_nama, p.no_telepon as petani_wa 
            FROM lahan l 
            LEFT JOIN petani p ON l.petani_id = p.id 
            ORDER BY l.id DESC";
    $res = $conn->query($sql);
    $data = [];
    if ($res) {
        while ($r = $res->fetch_assoc()) {
            $data[] = $r;
        }
    }
    $conn->close();
    sendResponse(true, 'Seluruh data lahan berhasil diambil', $data);
}

// ===== 2. POST (TAMBAH LAHAN BARU + KIRIM NOTIFIKASI WA) =====
if ($method === 'POST') {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?: $_POST;
    
    $lokasi = isset($input['lokasi']) ? trim(sanitize($input['lokasi'])) : '';
    $luas = isset($input['luas']) ? (float)$input['luas'] : 0.0;
    $status = !empty($input['status']) ? trim(sanitize($input['status'])) : 'Aktif';
    $petaniId = isset($input['petani_id']) && is_numeric($input['petani_id']) ? (int)$input['petani_id'] : 0;
    $userId = isset($input['user_id']) && is_numeric($input['user_id']) ? (int)$input['user_id'] : 0;
    $customPhone = isset($input['no_telepon']) ? trim(sanitize($input['no_telepon'])) : '';
    
    if (empty($lokasi)) {
        sendResponse(false, 'Lokasi lahan wajib diisi!', [], 400);
    }
    if ($luas <= 0) {
        sendResponse(false, 'Luas lahan harus lebih besar dari 0!', [], 400);
    }
    
    $conn = getDBConnection();
    
    // 1. Identifikasi / temukan data petani
    $petani = null;
    if ($petaniId > 0) {
        $stmtP = $conn->prepare("SELECT id, nama, no_telepon, luas_lahan, user_id FROM petani WHERE id = ?");
        $stmtP->bind_param('i', $petaniId);
        $stmtP->execute();
        $petani = $stmtP->get_result()->fetch_assoc();
        $stmtP->close();
    }
    
    if (!$petani && $userId > 0) {
        $stmtP = $conn->prepare("SELECT id, nama, no_telepon, luas_lahan, user_id FROM petani WHERE user_id = ?");
        $stmtP->bind_param('i', $userId);
        $stmtP->execute();
        $petani = $stmtP->get_result()->fetch_assoc();
        $stmtP->close();
    }
    
    // Jika profil petani belum ada tapi ada user_id, buat profil petani otomatis
    if (!$petani && $userId > 0) {
        $stmtU = $conn->prepare("SELECT name FROM users WHERE id = ?");
        $stmtU->bind_param('i', $userId);
        $stmtU->execute();
        $uRow = $stmtU->get_result()->fetch_assoc();
        $stmtU->close();
        
        $namaUser = $uRow ? $uRow['name'] : 'Petani';
        $nikOto = '3209' . substr(strval(time()), -12);
        
        $stmtNewP = $conn->prepare("INSERT INTO petani (nama, nik, no_telepon, user_id, luas_lahan, varietas_padi, created_at, updated_at) VALUES (?, ?, ?, ?, 0, 'Ciherang', NOW(), NOW())");
        $stmtNewP->bind_param('sssi', $namaUser, $nikOto, $customPhone, $userId);
        $stmtNewP->execute();
        $petaniId = $conn->insert_id;
        $stmtNewP->close();
        
        $petani = [
            'id' => $petaniId,
            'nama' => $namaUser,
            'no_telepon' => $customPhone,
            'luas_lahan' => 0,
            'user_id' => $userId
        ];
    }
    
    $finalPetaniId = $petani ? (int)$petani['id'] : null;
    
    // 2. Simpan Lahan ke Database
    if ($finalPetaniId) {
        $stmtL = $conn->prepare("INSERT INTO lahan (petani_id, luas, lokasi, status, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())");
        $stmtL->bind_param('idss', $finalPetaniId, $luas, $lokasi, $status);
    } else {
        $stmtL = $conn->prepare("INSERT INTO lahan (luas, lokasi, status, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())");
        $stmtL->bind_param('dss', $luas, $lokasi, $status);
    }
    
    if (!$stmtL->execute()) {
        $err = $stmtL->error;
        $stmtL->close();
        $conn->close();
        sendResponse(false, 'Gagal menyimpan data lahan: ' . $err, [], 500);
    }
    
    $newLahanId = $conn->insert_id;
    $stmtL->close();
    
    // 3. Update total luas lahan di profil petani
    $totalLuasLahan = $luas;
    if ($finalPetaniId) {
        $conn->query("UPDATE petani SET luas_lahan = (SELECT IFNULL(SUM(luas), 0) FROM lahan WHERE petani_id = $finalPetaniId) WHERE id = $finalPetaniId");
        
        $resSum = $conn->query("SELECT luas_lahan FROM petani WHERE id = $finalPetaniId");
        if ($resSum && $rowSum = $resSum->fetch_assoc()) {
            $totalLuasLahan = (float)$rowSum['luas_lahan'];
        }
    }
    
    $conn->close();
    
    // 4. Kirim Notifikasi WhatsApp via Fonnte jika nomor telepon tersedia
    $targetPhone = !empty($customPhone) ? $customPhone : ($petani && !empty($petani['no_telepon']) ? $petani['no_telepon'] : '');
    $waSent = false;
    $waResponse = null;
    
    if (!empty($targetPhone)) {
        $namaPetani = $petani ? $petani['nama'] : 'Petani';
        $waktuSekarang = date('d F Y, H:i') . ' WIB';
        
        $pesanWA = "🌾 *PLATFORM PADI DESA CIREBON GIRANG* 🌾\n"
                 . "━━━━━━━━━━━━━━━━━━━━━━\n"
                 . "📢 *NOTIFIKASI LAHAN BARU BERHASIL DITAMBAHKAN*\n\n"
                 . "Halo, Bapak/Ibu *{$namaPetani}*!\n"
                 . "Data petak lahan pertanian Anda telah berhasil tercatat dan terhubung langsung ke database desa:\n\n"
                 . "📍 *Lokasi Lahan:* {$lokasi}\n"
                 . "📐 *Luas Petak:* {$luas} Hektar\n"
                 . "🌱 *Status Lahan:* {$status}\n"
                 . "📊 *Total Luas Lahan Anda:* {$totalLuasLahan} Hektar\n"
                 . "🕒 *Waktu Input:* {$waktuSekarang}\n\n"
                 . "Data ini telah aktif di sistem kami untuk memudahkan pendataan panen, penyuluhan, dan alokasi pupuk desa.\n\n"
                 . "Pantau terus perkembangan pertanian Anda di Dashboard Petani:\n"
                 . "🌐 http://localhost/Padi%20Desa%20(2)/Padi%20Desa/dashboard.html\n\n"
                 . "_Pesan otomatis resmi dari Sistem Pertanian Desa Cirebon Girang_ 🚜🌾";
                 
        $waResponse = sendFonnteWhatsApp($targetPhone, $pesanWA);
        $waSent = isset($waResponse['status']) && $waResponse['status'] === true;
    }
    
    sendResponse(true, 'Data lahan berhasil ditambahkan ke database!', [
        'lahan' => [
            'id' => $newLahanId,
            'petani_id' => $finalPetaniId,
            'luas' => $luas,
            'lokasi' => $lokasi,
            'status' => $status,
            'total_luas_petani' => $totalLuasLahan
        ],
        'wa_target' => $targetPhone,
        'wa_sent' => $waSent,
        'wa_response' => $waResponse
    ], 201);
}

// ===== 3. PUT (UPDATE LAHAN) =====
if ($method === 'PUT') {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true) ?: [];
    
    $id = isset($input['id']) ? intval($input['id']) : 0;
    if ($id <= 0) {
        sendResponse(false, 'ID lahan tidak valid!', [], 400);
    }
    
    $conn = getDBConnection();
    
    $lokasi = isset($input['lokasi']) ? trim(sanitize($input['lokasi'])) : null;
    $luas = isset($input['luas']) ? (float)$input['luas'] : null;
    $status = isset($input['status']) ? trim(sanitize($input['status'])) : null;
    
    $sets = [];
    $types = '';
    $values = [];
    
    if ($lokasi !== null) { $sets[] = "lokasi = ?"; $types .= 's'; $values[] = $lokasi; }
    if ($luas !== null) { $sets[] = "luas = ?"; $types .= 'd'; $values[] = $luas; }
    if ($status !== null) { $sets[] = "status = ?"; $types .= 's'; $values[] = $status; }
    
    if (empty($sets)) {
        $conn->close();
        sendResponse(false, 'Tidak ada data yang diubah!', [], 400);
    }
    
    $sets[] = "updated_at = NOW()";
    $values[] = $id;
    $types .= 'i';
    
    $sql = "UPDATE lahan SET " . implode(', ', $sets) . " WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$values);
    $stmt->execute();
    $stmt->close();
    
    // Dapatkan petani_id untuk update total luas
    $res = $conn->query("SELECT petani_id FROM lahan WHERE id = $id");
    if ($res && $row = $res->fetch_assoc()) {
        $pid = (int)$row['petani_id'];
        if ($pid > 0) {
            $conn->query("UPDATE petani SET luas_lahan = (SELECT IFNULL(SUM(luas), 0) FROM lahan WHERE petani_id = $pid) WHERE id = $pid");
        }
    }
    
    $conn->close();
    sendResponse(true, 'Data lahan berhasil diperbarui!');
}

// ===== 4. DELETE (HAPUS LAHAN) =====
if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if ($id <= 0) {
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $id = isset($input['id']) ? intval($input['id']) : 0;
    }
    
    if ($id <= 0) {
        sendResponse(false, 'ID lahan tidak valid!', [], 400);
    }
    
    $conn = getDBConnection();
    
    // Cari petani_id terlebih dahulu
    $pid = 0;
    $res = $conn->query("SELECT petani_id FROM lahan WHERE id = $id");
    if ($res && $row = $res->fetch_assoc()) {
        $pid = (int)$row['petani_id'];
    }
    
    $conn->query("DELETE FROM lahan WHERE id = $id");
    
    if ($pid > 0) {
        $conn->query("UPDATE petani SET luas_lahan = (SELECT IFNULL(SUM(luas), 0) FROM lahan WHERE petani_id = $pid) WHERE id = $pid");
    }
    
    $conn->close();
    sendResponse(true, 'Data lahan berhasil dihapus dari database!');
}
?>
