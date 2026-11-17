<?php
/**
 * =======================================================
 * API KONFIGURASI AI & MULTI-KEY ROTATION (ADMIN ONLY)
 * Platform Padi Desa Cirebon Girang
 * =======================================================
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Chat-Token, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$configFilePath = __DIR__ . '/../includes/ai_runtime_config.json';

// Helper function to read config
function getRuntimeConfig($filePath) {
    if (file_exists($filePath)) {
        $raw = file_get_contents($filePath);
        $json = json_decode($raw, true);
        if (is_array($json)) {
            return $json;
        }
    }
    
    // Default fallback
    return [
        'active_model'  => 'gemini-1.5-flash',
        'temperature'   => 0.3,
        'provider'      => 'gemini',
        'auto_failover' => true,
        'updated_at'    => date('Y-m-d H:i:s'),
        'api_keys'      => [
            [
                'id'        => 'key_primary',
                'label'     => 'Google Gemini - Kunci Utama (Akun 1)',
                'provider'  => 'gemini',
                'key'       => 'YOUR_GEMINI_API_KEY_1',
                'is_active' => true,
                'status'    => 'ready'
            ],
            [
                'id'        => 'key_backup_1',
                'label'     => 'Google Gemini - Kunci Cadangan 1 (Akun 2)',
                'provider'  => 'gemini',
                'key'       => 'YOUR_GEMINI_API_KEY_2',
                'is_active' => false,
                'status'    => 'standby'
            ],
            [
                'id'        => 'key_backup_2',
                'label'     => 'Google Gemini - Kunci Cadangan 2 (Akun 3)',
                'provider'  => 'gemini',
                'key'       => 'YOUR_GEMINI_API_KEY_3',
                'is_active' => false,
                'status'    => 'standby'
            ]
        ]
    ];
}

// Helper to mask key for safe display (e.g. AIzaSy...9xYz)
function maskApiKey($key) {
    if (empty($key)) return '';
    $len = strlen($key);
    if ($len <= 10) return str_repeat('*', $len);
    return substr($key, 0, 7) . '...' . substr($key, -4);
}

// Function to test an API Key with provider
function testApiKeyWithProvider($key, $provider = 'gemini', $model = 'gemini-1.5-flash') {
    if (empty($key)) {
        return [
            'valid' => false,
            'http_code' => 0,
            'latency_ms' => 0,
            'is_placeholder' => true,
            'message' => 'API Key masih kosong.'
        ];
    }

    // Deteksi kunci dummy bawaan / sampel
    if (str_starts_with($key, 'AQ.Ab8') || str_starts_with($key, 'dummy') || str_contains($key, 'placeholder')) {
        return [
            'valid' => false,
            'http_code' => 400,
            'latency_ms' => 0,
            'is_placeholder' => true,
            'message' => 'Kunci masih berupa contoh/dummy. Silakan klik + Tambah Kunci untuk memasukkan API Key asli.'
        ];
    }

    $startTime = microtime(true);

    if ($provider === 'gemini') {
        $endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' . urlencode($model) . ':generateContent?key=' . urlencode($key);
        $payload = [
            'contents' => [
                [
                    'parts' => [
                        ['text' => 'Ping. Jawab "OK".']
                    ]
                ]
            ],
            'generationConfig' => [
                'maxOutputTokens' => 5
            ]
        ];

        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 4);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);

        $res = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        $latency = round((microtime(true) - $startTime) * 1000);

        if ($httpCode === 200) {
            return [
                'valid' => true,
                'http_code' => 200,
                'latency_ms' => $latency,
                'message' => "Koneksi Berhasil! API Key Aktif & Siap Digunakan ($latency ms)."
            ];
        } elseif ($httpCode === 429) {
            return [
                'valid' => false,
                'http_code' => 429,
                'latency_ms' => $latency,
                'message' => 'Kuota Habis / Terkena Limit (Rate Limit Exceeded - 429).'
            ];
        } elseif ($httpCode === 400 || $httpCode === 401 || $httpCode === 403) {
            $parsed = json_decode($res, true);
            $errMsg = $parsed['error']['message'] ?? 'API Key tidak valid atau tidak memiliki izin.';
            return [
                'valid' => false,
                'http_code' => $httpCode,
                'latency_ms' => $latency,
                'message' => "Kunci Ditolak ($httpCode): $errMsg"
            ];
        } else {
            return [
                'valid' => false,
                'http_code' => $httpCode,
                'latency_ms' => $latency,
                'message' => "Koneksi Gagal ($httpCode): " . ($curlErr ?: 'Server tidak merespons.')
            ];
        }
    } elseif ($provider === 'openai' || $provider === 'groq' || $provider === 'openrouter' || $provider === 'deepseek') {
        // Generic OpenAI Compatible Endpoint
        $url = 'https://api.openai.com/v1/models';
        if ($provider === 'groq') $url = 'https://api.groq.com/openai/v1/models';
        if ($provider === 'openrouter') $url = 'https://openrouter.ai/api/v1/models';
        if ($provider === 'deepseek') $url = 'https://api.deepseek.com/models';

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $key,
            'Content-Type: application/json'
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 4);
        curl_setopt($ch, CURLOPT_TIMEOUT, 8);

        $res = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $latency = round((microtime(true) - $startTime) * 1000);

        if ($httpCode === 200) {
            return [
                'valid' => true,
                'http_code' => 200,
                'latency_ms' => $latency,
                'message' => "Koneksi Berhasil! API Key $provider Valid ($latency ms)."
            ];
        } else {
            return [
                'valid' => false,
                'http_code' => $httpCode,
                'latency_ms' => $latency,
                'message' => "Koneksi Gagal ($httpCode): Periksa kembali API Key $provider."
            ];
        }
    }

    return [
        'valid' => false,
        'http_code' => 0,
        'latency_ms' => 0,
        'message' => 'Provider tidak didukung.'
    ];
}

$action = $_GET['action'] ?? '';

// 1. GET: Ambil Konfigurasi
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $config = getRuntimeConfig($configFilePath);
    
    // Masking kunci untuk response JSON jika diminta bukan full
    $unmasked = isset($_GET['full']) && $_GET['full'] === '1';
    
    $safeConfig = $config;
    if (!$unmasked) {
        foreach ($safeConfig['api_keys'] as &$k) {
            $k['raw_key_preview'] = maskApiKey($k['key']);
            // Sertakan status apakah key sudah terisi
            $k['is_set'] = !empty($k['key']);
        }
    }

    echo json_encode([
        'success' => true,
        'data'    => $safeConfig
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit();
}

// 2. POST Actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $inputRaw = file_get_contents('php://input');
    $input = json_decode($inputRaw, true) ?: [];

    // A. TEST SINGLE KEY
    if ($action === 'test_key') {
        $key = trim($input['key'] ?? '');
        $provider = trim($input['provider'] ?? 'gemini');
        $model = trim($input['model'] ?? 'gemini-1.5-flash');

        $result = testApiKeyWithProvider($key, $provider, $model);
        echo json_encode([
            'success' => $result['valid'],
            'result'  => $result
        ]);
        exit();
    }

    // B. TEST ALL KEYS IN CONFIG
    if ($action === 'test_all') {
        $config = getRuntimeConfig($configFilePath);
        $model = $config['active_model'] ?? 'gemini-1.5-flash';
        $results = [];

        foreach ($config['api_keys'] as $k) {
            $testRes = testApiKeyWithProvider($k['key'], $k['provider'] ?? 'gemini', $model);
            $results[] = [
                'id'         => $k['id'],
                'label'      => $k['label'],
                'provider'   => $k['provider'] ?? 'gemini',
                'valid'      => $testRes['valid'],
                'http_code'  => $testRes['http_code'],
                'latency_ms' => $testRes['latency_ms'],
                'message'    => $testRes['message']
            ];
        }

        echo json_encode([
            'success' => true,
            'results' => $results
        ]);
        exit();
    }

    // C. SAVE CONFIGURATION
    $config = getRuntimeConfig($configFilePath);

    if (isset($input['active_model'])) {
        $config['active_model'] = trim($input['active_model']);
    }
    if (isset($input['temperature'])) {
        $config['temperature'] = floatval($input['temperature']);
    }
    if (isset($input['auto_failover'])) {
        $config['auto_failover'] = (bool)$input['auto_failover'];
    }
    if (isset($input['api_keys']) && is_array($input['api_keys'])) {
        // Merge & sanitize keys
        $sanitizedKeys = [];
        foreach ($input['api_keys'] as $idx => $k) {
            $keyVal = trim($k['key'] ?? '');
            
            // Jika key dikirim dalam keadaan termask ('AIza...'), pertahankan key lama
            if (str_contains($keyVal, '...')) {
                // cari key lama dengan id sama
                foreach ($config['api_keys'] as $oldKey) {
                    if (($oldKey['id'] ?? '') === ($k['id'] ?? '')) {
                        $keyVal = $oldKey['key'];
                        break;
                    }
                }
            }

            $sanitizedKeys[] = [
                'id'        => !empty($k['id']) ? $k['id'] : 'key_' . ($idx + 1),
                'label'     => !empty($k['label']) ? trim($k['label']) : "Kunci Cadangan " . ($idx + 1),
                'provider'  => !empty($k['provider']) ? trim($k['provider']) : 'gemini',
                'key'       => $keyVal,
                'is_active' => (bool)($k['is_active'] ?? ($idx === 0)),
                'status'    => !empty($keyVal) ? 'ready' : 'empty'
            ];
        }
        $config['api_keys'] = $sanitizedKeys;
    }

    $config['updated_at'] = date('Y-m-d H:i:s');

    $saved = file_put_contents($configFilePath, json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    // Also sync to nested folder if exists
    $nestedPath = __DIR__ . '/../Padi Desa/includes/ai_runtime_config.json';
    if (file_exists(dirname($nestedPath))) {
        @file_put_contents($nestedPath, json_encode($config, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    if ($saved !== false) {
        echo json_encode([
            'success' => true,
            'message' => 'Konfigurasi AI dan Kunci Cadangan berhasil disimpan!',
            'data'    => $config
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Gagal menulis file konfigurasi pada server.'
        ]);
    }
    exit();
}

