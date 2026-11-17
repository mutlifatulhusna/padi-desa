<?php
/**
 * =======================================================
 * WHATSAPP GATEWAY API (FONNTE)
 * Platform Padi Desa Cirebon Girang
 * =======================================================
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../includes/fonnte_config.php';
require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// 1. CEK STATUS DEVICE
if ($method === 'GET' && isset($_GET['status'])) {
    $deviceStatus = getFonnteDeviceStatus();
    echo json_encode([
        'success' => isset($deviceStatus['status']) && $deviceStatus['status'] === true,
        'data' => $deviceStatus
    ]);
    exit();
}

// 2. KIRIM PESAN KE NOMOR TERTENTU
if ($method === 'POST' && isset($_GET['send'])) {
    $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    $target = trim($input['target'] ?? '');
    $message = trim($input['message'] ?? '');

    if (empty($target) || empty($message)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Nomor WhatsApp (target) dan pesan wajib diisi!'
        ]);
        exit();
    }

    $res = sendFonnteWhatsApp($target, $message);
    echo json_encode([
        'success' => isset($res['status']) && $res['status'] === true,
        'message' => (isset($res['status']) && $res['status'] === true) ? 'Pesan WhatsApp berhasil dikirim!' : ($res['message'] ?? 'Gagal kirim pesan'),
        'data' => $res
    ]);
    exit();
}

// 3. BROADCAST PENGUMUMAN KE SELURUH PETANI
if ($method === 'POST' && (isset($_GET['broadcast']) || isset($_GET['broadcast_pengumuman']))) {
    $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
    
    $judul = trim($input['judul'] ?? '');
    $jenis = trim($input['jenis'] ?? 'Informasi');
    $konten = trim($input['konten'] ?? '');
    $customMessage = trim($input['message'] ?? '');

    $conn = getDBConnection();
    if (!$conn) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Gagal koneksi ke database']);
        exit();
    }

    // Ambil nomor telepon seluruh petani yang valid
    $resPetani = $conn->query("SELECT nama, no_telepon FROM petani WHERE no_telepon IS NOT NULL AND no_telepon != ''");
    $targets = [];
    $petaniList = [];
    if ($resPetani) {
        while ($p = $resPetani->fetch_assoc()) {
            $cleaned = preg_replace('/[^0-9]/', '', $p['no_telepon']);
            if (strlen($cleaned) >= 9) {
                $targets[] = $cleaned;
                $petaniList[] = $p['nama'];
            }
        }
    }
    $conn->close();

    if (empty($targets)) {
        echo json_encode([
            'success' => false,
            'message' => 'Tidak ditemukan nomor telepon petani yang valid di database.'
        ]);
        exit();
    }

    // Susun pesan resmi Pengumuman
    if (!empty($customMessage)) {
        $finalMessage = $customMessage;
    } else {
        $dateNow = date('d F Y, H:i');
        $finalMessage = "🌾 *PENGUMUMAN DESA CIREBON GIRANG* 🌾\n"
                      . "━━━━━━━━━━━━━━━━━━━━\n"
                      . "📢 *Judul:* " . strtoupper($judul) . "\n"
                      . "🏷️ *Kategori:* " . $jenis . "\n"
                      . "📅 *Waktu:* " . $dateNow . " WIB\n"
                      . "━━━━━━━━━━━━━━━━━━━━\n\n"
                      . $konten . "\n\n"
                      . "━━━━━━━━━━━━━━━━━━━━\n"
                      . "_Pesan otomatis resmi dari Platform Padi Desa Cirebon Girang._";
    }

    $fonnteRes = sendFonnteWhatsApp($targets, $finalMessage);

    echo json_encode([
        'success' => isset($fonnteRes['status']) && $fonnteRes['status'] === true,
        'message' => (isset($fonnteRes['status']) && $fonnteRes['status'] === true)
            ? 'Broadcast WhatsApp berhasil dikirim ke ' . count($targets) . ' petani!'
            : ($fonnteRes['message'] ?? 'Gagal broadcast Fonnte'),
        'total_targets' => count($targets),
        'targets' => $targets,
        'fonnte_response' => $fonnteRes
    ]);
    exit();
}

if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'whatsapp.php') {
    echo json_encode([
        'success' => true,
        'message' => 'WhatsApp Fonnte API aktif',
        'device_token' => substr(FONNTE_TOKEN, 0, 4) . '***' . substr(FONNTE_TOKEN, -4)
    ]);
}
?>

