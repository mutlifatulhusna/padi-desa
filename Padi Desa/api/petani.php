<?php
/**
 * ========================================
 * PETANI API ENDPOINTS
 * Platform Padi Desa Cirebon Girang
 * ========================================
 */

require_once 'config.php';
require_once 'db.php';

// ===== GET ALL PETANI =====
if ($_SERVER['REQUEST_METHOD'] === 'GET' && !isset($_GET['id']) && !isset($_GET['search'])) {
    $petani = getAll('petani', 'ORDER BY id DESC');
    
    // Get related data
    foreach ($petani as &$p) {
        // Get kelompok
        if ($p['kelompok_tani_id']) {
            $kelompok = getById('kelompok_tani', $p['kelompok_tani_id']);
            $p['kelompok'] = $kelompok ?: null;
        }
        
        // Get lahan
        $lahan = getAll('lahan', "WHERE petani_id = {$p['id']}");
        $p['lahan'] = $lahan;
        
        // Get panen
        $panen = getAll('panen', "WHERE petani_id = {$p['id']}");
        $p['panen'] = $panen;
    }
    
    sendResponse(true, 'Data petani berhasil diambil', $petani);
}

// ===== GET PETANI BY ID =====
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['id'])) {
    $id = intval($_GET['id']);
    $petani = getById('petani', $id);
    
    if (!$petani) {
        sendResponse(false, 'Data petani tidak ditemukan', [], 404);
    }
    
    // Get related data
    if ($petani['kelompok_tani_id']) {
        $kelompok = getById('kelompok_tani', $petani['kelompok_tani_id']);
        $petani['kelompok'] = $kelompok ?: null;
    }
    
    $petani['lahan'] = getAll('lahan', "WHERE petani_id = {$id}");
    $petani['panen'] = getAll('panen', "WHERE petani_id = {$id}");
    
    sendResponse(true, 'Data petani ditemukan', $petani);
}

// ===== SEARCH PETANI =====
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['search'])) {
    $keyword = sanitize($_GET['search']);
    $fields = ['nama', 'nik', 'alamat', 'no_telepon', 'varietas_padi'];
    $petani = search('petani', $keyword, $fields);
    sendResponse(true, 'Hasil pencarian', $petani);
}

// ===== CREATE PETANI =====
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Validate API Key
    validateAPIKey();
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate required fields
    validateRequired($input, ['nama', 'nik']);
    
    try {
        $data = [
            'nama' => sanitize($input['nama']),
            'nik' => sanitize($input['nik']),
            'alamat' => isset($input['alamat']) ? sanitize($input['alamat']) : '',
            'no_telepon' => isset($input['no_telepon']) ? sanitize($input['no_telepon']) : '',
            'kelompok_tani_id' => isset($input['kelompok_tani_id']) && !empty($input['kelompok_tani_id']) ? intval($input['kelompok_tani_id']) : null,
            'luas_lahan' => isset($input['luas_lahan']) ? floatval($input['luas_lahan']) : 0,
            'varietas_padi' => isset($input['varietas_padi']) ? sanitize($input['varietas_padi']) : '',
            'user_id' => isset($input['user_id']) && !empty($input['user_id']) ? intval($input['user_id']) : null
        ];
        
        // Check if NIK already exists
        $existing = search('petani', $data['nik'], ['nik']);
        if (!empty($existing)) {
            sendResponse(false, 'NIK sudah terdaftar', [], 409);
        }
        
        $id = insert('petani', $data);
        
        // Also create lahan if luas_lahan > 0
        if ($data['luas_lahan'] > 0 && isset($input['lokasi_lahan'])) {
            $lahanData = [
                'petani_id' => $id,
                'luas' => $data['luas_lahan'],
                'lokasi' => sanitize($input['lokasi_lahan']),
                'status' => 'Aktif'
            ];
            insert('lahan', $lahanData);
        }
        
        sendResponse(true, 'Data petani berhasil ditambahkan', ['id' => $id]);
        
    } catch (Exception $e) {
        sendResponse(false, 'Gagal menambahkan data: ' . $e->getMessage(), [], 500);
    }
}

// ===== UPDATE PETANI =====
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    // Validate API Key
    validateAPIKey();
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['id'])) {
        sendResponse(false, 'ID petani diperlukan', [], 400);
    }
    
    $id = intval($input['id']);
    $existing = getById('petani', $id);
    
    if (!$existing) {
        sendResponse(false, 'Data petani tidak ditemukan', [], 404);
    }
    
    try {
        $data = [];
        if (isset($input['nama'])) $data['nama'] = sanitize($input['nama']);
        if (isset($input['nik'])) $data['nik'] = sanitize($input['nik']);
        if (isset($input['alamat'])) $data['alamat'] = sanitize($input['alamat']);
        if (isset($input['no_telepon'])) $data['no_telepon'] = sanitize($input['no_telepon']);
        if (isset($input['kelompok_tani_id'])) {
            $data['kelompok_tani_id'] = !empty($input['kelompok_tani_id']) ? intval($input['kelompok_tani_id']) : null;
        }
        if (isset($input['luas_lahan'])) $data['luas_lahan'] = floatval($input['luas_lahan']);
        if (isset($input['varietas_padi'])) $data['varietas_padi'] = sanitize($input['varietas_padi']);
        if (isset($input['user_id'])) {
            $data['user_id'] = !empty($input['user_id']) ? intval($input['user_id']) : null;
        }
        
        update('petani', $id, $data);
        sendResponse(true, 'Data petani berhasil diupdate');
        
    } catch (Exception $e) {
        sendResponse(false, 'Gagal update data: ' . $e->getMessage(), [], 500);
    }
}

// ===== DELETE PETANI =====
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    // Validate API Key
    validateAPIKey();
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['id'])) {
        sendResponse(false, 'ID petani diperlukan', [], 400);
    }
    
    $id = intval($input['id']);
    $existing = getById('petani', $id);
    
    if (!$existing) {
        sendResponse(false, 'Data petani tidak ditemukan', [], 404);
    }
    
    try {
        // Delete related data (lahan & panen) will be cascaded
        delete('petani', $id);
        sendResponse(true, 'Data petani berhasil dihapus');
    } catch (Exception $e) {
        sendResponse(false, 'Gagal hapus data: ' . $e->getMessage(), [], 500);
    }
}

// ===== GET STATISTICS =====
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['stats'])) {
    $petani = getAll('petani');
    $totalPetani = count($petani);
    $totalLuas = 0;
    $varietasCount = [];
    
    foreach ($petani as $p) {
        $totalLuas += floatval($p['luas_lahan']);
        $v = $p['varietas_padi'] ?: 'Tidak diketahui';
        $varietasCount[$v] = ($varietasCount[$v] ?? 0) + 1;
    }
    
    $stats = [
        'totalPetani' => $totalPetani,
        'totalLuasLahan' => round($totalLuas, 2),
        'rataLuasLahan' => $totalPetani > 0 ? round($totalLuas / $totalPetani, 2) : 0,
        'varietasCount' => $varietasCount
    ];
    
    sendResponse(true, 'Statistik petani', $stats);
}

// ===== GET ALL KELOMPOK =====
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['kelompok'])) {
    $kelompok = getAll('kelompok_tani', 'ORDER BY nama ASC');
    sendResponse(true, 'Data kelompok tani', $kelompok);
}

// ===== GET PETANI BY KELOMPOK =====
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['kelompok_id'])) {
    $kelompokId = intval($_GET['kelompok_id']);
    $petani = getAll('petani', "WHERE kelompok_tani_id = $kelompokId ORDER BY nama ASC");
    sendResponse(true, 'Data petani dalam kelompok', $petani);
}

// If no endpoint matched
sendResponse(false, 'Endpoint tidak ditemukan', [], 404);
?>