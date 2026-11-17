<?php
/**
 * DEBUG ENDPOINT – Hanya untuk testing, hapus setelah selesai
 * URL: http://localhost/Padi%20Desa%20(2)/Padi%20Desa/api/chat_debug.php
 */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Chat-Token");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

// DB
$conn = @new mysqli('localhost','root','','db_petani');
$dbOk = !$conn->connect_error;
if ($dbOk) $conn->set_charset('utf8mb4');

// Baca input
$inputJSON   = file_get_contents('php://input');
$input       = json_decode($inputJSON, true) ?: [];
$headers     = function_exists('getallheaders') ? getallheaders() : [];
$tokenRaw    = $headers['X-Chat-Token'] ?? $headers['Authorization'] ?? ($input['token'] ?? '');
$tokenRaw    = str_replace('Bearer ','',$tokenRaw);
$frontendUser= (isset($input['user']) && is_array($input['user'])) ? $input['user'] : null;

// Decode token
$decodedToken = null;
if (!empty($tokenRaw)) {
    $decodedToken = @json_decode(base64_decode($tokenRaw), true);
}

// Resolve user
$resolvedId       = 0;
$resolvedUsername = '';
$verifiedUser     = null;

if (!empty($decodedToken['user_id']) && isset($decodedToken['exp']) && $decodedToken['exp'] > time()) {
    $resolvedId = (int)$decodedToken['user_id'];
}
if (!empty($decodedToken['username']) && $resolvedId === 0) {
    $resolvedUsername = $decodedToken['username'];
}
if ($resolvedId === 0 && $frontendUser) {
    $resolvedId = (int)($frontendUser['id'] ?? 0);
}
if ($resolvedId === 0 && empty($resolvedUsername) && $frontendUser) {
    $resolvedUsername = trim((string)($frontendUser['username'] ?? ''));
}

// Query DB
$dbUserResult = null;
if ($dbOk && $resolvedId > 0) {
    $stmt = $conn->prepare("SELECT id, username, name, role FROM users WHERE id = ? LIMIT 1");
    $stmt->bind_param('i', $resolvedId);
    $stmt->execute();
    $r = $stmt->get_result();
    if ($r && $r->num_rows > 0) $dbUserResult = $r->fetch_assoc();
    $stmt->close();
}
if ($dbOk && !$dbUserResult && !empty($resolvedUsername)) {
    $stmt = $conn->prepare("SELECT id, username, name, role FROM users WHERE username = ? LIMIT 1");
    $stmt->bind_param('s', $resolvedUsername);
    $stmt->execute();
    $r = $stmt->get_result();
    if ($r && $r->num_rows > 0) $dbUserResult = $r->fetch_assoc();
    $stmt->close();
}

// All users in DB
$allUsers = [];
if ($dbOk) {
    $res = $conn->query("SELECT id, username, name, role FROM users ORDER BY id ASC");
    if ($res) while ($row = $res->fetch_assoc()) $allUsers[] = $row;
}

// Petani linked to resolved user
$petaniData = null;
if ($dbOk && $dbUserResult) {
    $uid = (int)$dbUserResult['id'];
    $stmt = $conn->prepare("SELECT p.nama, p.no_telepon, p.luas_lahan, p.varietas_padi, k.nama as kelompok FROM petani p LEFT JOIN kelompok_tani k ON p.kelompok_tani_id=k.id WHERE p.user_id=? LIMIT 1");
    $stmt->bind_param('i', $uid);
    $stmt->execute();
    $r = $stmt->get_result();
    if ($r && $r->num_rows > 0) $petaniData = $r->fetch_assoc();
    $stmt->close();
}

echo json_encode([
    'db_connected'      => $dbOk,
    'db_error'          => $conn->connect_error ?? null,
    'token_raw_preview' => $tokenRaw ? substr($tokenRaw,0,30).'...' : '(empty)',
    'token_decoded'     => $decodedToken,
    'token_expired'     => (!empty($decodedToken['exp']) && $decodedToken['exp'] < time()) ? 'YES' : 'NO',
    'frontend_user_sent'=> $frontendUser,
    'resolved_id'       => $resolvedId,
    'resolved_username' => $resolvedUsername,
    'db_user_found'     => $dbUserResult,
    'petani_data'       => $petaniData,
    'all_users_in_db'   => $allUsers,
    'input_received'    => [
        'message' => $input['message'] ?? '(none)',
        'has_user' => isset($input['user']),
        'has_token'=> !empty($input['token']),
    ]
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
?>

