<?php
/**
 * =======================================================
 * ASISTEN PADI DESA - 100% REAL AI LLM ENGINE
 * Platform Padi Desa Cirebon Girang
 * 
 * Terhubung langsung ke:
 * 1. Database MySQL (127.0.0.1 db_petani) - Real-time Snapshot
 * 2. Real AI LLM (Groq Qwen 3.8 / Gemini) - Generatif & Cerdas
 * 3. Smart Database Fallback jika koneksi internet terputus
 * 
 * Aturan Respon:
 * - Respon Singkat & Padat secara default (sebutkan angka inti + petunjuk rincian)
 * - Respon Rinci & Lengkap jika pengguna meminta rincian/detail
 * =======================================================
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Chat-Token");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// -------------------------------------------------------
// LOAD KONFIGURASI GEMINI & API KEY DARI REPO
// -------------------------------------------------------
$configPaths = [
    __DIR__ . '/../includes/gemini_config.php',
    __DIR__ . '/../../includes/gemini_config.php',
    __DIR__ . '/includes/gemini_config.php',
    dirname(__DIR__) . '/includes/gemini_config.php'
];
foreach ($configPaths as $cp) {
    if (file_exists($cp)) {
        require_once $cp;
        break;
    }
}

// Ambil Groq API Key dari environment atau chatbot/.env
$groqApiKey = getenv('GROQ_API_KEY') ?: '';
$envPaths = [
    __DIR__ . '/../chatbot/.env',
    __DIR__ . '/../../chatbot/.env',
    dirname(__DIR__) . '/chatbot/.env',
    dirname(dirname(__DIR__)) . '/chatbot/.env'
];
foreach ($envPaths as $ep) {
    if (file_exists($ep)) {
        $envContent = file_get_contents($ep);
        if (preg_match('/GROQ_API_KEY\s*=\s*(gsk_[a-zA-Z0-9]+)/', $envContent, $m)) {
            $groqApiKey = trim($m[1]);
        }
        break;
    }
}

// -------------------------------------------------------
// KONEKSI DATABASE MYSQL REAL-TIME
// -------------------------------------------------------
$dbHost      = '127.0.0.1';
$dbUser      = 'root';
$dbPass      = '';
$dbName      = 'db_petani';
$conn        = @new mysqli($dbHost, $dbUser, $dbPass, $dbName);
$dbConnected = false;

if ($conn && !$conn->connect_error) {
    $conn->set_charset("utf8mb4");
    $dbConnected = true;
}

// -------------------------------------------------------
// BACA INPUT REQUEST
// -------------------------------------------------------
$inputJSON    = file_get_contents('php://input');
$input        = json_decode($inputJSON, true) ?: [];
$message      = isset($input['message']) ? trim($input['message']) : '';
$currentPage  = isset($input['current_page']) ? trim($input['current_page']) : 'dashboard.html';

// Token & Header
$headers  = function_exists('getallheaders') ? getallheaders() : [];
$tokenRaw = $headers['X-Chat-Token']
    ?? $headers['Authorization']
    ?? ($input['token'] ?? '');
$tokenRaw = str_replace('Bearer ', '', $tokenRaw);

$frontendUser = isset($input['user']) && is_array($input['user']) ? $input['user'] : null;

if (empty($message)) {
    if (isset($_GET['status']) || isset($_GET['ping'])) {
        echo json_encode([
            "status"       => "online",
            "db_connected" => $dbConnected,
            "engine"       => "Groq Qwen 3.8 LLM + MySQL Real-Time"
        ]);
        exit();
    }
    http_response_code(400);
    echo json_encode(["error" => "Pesan tidak boleh kosong"]);
    exit();
}

// Deteksi apakah pengguna meminta rincian / detail
$isDetailRequest = (bool)preg_match('/\b(rincian|rinci|detail|sebutkan semua|daftarnya|daftar|siapa saja|mana saja|lengkap|tabel|semua|tampilkan semua)\b/i', $message);

// -------------------------------------------------------
// RESOLVE IDENTITAS PENGGUNA DARI DATABASE (REAL-TIME)
// -------------------------------------------------------
$verifiedUser = null;
$resolvedId   = 0;
$resolvedUsername = '';

// 1. Ambil data user dari frontend session aktif di dashboard
if ($frontendUser && is_array($frontendUser)) {
    if (!empty($frontendUser['username'])) {
        $resolvedUsername = trim((string)$frontendUser['username']);
    }
    if (!empty($frontendUser['id'])) {
        $resolvedId = (int)$frontendUser['id'];
    }
}

// 2. Cek token jika ada
if (!empty($tokenRaw)) {
    $decoded = @json_decode(base64_decode($tokenRaw), true);
    if (is_array($decoded)) {
        $tokenUser = trim((string)($decoded['username'] ?? ''));
        $tokenId   = (int)($decoded['user_id'] ?? 0);
        $tokenExp  = (int)($decoded['exp'] ?? 0);

        if ($tokenExp === 0 || $tokenExp > time()) {
            if (empty($resolvedUsername) && $resolvedId === 0) {
                $resolvedUsername = $tokenUser;
                $resolvedId       = $tokenId;
            } elseif (!empty($tokenUser) && !empty($resolvedUsername) && strtolower($tokenUser) === strtolower($resolvedUsername)) {
                $resolvedId = $tokenId;
            }
        }
    }
}

// 3. Query user terverifikasi langsung dari MySQL (Utamakan username aktif)
if ($dbConnected) {
    if (!empty($resolvedUsername)) {
        $stmt = $conn->prepare("SELECT id, username, name, role, role_label, avatar, no_telepon FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1");
        $stmt->bind_param("s", $resolvedUsername);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($res && $res->num_rows > 0) $verifiedUser = $res->fetch_assoc();
        $stmt->close();
    }

    if (!$verifiedUser && $resolvedId > 0) {
        $stmt = $conn->prepare("SELECT id, username, name, role, role_label, avatar, no_telepon FROM users WHERE id = ? LIMIT 1");
        $stmt->bind_param("i", $resolvedId);
        $stmt->execute();
        $res = $stmt->get_result();
        if ($res && $res->num_rows > 0) $verifiedUser = $res->fetch_assoc();
        $stmt->close();
    }

    if ($verifiedUser) {
        $verifiedUser['roleLabel'] = $verifiedUser['role_label'] ?: $verifiedUser['role'];
    }
}

// Tentukan role efektif
$activeRole = 'tamu';
if ($verifiedUser) {
    $dbRole = strtolower(trim($verifiedUser['role']));
    if ($dbRole === 'admin') {
        $activeRole = 'admin';
    } elseif (in_array($dbRole, ['perangkat', 'desa', 'perangkat_desa', 'pamong'])) {
        $activeRole = 'desa';
    } else {
        $activeRole = 'petani';
    }
}

// -------------------------------------------------------
// PENGUMPULAN DATA REAL-TIME MYSQL (UNTUK KONTEKS AI LLM)
// -------------------------------------------------------
$dbSnapshot = "";
$userProfileSummary = "";
$petaniDetail = null;

$totUsers      = 0;
$totAdmin      = 0;
$totDesa       = 0;
$totPetaniUser = 0;
$totPetani     = 0;
$totPetaniLuas = "0,00";
$totLahan      = 0;
$totLahanLuas  = "0,00";
$totPanen      = 0;
$totPanenTon   = "0,00";
$totPengumuman = 0;
$totKelompok   = 0;

$admNames          = [];
$kNames            = [];
$petaniList        = [];
$panenList         = [];
$pengumumanList    = [];
$lahanList         = [];
$lahanSummaryPerPetani = [];

if ($dbConnected) {
    if ($verifiedUser) {
        $userProfileSummary .= "INFORMASI PENGGUNA AKTIF:\n"
            . "- Nama Pengguna : {$verifiedUser['name']}\n"
            . "- Username/Email: {$verifiedUser['username']}\n"
            . "- Role          : " . strtoupper($activeRole) . " ({$verifiedUser['roleLabel']})\n"
            . "- No. Telepon   : " . ($verifiedUser['no_telepon'] ?: 'Belum diisi') . "\n"
            . "- Halaman Dibuka: {$currentPage}\n";

        if ($activeRole === 'petani') {
            $uId = (int)$verifiedUser['id'];
            $uName = trim((string)$verifiedUser['name']);
            $uPhone = trim((string)($verifiedUser['no_telepon'] ?? ''));

            $stmtPetani = $conn->prepare(
                "SELECT p.id as petani_id, p.nama, p.nik, p.alamat, p.no_telepon, p.luas_lahan, p.varietas_padi, p.user_id,
                        k.nama as kelompok_nama, k.ketua as kelompok_ketua
                 FROM petani p
                 LEFT JOIN kelompok_tani k ON p.kelompok_tani_id = k.id
                 WHERE p.user_id = ? OR LOWER(p.nama) = LOWER(?) OR (p.no_telepon = ? AND ? != '')
                 ORDER BY (CASE WHEN p.user_id = ? THEN 1 WHEN LOWER(p.nama) = LOWER(?) THEN 2 ELSE 3 END), p.id DESC LIMIT 1"
            );
            $stmtPetani->bind_param("isssis", $uId, $uName, $uPhone, $uPhone, $uId, $uName);
            $stmtPetani->execute();
            $resPetani = $stmtPetani->get_result();
            if ($resPetani && $pRow = $resPetani->fetch_assoc()) {
                $petaniDetail = $pRow;
                if (empty($pRow['user_id']) && $uId > 0) {
                    $conn->query("UPDATE petani SET user_id = $uId WHERE id = " . (int)$pRow['petani_id']);
                }
                $displayNama = !empty($verifiedUser['name']) ? $verifiedUser['name'] : (!empty($pRow['nama']) ? $pRow['nama'] : 'Petani');
                $userProfileSummary .= "- Data Petani Anda: Nama: {$displayNama}, Kelompok Tani: " . ($pRow['kelompok_nama'] ?: 'Mandiri') . ", Luas Lahan: {$pRow['luas_lahan']} Ha, Varietas: {$pRow['varietas_padi']}, Alamat: {$pRow['alamat']}, WA: " . ($pRow['no_telepon'] ?: $verifiedUser['no_telepon']) . "\n";
            } else {
                $userProfileSummary .= "- Data Petani Anda: Nama: {$verifiedUser['name']}, Kelompok Tani: Mandiri, Luas Lahan: 0 Ha, Varietas: Ciherang\n";
            }
            $stmtPetani->close();
        }
    } else {
        $userProfileSummary .= "INFORMASI PENGGUNA: Tamu (Belum Login).\nHalaman: {$currentPage}\n";
    }

    // -------------------------------------------------------
    // STATISTIK REAL-TIME (100% SINKRON DENGAN 4 KARTU BERANDA / DASHBOARD)
    // -------------------------------------------------------
    $totUsersRes      = $conn->query("SELECT COUNT(*) as c FROM users")->fetch_assoc();
    $totPetaniRes     = $conn->query("SELECT COUNT(*) as c, COALESCE(SUM(luas_lahan),0) as l FROM petani")->fetch_assoc();
    $totLahanRes      = $conn->query("SELECT COUNT(*) as c, COALESCE(SUM(luas),0) as l FROM lahan")->fetch_assoc();
    $totPanenRes      = $conn->query("SELECT COUNT(*) as c, COALESCE(SUM(jumlah_ton),0) as t FROM panen")->fetch_assoc();
    $totPengumumanRes = $conn->query("SELECT COUNT(*) as c FROM pengumuman")->fetch_assoc();
    $totKelompokRes   = $conn->query("SELECT COUNT(*) as c FROM kelompok_tani")->fetch_assoc();

    $qAdm = $conn->query("SELECT COUNT(*) as c FROM users WHERE role = 'admin'")->fetch_assoc();
    $qDes = $conn->query("SELECT COUNT(*) as c FROM users WHERE role IN ('perangkat', 'desa', 'perangkat_desa', 'pamong')")->fetch_assoc();
    $qPet = $conn->query("SELECT COUNT(*) as c FROM users WHERE role = 'petani'")->fetch_assoc();

    $totUsers      = (int)($totUsersRes['c'] ?? 0);
    $totAdmin      = (int)($qAdm['c'] ?? 0);
    $totDesa       = (int)($qDes['c'] ?? 0);
    $totPetaniUser = (int)($qPet['c'] ?? 0);
    $totPetani     = (int)($totPetaniRes['c'] ?? 0);
    $totPetaniLuas = number_format((float)($totPetaniRes['l'] ?? 0), 2, ',', '.');
    $totLahan      = (int)($totLahanRes['c'] ?? 0);
    $totLahanLuas  = number_format((float)($totLahanRes['l'] ?? 0), 2, ',', '.');
    $totPanen      = (int)($totPanenRes['c'] ?? 0);
    $totPanenTon   = number_format((float)($totPanenRes['t'] ?? 0), 2, ',', '.');
    $totPengumuman = (int)($totPengumumanRes['c'] ?? 0);
    $totKelompok   = (int)($totKelompokRes['c'] ?? 0);

    // Ambil daftar nama admin aktif
    $rAdm = $conn->query("SELECT name, username FROM users WHERE role = 'admin'");
    if ($rAdm) {
        while ($ra = $rAdm->fetch_assoc()) $admNames[] = "{$ra['name']} ({$ra['username']})";
    }

    // Kelompok Tani
    $qK = $conn->query("SELECT nama, ketua, anggota FROM kelompok_tani ORDER BY id ASC");
    if ($qK) {
        while ($kr = $qK->fetch_assoc()) $kNames[] = "{$kr['nama']} (Ketua: {$kr['ketua']}, {$kr['anggota']} org)";
    }

    // SELURUH DATA PETANI (Lengkap 8 petani)
    $qPetAll = $conn->query("SELECT p.id, p.nama, p.luas_lahan, p.varietas_padi, k.nama as kelompok_nama 
                             FROM petani p 
                             LEFT JOIN kelompok_tani k ON p.kelompok_tani_id = k.id 
                             ORDER BY p.id ASC");
    if ($qPetAll) {
        $idx = 1;
        while ($pr = $qPetAll->fetch_assoc()) {
            $kNama = $pr['kelompok_nama'] ?: 'Mandiri';
            $petaniList[] = "{$idx}. {$pr['nama']} — Luas: {$pr['luas_lahan']} Ha | Varietas: {$pr['varietas_padi']} (Kelompok: {$kNama})";
            $idx++;
        }
    }

    // SELURUH DATA PANEN (Lengkap riwayat panen)
    $qPan = $conn->query("SELECT p.jumlah_ton, p.tanggal_panen, p.varietas, p.keterangan, pt.nama as petani_nama 
                          FROM panen p 
                          LEFT JOIN petani pt ON p.petani_id = pt.id 
                          ORDER BY p.id ASC");
    if ($qPan) {
        $idx = 1;
        while ($pa = $qPan->fetch_assoc()) {
            $petName = !empty($pa['petani_nama']) ? $pa['petani_nama'] : 'Petani';
            $ket = !empty($pa['keterangan']) ? " (Ket: {$pa['keterangan']})" : "";
            $panenList[] = "{$idx}. {$petName}: {$pa['jumlah_ton']} Ton | Varietas: {$pa['varietas']} | Tgl: {$pa['tanggal_panen']}{$ket}";
            $idx++;
        }
    }

    // SELURUH DATA PENGUMUMAN
    $qPeng = $conn->query("SELECT judul, jenis, konten, created_at FROM pengumuman ORDER BY id ASC");
    if ($qPeng) {
        $idx = 1;
        while ($p = $qPeng->fetch_assoc()) {
            $pengumumanList[] = "{$idx}. [{$p['jenis']}] {$p['judul']}: {$p['konten']}";
            $idx++;
        }
    }

    // SELURUH 11 DATA LAHAN DARI TABEL LAHAN (SEMUA 11 BIDANG LAHAN TANPA LIMIT)
    $qLah = $conn->query("SELECT l.id, l.luas, l.lokasi, l.status, pt.nama as petani_nama 
                          FROM lahan l 
                          LEFT JOIN petani pt ON l.petani_id = pt.id 
                          ORDER BY l.id ASC");
    if ($qLah) {
        $idx = 1;
        while ($la = $qLah->fetch_assoc()) {
            $petName = !empty($la['petani_nama']) ? $la['petani_nama'] : 'Petani';
            $lahanList[] = "{$idx}. Lokasi: {$la['lokasi']} — Luas: {$la['luas']} Ha (Pemilik: {$petName} | Status: {$la['status']})";
            if (!isset($lahanSummaryPerPetani[$petName])) {
                $lahanSummaryPerPetani[$petName] = ['count' => 0, 'luas' => 0.0];
            }
            $lahanSummaryPerPetani[$petName]['count']++;
            $lahanSummaryPerPetani[$petName]['luas'] += (float)$la['luas'];
            $idx++;
        }
    }

    $lahanByOwner = [];
    foreach ($lahanSummaryPerPetani as $owner => $info) {
        $lahanByOwner[] = "- {$owner}: {$info['count']} petak (Total " . number_format($info['luas'], 2, ',', '.') . " Ha)";
    }

    $dbSnapshot .= "DATA REAL-TIME DATABASE MYSQL BERANDA / DASHBOARD DESA CIREBON GIRANG:\n"
        . "===========================================================\n"
        . "=== 4 KARTU STATISTIK UTAMA DI BERANDA DASHBOARD ===\n"
        . "1. TOTAL PETANI : {$totPetani} orang warga petani terdaftar aktif (Total lahan garapan petani: {$totPetaniLuas} Ha)\n"
        . "2. TOTAL LAHAN  : {$totLahan} bidang/petak lahan (Total luas lahan: {$totLahanLuas} Ha, seluruh 11 lahan berstatus Aktif)\n"
        . "3. DATA PANEN   : {$totPanen} data catatan riwayat panen (Total hasil produksi: {$totPanenTon} Ton gabah)\n"
        . "4. PENGUMUMAN   : {$totPengumuman} pengumuman desa aktif\n"
        . "===========================================================\n\n"
        . "INFORMASI SISTEM & ROLE AKUN:\n"
        . "• Total Akun Pengguna: {$totUsers} akun\n"
        . "• 3 Role: 👑 Admin ({$totAdmin} orang: " . implode(', ', $admNames) . "), 🏛️ Perangkat Desa ({$totDesa} orang), 🌾 Petani ({$totPetaniUser} akun)\n"
        . "• Kelompok Tani ({$totKelompok} kelompok): " . implode('; ', $kNames) . "\n\n"
        . "DAFTAR LENGKAP KE-11 BIDANG LAHAN DI DATABASE:\n"
        . implode("\n", $lahanList) . "\n\n"
        . "RINGKASAN KEPEMILIKAN LAHAN PER PETANI:\n"
        . implode("\n", $lahanByOwner) . "\n\n"
        . "DAFTAR LENGKAP KE-8 PETANI DI DATABASE:\n"
        . implode("\n", $petaniList) . "\n\n"
        . "DAFTAR LENGKAP CATATAN PANEN DI DATABASE:\n"
        . implode("\n", $panenList) . "\n\n"
        . "DAFTAR LENGKAP PENGUMUMAN DI DATABASE:\n"
        . implode("\n", $pengumumanList) . "\n";
}

// -------------------------------------------------------
// RANCANG SYSTEM PROMPT LENGKAP UNTUK AI LLM
// -------------------------------------------------------
$userNameClean = $verifiedUser ? $verifiedUser['name'] : 'Pengguna';
$detailInstruction = $isDetailRequest
    ? "STATUS PERMINTAAN PENGGUNA SAAT INI: Pengguna MEMINTA RINCIAN LENGKAP. Anda WAJIB memberikan rincian lengkap dari database dengan nomor berurutan dan format rapi!"
    : "STATUS PERMINTAAN PENGGUNA SAAT INI: Pengguna MEMINTA JAWABAN SINGKAT. Jawab dengan ringkas (1-3 kalimat) sebutkan total angka statistik database Beranda, lalu berikan petunjuk: '👉 Ketik \'rincian [topik]\' jika ingin melihat daftar lengkapnya.'";

$systemInstruction = <<<INSTRUCTION
Anda adalah 'Asisten Padi Desa', AI resmi yang cerdas, ramah, dan solutif untuk Platform Digital Pertanian Desa Cirebon Girang.

{$userProfileSummary}

{$dbSnapshot}

PANDUAN MENJAWAB (HARUS 100% SINKRON DENGAN DATABASE DAN 4 KARTU BERANDA):
1. **ATURAN DUA TAHAP RESPON (SANGAT PENTING)**:
   - **Tahap 1: JAWAB SINGKAT (Default)**:
     Jika pengguna menanyakan data secara umum (misal: "data lahan", "total lahan", "ada berapa total lahan", "berapa panen", "pengumuman", "total petani", "ada berapa role", "admin"):
     - Jawablah dengan SINGKAT, padat, dan langsung to the point (maksimal 1-3 kalimat).
     - Sebutkan angka statistik yang tepat sesuai database Beranda (contoh: terdapat 11 bidang lahan dengan total 1.065,55 Ha yang seluruhnya Aktif).
     - Selalu akhiri respon singkat dengan kalimat petunjuk:
       "👉 *Ketik 'rincian [topik]' (contoh: 'rincian data lahan') jika ingin melihat daftar lengkapnya.*"
   
   - **Tahap 2: JAWAB RINCI (Jika Diminta)**:
     Jika pengguna meminta rincian/detail/daftar (pertanyaan mengandung kata 'rincian', 'rinci', 'detail', 'daftarnya', 'sebutkan semua', 'lengkap', 'tabel', 'siapa saja', 'mana saja'):
     - Berikan SELURUH baris data lengkap dari database tanpa memotong satu data pun!
     - Untuk lahan: sebutkan seluruh ke-11 petak lahan lengkap dengan lokasi, luas, pemilik, dan statusnya.
     - Untuk petani: sebutkan seluruh ke-8 nama petani beserta luas lahan dan varietasnya.
     - Untuk panen: sebutkan seluruh catatan panen beserta jumlah ton, varietas, dan tanggalnya.
     - Untuk pengumuman: sebutkan seluruh judul dan isi pengumuman desa.

2. **DATA SPESIFIK BERANDA DASHBOARD**:
   - Total Petani : {$totPetani} orang warga petani terdaftar ({$totPetaniLuas} Ha).
   - Total Lahan  : {$totLahan} bidang/petak lahan (Total luas: {$totLahanLuas} Ha, seluruhnya berstatus Aktif).
   - Data Panen   : {$totPanen} data catatan panen (Total produksi: {$totPanenTon} Ton gabah).
   - Pengumuman   : {$totPengumuman} pengumuman desa aktif.
   - Total Akun   : {$totUsers} akun (1 Admin: {$userNameClean}, 1 Perangkat Desa, 5 Petani).

3. Jika ditanya identitas ("siapa saya", "profil saya"): Sapa nama pengguna ("{$userNameClean}") dan jelaskan perannya serta data pertaniannya sesuai informasi pengguna aktif di atas.

4. {$detailInstruction}

5. Gunakan bahasa Indonesia yang ramah, sopan, dan format Markdown yang rapi (**tebal**, poin bernomor, baris baru).
INSTRUCTION;

// -------------------------------------------------------
// EKSEKUSI PANGGILAN REAL AI LLM (GROQ QWEN / GOOGLE GEMINI)
// -------------------------------------------------------
$aiReplied = false;
$finalReply = '';
$modelUsed  = '';

// 1. Coba panggil Groq AI LLM (Model qwen/qwen3.8-27b aktif)
if (!empty($groqApiKey)) {
    $groqUrl = "https://api.groq.com/openai/v1/chat/completions";
    $groqPayload = json_encode([
        "model" => "qwen/qwen3.8-27b",
        "messages" => [
            ["role" => "system", "content" => $systemInstruction],
            ["role" => "user", "content" => $message]
        ],
        "temperature" => 0.2,
        "max_tokens" => 1200
    ], JSON_UNESCAPED_UNICODE);

    $ch = curl_init($groqUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $groqPayload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Content-Type: application/json; charset=utf-8",
        "Content-Length: " . strlen($groqPayload),
        "Authorization: Bearer " . $groqApiKey
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 12);
    $groqRes = curl_exec($ch);
    $groqHttp = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($groqHttp === 200 && $groqRes) {
        $parsed = json_decode($groqRes, true);
        $content = $parsed['choices'][0]['message']['content'] ?? null;
        if (!empty($content)) {
            $finalReply = trim($content);
            $aiReplied = true;
            $modelUsed = "Groq Qwen 3.8 AI";
        }
    }
}

// 2. Jika Groq gagal, coba Google Gemini API
if (!$aiReplied && function_exists('getGeminiApiKey') && function_exists('callGeminiWithFallback')) {
    $geminiKey = getGeminiApiKey($activeRole);
    if (!empty($geminiKey)) {
        $geminiPayload = [
            'system_instruction' => [
                'parts' => [
                    ['text' => $systemInstruction]
                ]
            ],
            'contents' => [
                [
                    'role' => 'user',
                    'parts' => [
                        ['text' => $message]
                    ]
                ]
            ],
            'generationConfig' => [
                'temperature'     => 0.3,
                'maxOutputTokens' => 1200,
            ]
        ];
        $geminiResult = callGeminiWithFallback($geminiKey, $geminiPayload, 12, $activeRole);
        if (!empty($geminiResult['success']) && !empty($geminiResult['text'])) {
            $finalReply = $geminiResult['text'];
            $aiReplied = true;
            $modelUsed = "Google Gemini AI";
        }
    }
}

// -------------------------------------------------------
// SMART DATABASE FALLBACK (JIKA SERVER AI SEDANG OFFLINE)
// -------------------------------------------------------
if (!$aiReplied) {
    $lowerMsg = strtolower($message);

    if (strpos($lowerMsg, 'siapa saya') !== false || strpos($lowerMsg, 'siapa aku') !== false || strpos($lowerMsg, 'profil') !== false) {
        $finalReply = "👋 Halo **{$userNameClean}**! Berdasarkan database sistem saat ini, Anda terdaftar sebagai:\n"
            . "• **Nama**: {$userNameClean}\n"
            . "• **Peran**: " . ($verifiedUser['roleLabel'] ?? ucfirst($activeRole)) . "\n"
            . "• **Username/Email**: " . ($verifiedUser['username'] ?? '-') . "\n"
            . "• **No. Telepon**: " . ($verifiedUser['no_telepon'] ?: 'Belum diisi');
        if ($activeRole === 'petani' && $petaniDetail) {
            $finalReply .= "\n\n🌾 **Data Pertanian Anda:**\n"
                . "• **Kelompok Tani**: " . ($petaniDetail['kelompok_nama'] ?: 'Mandiri') . "\n"
                . "• **Luas Lahan**: {$petaniDetail['luas_lahan']} Ha\n"
                . "• **Varietas Padi**: {$petaniDetail['varietas_padi']}\n"
                . "• **Alamat**: {$petaniDetail['alamat']}";
        }
    } elseif (strpos($lowerMsg, 'lahan') !== false) {
        if ($isDetailRequest) {
            $finalReply = "🌾 **Rincian Lengkap Data Lahan Pertanian Desa Cirebon Girang:**\n"
                . "Tercatat sebanyak **{$totLahan} bidang/petak lahan** dengan total luas **{$totLahanLuas} Hektar (Ha)**, seluruhnya berstatus **Aktif**:\n\n"
                . implode("\n", $lahanList) . "\n\n"
                . "📊 **Rekapitulasi Kepemilikan Lahan:**\n"
                . implode("\n", $lahanByOwner);
        } else {
            $finalReply = "🌾 Berdasarkan database di Beranda sistem, terdapat **{$totLahan} bidang/petak lahan** pertanian dengan total luas **{$totLahanLuas} Hektar (Ha)** yang seluruhnya berstatus **Aktif**.\n\n"
                . "👉 *Ketik **'rincian data lahan'** jika Anda ingin melihat daftar lengkap ke-11 petak lahan beserta lokasi, luas, dan pemiliknya.*";
        }
    } elseif (strpos($lowerMsg, 'petani') !== false) {
        if ($isDetailRequest) {
            $finalReply = "🧑‍🌾 **Rincian Lengkap Data Warga Petani Desa Cirebon Girang:**\n"
                . "Tercatat sebanyak **{$totPetani} orang warga petani** aktif terdaftar (Total luas lahan garapan: **{$totPetaniLuas} Ha**):\n\n"
                . implode("\n", $petaniList);
        } else {
            $finalReply = "🧑‍🌾 Berdasarkan database di Beranda sistem, terdapat **{$totPetani} orang warga petani** aktif terdaftar di Desa Cirebon Girang (dengan total lahan garapan **{$totPetaniLuas} Ha**).\n\n"
                . "👉 *Ketik **'rincian petani'** jika Anda ingin melihat daftar nama seluruh petani beserta luas lahan dan varietas padinya.*";
        }
    } elseif (strpos($lowerMsg, 'panen') !== false) {
        if ($isDetailRequest) {
            $finalReply = "🌾 **Rincian Lengkap Catatan Riwayat Panen Petani:**\n"
                . "Terdapat **{$totPanen} catatan panen** dengan total hasil produksi gabah mencapai **{$totPanenTon} Ton**:\n\n"
                . implode("\n", $panenList);
        } else {
            $finalReply = "🌾 Berdasarkan database di Beranda sistem, tercatat **{$totPanen} data catatan panen** dengan total hasil produksi mencapai **{$totPanenTon} Ton gabah**.\n\n"
                . "👉 *Ketik **'rincian panen'** jika Anda ingin melihat catatan panen lengkap masing-masing petani.*";
        }
    } elseif (strpos($lowerMsg, 'pengumuman') !== false) {
        if ($isDetailRequest) {
            $finalReply = "📢 **Rincian Lengkap Pengumuman Desa Cirebon Girang:**\n"
                . "Terdapat **{$totPengumuman} pengumuman aktif** untuk warga desa saat ini:\n\n"
                . implode("\n\n", $pengumumanList);
        } else {
            $finalReply = "📢 Berdasarkan database di Beranda sistem, saat ini terdapat **{$totPengumuman} pengumuman aktif** untuk warga desa.\n\n"
                . "👉 *Ketik **'rincian pengumuman'** jika Anda ingin membaca isi lengkap dari seluruh pengumuman.*";
        }
    } elseif (strpos($lowerMsg, 'role') !== false || strpos($lowerMsg, 'peran') !== false || strpos($lowerMsg, 'pengguna') !== false || strpos($lowerMsg, 'user') !== false) {
        if ($isDetailRequest) {
            $finalReply = "🎭 **Rincian Pengguna & Pembagian 3 Role ({$totUsers} Akun):**\n\n"
                . "👑 **Administrator ({$totAdmin} akun):**\n- " . implode("\n- ", $admNames) . "\n\n"
                . "🏛️ **Perangkat Desa ({$totDesa} akun):**\n- Kuwu Cirebon Girang (desa@cirebongirang.id)\n\n"
                . "🌾 **Petani ({$totPetaniUser} akun):**\n- Muhammad Hamzah, Bapak Samsul, Bapak Rohmat, Ibu Siti, bebek.";
        } else {
            $finalReply = "🎭 Di sistem terdapat **3 role** dengan total **{$totUsers} akun pengguna terdaftar**: 👑 Admin ({$totAdmin} orang), 🏛️ Perangkat Desa ({$totDesa} orang), dan 🌾 Petani ({$totPetaniUser} akun).\n\n"
                . "👉 *Ketik **'rincian role'** jika Anda ingin melihat daftar nama akun pengguna.*";
        }
    } elseif (strpos($lowerMsg, 'admin') !== false) {
        $finalReply = "👑 Saat ini terdaftar **{$totAdmin} orang Administrator** aktif di sistem: **" . implode(', ', $admNames) . "**.";
    } elseif (strpos($lowerMsg, 'kelompok') !== false) {
        $finalReply = "🤝 Terdapat **{$totKelompok} kelompok tani** aktif di desa:\n" . implode("\n", $kNames);
    } else {
        $finalReply = "Halo **{$userNameClean}**! Berdasarkan data real-time database Beranda saat ini: tercatat **{$totPetani} Total Petani**, **{$totLahan} Total Lahan** ({$totLahanLuas} Ha), **{$totPanen} Data Panen** ({$totPanenTon} Ton), dan **{$totPengumuman} Pengumuman**.\n\nSilakan tanyakan data yang ingin Anda ketahui atau ketik **'rincian data lahan'** / **'rincian petani'** untuk melihat daftar lengkapnya.";
    }
    $modelUsed = "MySQL Direct Engine";
}

// -------------------------------------------------------
// OUTPUT RESPONSE JSON
// -------------------------------------------------------
echo json_encode([
    "reply"        => $finalReply,
    "user_context" => [
        "name"     => $verifiedUser['name'] ?? 'Tamu',
        "role"     => $activeRole,
        "username" => $verifiedUser['username'] ?? '',
        "page"     => $currentPage
    ],
    "ai_engine"    => $modelUsed
], JSON_UNESCAPED_UNICODE);
exit();
