<?php
// includes/gemini_config.php

// ============================================
// 1. RUNTIME CONFIGURATION LOADER (DYNAMIC)
// ============================================
function getAiRuntimeConfig(): ?array {
    $paths = [
        __DIR__ . '/ai_runtime_config.json',
        __DIR__ . '/../includes/ai_runtime_config.json',
        __DIR__ . '/../../includes/ai_runtime_config.json'
    ];
    foreach ($paths as $p) {
        if (file_exists($p)) {
            $data = json_decode(file_get_contents($p), true);
            if (is_array($data)) return $data;
        }
    }
    return null;
}

// ============================================
// 2. HARDCODED FALLBACK API KEYS
// ============================================
define('GEMINI_API_KEY_ADMIN',  'YOUR_GEMINI_API_KEY_ADMIN');
define('GEMINI_API_KEY_DESA',   'YOUR_GEMINI_API_KEY_DESA');
define('GEMINI_API_KEY_PETANI', 'YOUR_GEMINI_API_KEY_PETANI');

// Base URL Gemini API
define('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta/models/');

// Default Models Priority
define('GEMINI_MODELS_PRIORITY', json_encode([
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-pro',
]));

define('GEMINI_MODEL', 'gemini-1.5-flash');
define('GEMINI_ENDPOINT', GEMINI_BASE_URL . GEMINI_MODEL . ':generateContent');

// ============================================
// 3. FUNGSI AMBIL SEMUA API KEYS AKTIF & CADANGAN
// ============================================
function getAllGeminiCandidateKeys(string $role = 'petani'): array {
    $cfg = getAiRuntimeConfig();
    $keys = [];

    if ($cfg && !empty($cfg['api_keys']) && is_array($cfg['api_keys'])) {
        // Urutkan kunci: yang is_active = true terlebih dahulu
        $primaryKeys = [];
        $standbyKeys = [];

        foreach ($cfg['api_keys'] as $k) {
            $val = trim($k['key'] ?? '');
            if (!empty($val)) {
                if (!empty($k['is_active'])) {
                    $primaryKeys[] = $val;
                } else {
                    $standbyKeys[] = $val;
                }
            }
        }
        $keys = array_merge($primaryKeys, $standbyKeys);
    }

    // Tambahkan fallback key bawaan jika belum ada di list
    $fallbackRoleKey = getGeminiApiKey($role);
    if (!empty($fallbackRoleKey) && !in_array($fallbackRoleKey, $keys)) {
        $keys[] = $fallbackRoleKey;
    }

    return array_unique($keys);
}

// ============================================
// 4. FUNGSI PEMILIH API KEY BERDASARKAN ROLE & RUNTIME CONFIG
// ============================================
function getGeminiApiKey(string $role): string {
    // 1. Prioritaskan kunci aktif dari ai_runtime_config.json (yang diatur Admin)
    $cfg = getAiRuntimeConfig();
    if ($cfg && !empty($cfg['api_keys']) && is_array($cfg['api_keys'])) {
        foreach ($cfg['api_keys'] as $k) {
            $keyVal = trim($k['key'] ?? '');
            if (!empty($keyVal) && !empty($k['is_active'])) {
                return $keyVal;
            }
        }
        // Jika belum ada yang ditandai aktif, ambil kunci pertama yang terisi
        foreach ($cfg['api_keys'] as $k) {
            $keyVal = trim($k['key'] ?? '');
            if (!empty($keyVal)) {
                return $keyVal;
            }
        }
    }

    // 2. Fallback ke kunci bawaan per role
    $role = strtolower(trim($role));
    if ($role === 'admin') {
        return GEMINI_API_KEY_ADMIN;
    } elseif (in_array($role, ['perangkat', 'perangkat_desa', 'desa', 'pamong', 'aparatur'])) {
        return GEMINI_API_KEY_DESA;
    }
    return GEMINI_API_KEY_PETANI;
}

// ============================================
// 5. CALL GEMINI DENGAN MULTI-KEY ROTATION & AUTO-FAILOVER
// ============================================
function callGeminiWithFallback(string $apiKey, array $payload, int $timeout = 15, string $role = 'petani'): array {
    $cfg = getAiRuntimeConfig();
    $preferredModel = $cfg['active_model'] ?? 'gemini-1.5-flash';

    // Model list: prioritaskan model yang dipilih di panel admin
    $defaultModels = json_decode(GEMINI_MODELS_PRIORITY, true);
    $modelsToTry = [$preferredModel];
    foreach ($defaultModels as $m) {
        if (!in_array($m, $modelsToTry)) {
            $modelsToTry[] = $m;
        }
    }

    // Ambil daftar kunci cadangan untuk auto-failover
    $keysToTry = getAllGeminiCandidateKeys($role);
    if (!empty($apiKey) && !in_array($apiKey, $keysToTry)) {
        array_unshift($keysToTry, $apiKey);
    }

    $lastError = '';

    // Loop rotasi kunci (Jika Kunci 1 kena limit 429, otomatis coba Kunci 2 / cadangan)
    foreach ($keysToTry as $currentKey) {
        if (empty($currentKey)) continue;

        // Skip jika kunci adalah placeholder dummy bawaan (agar respons instan & tidak timeout)
        if (str_starts_with($currentKey, 'AQ.Ab8') || str_starts_with($currentKey, 'dummy') || str_contains($currentKey, 'placeholder')) {
            $lastError = 'API Key masih berupa sampel placeholder. Masukkan kunci asli dari Google AI Studio.';
            continue;
        }

        foreach ($modelsToTry as $model) {
            $endpoint = GEMINI_BASE_URL . urlencode($model) . ':generateContent?key=' . urlencode($currentKey);
            
            $ch = curl_init($endpoint);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
            curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200 && $response) {
                $parsed = json_decode($response, true);
                $text = $parsed['candidates'][0]['content']['parts'][0]['text'] ?? null;
                if (!empty($text)) {
                    return [
                        'success'  => true,
                        'text'     => trim($text),
                        'model'    => $model,
                        'key_used' => substr($currentKey, 0, 7) . '...',
                        'error'    => ''
                    ];
                }
            }

            // Jika limit 429 atau 401/403, catat dan beralih ke KUNCI CADANGAN berikutnya
            if (in_array($httpCode, [429, 401, 403])) {
                $errData = json_decode($response, true);
                $lastError = "Key " . substr($currentKey, 0, 7) . "... Error ($httpCode): " . ($errData['error']['message'] ?? 'Quota / Auth Error');
                // Langsung break model loop untuk pindah ke Kunci Cadangan berikutnya!
                break;
            }

            // 404 = model tidak ditemukan, lanjut coba model berikutnya dengan kunci yang sama
        }
    }

    return [
        'success' => false,
        'text'    => '',
        'model'   => '',
        'error'   => $lastError ?: 'Semua kunci & model tidak merespons.'
    ];
}
?>