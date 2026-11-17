<?php
/**
 * =======================================================
 * SYNC API - REALTIME MYSQL DATABASE SYNC
 * Platform Padi Desa Cirebon Girang
 * =======================================================
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$dbHost = 'localhost';
$dbUser = 'root';
$dbPass = '';
$dbName = 'db_petani';

$conn = @new mysqli($dbHost, $dbUser, $dbPass, $dbName);
if ($conn->connect_error) {
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $conn->connect_error,
        'data' => null
    ]);
    exit();
}

$conn->set_charset("utf8mb4");

// ===== GET ALL DATA (PULL FROM MYSQL) =====
if ($method === 'GET') {
    $data = [];

    // 1. Users
    $resUsers = $conn->query("SELECT id, username, name, role, role_label, avatar, created_at, updated_at FROM users ORDER BY id ASC");
    $users = [];
    if ($resUsers) {
        while ($r = $resUsers->fetch_assoc()) {
            $r['id'] = (int)$r['id'];
            $r['roleLabel'] = $r['role_label'] ?: $r['role'];
            $users[] = $r;
        }
    }
    $data['users'] = $users;

    // 2. Petani
    $resPetani = $conn->query("SELECT p.*, k.nama as kelompok_nama FROM petani p LEFT JOIN kelompok_tani k ON p.kelompok_tani_id = k.id ORDER BY p.id ASC");
    $petani = [];
    if ($resPetani) {
        while ($r = $resPetani->fetch_assoc()) {
            $r['id'] = is_numeric($r['id']) ? (int)$r['id'] : $r['id'];
            $r['luas_lahan'] = (float)$r['luas_lahan'];
            if (!empty($r['user_id'])) $r['user_id'] = (int)$r['user_id'];
            $petani[] = $r;
        }
    }
    $data['petani'] = $petani;

    // 3. Kelompok Tani
    $resKelompok = $conn->query("SELECT * FROM kelompok_tani ORDER BY id ASC");
    $kelompok = [];
    if ($resKelompok) {
        while ($r = $resKelompok->fetch_assoc()) {
            $r['id'] = is_numeric($r['id']) ? (int)$r['id'] : $r['id'];
            $r['anggota'] = (int)$r['anggota'];
            $kelompok[] = $r;
        }
    }
    $data['kelompok_tani'] = $kelompok;

    // 4. Lahan
    $resLahan = $conn->query("SELECT l.*, p.nama as petani_nama FROM lahan l LEFT JOIN petani p ON l.petani_id = p.id ORDER BY l.id ASC");
    $lahan = [];
    if ($resLahan) {
        while ($r = $resLahan->fetch_assoc()) {
            $r['id'] = is_numeric($r['id']) ? (int)$r['id'] : $r['id'];
            $r['luas'] = (float)$r['luas'];
            $lahan[] = $r;
        }
    }
    $data['lahan'] = $lahan;

    // 5. Panen
    $resPanen = $conn->query("SELECT pn.*, p.nama as petani_nama FROM panen pn LEFT JOIN petani p ON pn.petani_id = p.id ORDER BY pn.id ASC");
    $panen = [];
    if ($resPanen) {
        while ($r = $resPanen->fetch_assoc()) {
            $r['id'] = is_numeric($r['id']) ? (int)$r['id'] : $r['id'];
            $r['jumlah_ton'] = (float)$r['jumlah_ton'];
            $r['luas_panen'] = (float)$r['luas_panen'];
            $panen[] = $r;
        }
    }
    $data['panen'] = $panen;

    // 6. Pengumuman
    $resPengumuman = $conn->query("SELECT pg.*, u.name as author_name FROM pengumuman pg LEFT JOIN users u ON pg.created_by = u.id ORDER BY pg.created_at DESC");
    $pengumuman = [];
    if ($resPengumuman) {
        while ($r = $resPengumuman->fetch_assoc()) {
            $r['id'] = is_numeric($r['id']) ? (int)$r['id'] : $r['id'];
            $pengumuman[] = $r;
        }
    }
    $data['pengumuman'] = $pengumuman;

    echo json_encode([
        'success' => true,
        'message' => 'Real-time database sync berhasil',
        'data' => $data,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit();
}

// ===== POST DATA (PUSH TO MYSQL) =====
if ($method === 'POST') {
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, true) ?: [];

    $action = $input['action'] ?? 'save'; // save | delete
    $entity = $input['entity'] ?? ''; // petani | kelompok | lahan | panen | pengumuman
    $payload = $input['data'] ?? [];

    if (empty($entity) || empty($payload)) {
        echo json_encode(['success' => false, 'message' => 'Invalid parameters']);
        exit();
    }

    try {
        if ($entity === 'petani') {
            $id = !empty($payload['id']) && is_numeric($payload['id']) ? (int)$payload['id'] : 0;
            $nama = $conn->real_escape_string($payload['nama'] ?? '');
            $nik = $conn->real_escape_string($payload['nik'] ?? '');
            $alamat = $conn->real_escape_string($payload['alamat'] ?? '');
            $telp = $conn->real_escape_string($payload['no_telepon'] ?? '');
            $kid = !empty($payload['kelompok_tani_id']) ? (int)$payload['kelompok_tani_id'] : "NULL";
            $luas = (float)($payload['luas_lahan'] ?? 0);
            $varietas = $conn->real_escape_string($payload['varietas_padi'] ?? '');
            $uid = !empty($payload['user_id']) ? (int)$payload['user_id'] : "NULL";

            if ($action === 'delete' && $id > 0) {
                $conn->query("DELETE FROM petani WHERE id = $id");
            } elseif ($id > 0) {
                $check = $conn->query("SELECT * FROM petani WHERE id = $id");
                if ($check && $check->num_rows > 0) {
                    $existing = $check->fetch_assoc();
                    $nama = isset($payload['nama']) && $payload['nama'] !== '' ? $conn->real_escape_string($payload['nama']) : $conn->real_escape_string($existing['nama'] ?? '');
                    $nik = isset($payload['nik']) && $payload['nik'] !== '' ? $conn->real_escape_string($payload['nik']) : $conn->real_escape_string($existing['nik'] ?? '');
                    $alamat = isset($payload['alamat']) && $payload['alamat'] !== '' ? $conn->real_escape_string($payload['alamat']) : $conn->real_escape_string($existing['alamat'] ?? '');
                    $telp = isset($payload['no_telepon']) && $payload['no_telepon'] !== '' ? $conn->real_escape_string($payload['no_telepon']) : $conn->real_escape_string($existing['no_telepon'] ?? '');
                    $kid = isset($payload['kelompok_tani_id']) && $payload['kelompok_tani_id'] !== '' ? (int)$payload['kelompok_tani_id'] : (!empty($existing['kelompok_tani_id']) ? (int)$existing['kelompok_tani_id'] : "NULL");
                    $luas = isset($payload['luas_lahan']) ? (float)$payload['luas_lahan'] : (float)($existing['luas_lahan'] ?? 0);
                    $varietas = isset($payload['varietas_padi']) && $payload['varietas_padi'] !== '' ? $conn->real_escape_string($payload['varietas_padi']) : $conn->real_escape_string($existing['varietas_padi'] ?? 'Ciherang');
                    $uid = isset($payload['user_id']) && $payload['user_id'] !== '' ? (int)$payload['user_id'] : (!empty($existing['user_id']) ? (int)$existing['user_id'] : "NULL");

                    $conn->query("UPDATE petani SET nama='$nama', nik='$nik', alamat='$alamat', no_telepon='$telp', kelompok_tani_id=$kid, luas_lahan=$luas, varietas_padi='$varietas', user_id=$uid, updated_at=NOW() WHERE id=$id");
                } else {
                    $conn->query("INSERT INTO petani (id, nama, nik, alamat, no_telepon, kelompok_tani_id, luas_lahan, varietas_padi, created_at, updated_at) VALUES ($id, '$nama', '$nik', '$alamat', '$telp', $kid, $luas, '$varietas', NOW(), NOW())");
                }
            } else {
                $conn->query("INSERT INTO petani (nama, nik, alamat, no_telepon, kelompok_tani_id, luas_lahan, varietas_padi, created_at, updated_at) VALUES ('$nama', '$nik', '$alamat', '$telp', $kid, $luas, '$varietas', NOW(), NOW())");
                $id = $conn->insert_id;
            }
        } elseif ($entity === 'lahan') {
            $id = !empty($payload['id']) && is_numeric($payload['id']) ? (int)$payload['id'] : 0;
            $pid = !empty($payload['petani_id']) ? (int)$payload['petani_id'] : "NULL";
            $luas = (float)($payload['luas'] ?? 0);
            $lokasi = $conn->real_escape_string($payload['lokasi'] ?? '');
            $status = $conn->real_escape_string($payload['status'] ?? 'Aktif');

            if ($action === 'delete' && $id > 0) {
                $conn->query("DELETE FROM lahan WHERE id = $id");
            } elseif ($id > 0) {
                $check = $conn->query("SELECT * FROM lahan WHERE id = $id");
                if ($check && $check->num_rows > 0) {
                    $existingL = $check->fetch_assoc();
                    if ($pid === "NULL" && !empty($existingL['petani_id'])) {
                        $pid = (int)$existingL['petani_id'];
                    }
                    if (empty($lokasi) && !empty($existingL['lokasi'])) {
                        $lokasi = $conn->real_escape_string($existingL['lokasi']);
                    }
                    $conn->query("UPDATE lahan SET petani_id=$pid, luas=$luas, lokasi='$lokasi', status='$status', updated_at=NOW() WHERE id=$id");
                } else {
                    $conn->query("INSERT INTO lahan (id, petani_id, luas, lokasi, status, created_at, updated_at) VALUES ($id, $pid, $luas, '$lokasi', '$status', NOW(), NOW())");
                }
            } else {
                $conn->query("INSERT INTO lahan (petani_id, luas, lokasi, status, created_at, updated_at) VALUES ($pid, $luas, '$lokasi', '$status', NOW(), NOW())");
                $id = $conn->insert_id;
            }
        } elseif ($entity === 'panen') {
            $id = !empty($payload['id']) && is_numeric($payload['id']) ? (int)$payload['id'] : 0;
            $pid = !empty($payload['petani_id']) ? (int)$payload['petani_id'] : "NULL";
            $tgl = $conn->real_escape_string($payload['tanggal_panen'] ?? date('Y-m-d'));
            $jml = (float)($payload['jumlah_ton'] ?? 0);
            $luas = (float)($payload['luas_panen'] ?? 0);
            $var = $conn->real_escape_string($payload['varietas'] ?? '');
            $ket = $conn->real_escape_string($payload['keterangan'] ?? '');

            if ($action === 'delete' && $id > 0) {
                $conn->query("DELETE FROM panen WHERE id = $id");
            } elseif ($id > 0) {
                $check = $conn->query("SELECT id FROM panen WHERE id = $id");
                if ($check && $check->num_rows > 0) {
                    $conn->query("UPDATE panen SET petani_id=$pid, tanggal_panen='$tgl', jumlah_ton=$jml, luas_panen=$luas, varietas='$var', keterangan='$ket', updated_at=NOW() WHERE id=$id");
                } else {
                    $conn->query("INSERT INTO panen (id, petani_id, tanggal_panen, jumlah_ton, luas_panen, varietas, keterangan, created_at, updated_at) VALUES ($id, $pid, '$tgl', $jml, $luas, '$var', '$ket', NOW(), NOW())");
                }
            } else {
                $conn->query("INSERT INTO panen (petani_id, tanggal_panen, jumlah_ton, luas_panen, varietas, keterangan, created_at, updated_at) VALUES ($pid, '$tgl', $jml, $luas, '$var', '$ket', NOW(), NOW())");
                $id = $conn->insert_id;
            }
        } elseif ($entity === 'kelompok') {
            $id = !empty($payload['id']) && is_numeric($payload['id']) ? (int)$payload['id'] : 0;
            $nama = $conn->real_escape_string($payload['nama'] ?? '');
            $ketua = $conn->real_escape_string($payload['ketua'] ?? '');
            $anggota = (int)($payload['anggota'] ?? 0);
            $desa = $conn->real_escape_string($payload['desa'] ?? 'Cirebon Girang');

            if ($action === 'delete' && $id > 0) {
                $conn->query("DELETE FROM kelompok_tani WHERE id = $id");
            } elseif ($id > 0) {
                $check = $conn->query("SELECT id FROM kelompok_tani WHERE id = $id");
                if ($check && $check->num_rows > 0) {
                    $conn->query("UPDATE kelompok_tani SET nama='$nama', ketua='$ketua', anggota=$anggota, desa='$desa', updated_at=NOW() WHERE id=$id");
                } else {
                    $conn->query("INSERT INTO kelompok_tani (id, nama, ketua, anggota, desa, created_at, updated_at) VALUES ($id, '$nama', '$ketua', $anggota, '$desa', NOW(), NOW())");
                }
            } else {
                $conn->query("INSERT INTO kelompok_tani (nama, ketua, anggota, desa, created_at, updated_at) VALUES ('$nama', '$ketua', $anggota, '$desa', NOW(), NOW())");
                $id = $conn->insert_id;
            }
        } elseif ($entity === 'pengumuman') {
            $id = !empty($payload['id']) && is_numeric($payload['id']) ? (int)$payload['id'] : 0;
            $judul = $conn->real_escape_string($payload['judul'] ?? '');
            $konten = $conn->real_escape_string($payload['konten'] ?? '');
            $jenis = $conn->real_escape_string($payload['jenis'] ?? 'Informasi');
            $cb = !empty($payload['created_by']) ? (int)$payload['created_by'] : 1;

            if ($action === 'delete' && $id > 0) {
                $conn->query("DELETE FROM pengumuman WHERE id = $id");
            } elseif ($id > 0) {
                $check = $conn->query("SELECT id FROM pengumuman WHERE id = $id");
                if ($check && $check->num_rows > 0) {
                    $conn->query("UPDATE pengumuman SET judul='$judul', konten='$konten', jenis='$jenis', updated_at=NOW() WHERE id=$id");
                } else {
                    $conn->query("INSERT INTO pengumuman (id, judul, konten, jenis, created_by, created_at, updated_at) VALUES ($id, '$judul', '$konten', '$jenis', $cb, NOW(), NOW())");
                }
            } else {
                $conn->query("INSERT INTO pengumuman (judul, konten, jenis, created_by, created_at, updated_at) VALUES ('$judul', '$konten', '$jenis', $cb, NOW(), NOW())");
                $id = $conn->insert_id;
            }
        }

        echo json_encode(['success' => true, 'message' => 'Sync MySQL berhasil']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => $e->getMessage()]);
    }
}
