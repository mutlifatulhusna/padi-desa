<?php
/**
 * ========================================
 * DATABASE CONFIGURATION
 * Platform Padi Desa Cirebon Girang
 * ========================================
 */

// Database configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', ''); // Kosongkan jika pakai Laragon default
define('DB_NAME', 'db_petani');

// API configuration
define('API_KEY', 'padi_desa_2026_secret_key');
define('CORS_ORIGIN', '*');

// Set header untuk CORS
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . CORS_ORIGIN);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/**
 * Get database connection
 * @return mysqli
 */
function getDBConnection() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    if ($conn->connect_error) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Database connection failed: ' . $conn->connect_error
        ]);
        exit();
    }
    
    // Set charset to UTF-8
    $conn->set_charset('utf8mb4');
    
    return $conn;
}

/**
 * Send JSON response
 * @param bool $success
 * @param string $message
 * @param array $data
 * @param int $statusCode
 */
function sendResponse($success, $message = '', $data = [], $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    exit();
}

/**
 * Validate API Key
 */
function validateAPIKey() {
    $headers = getallheaders();
    $apiKey = isset($headers['X-API-Key']) ? $headers['X-API-Key'] : '';
    
    if ($apiKey !== API_KEY) {
        sendResponse(false, 'Invalid API Key', [], 401);
    }
}
?>