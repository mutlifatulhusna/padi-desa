<?php
// includes/fonnte_config.php
// Konfigurasi WhatsApp Gateway Fonnte - Platform Padi Desa Cirebon Girang

define('FONNTE_TOKEN', 'NAgYjhcnJWZ6KwXKWNGi');
define('FONNTE_API_URL', 'https://api.fonnte.com/send');
define('FONNTE_DEVICE_URL', 'https://api.fonnte.com/device');

/**
 * Mengirim pesan WhatsApp via Fonnte
 * @param string|array $targets Nomor tujuan (contoh: '08123456789' atau ['0812...', '0857...'])
 * @param string $message Isi pesan
 * @return array Hasil respons dari Fonnte
 */
function sendFonnteWhatsApp($targets, $message) {
    if (is_array($targets)) {
        $targets = implode(',', $targets);
    }
    
    // Normalisasi nomor target (hanya angka dan koma)
    $targets = preg_replace('/[^0-9,]/', '', $targets);
    
    if (empty($targets) || empty($message)) {
        return ['status' => false, 'message' => 'Target atau pesan tidak boleh kosong'];
    }

    $curl = curl_init();
    curl_setopt_array($curl, array(
        CURLOPT_URL => FONNTE_API_URL,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => '',
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 5,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => 'POST',
        CURLOPT_POSTFIELDS => array(
            'target' => $targets,
            'message' => $message,
            'countryCode' => '62'
        ),
        CURLOPT_HTTPHEADER => array(
            'Authorization: ' . FONNTE_TOKEN
        ),
    ));

    $response = curl_exec($curl);
    $err = curl_error($curl);
    curl_close($curl);

    if ($err) {
        return ['status' => false, 'message' => 'cURL Error: ' . $err];
    }
    
    $decoded = json_decode($response, true);
    return $decoded ?: ['status' => true, 'raw' => $response];
}

/**
 * Cek status perangkat WhatsApp di Fonnte
 * @return array
 */
function getFonnteDeviceStatus() {
    $curl = curl_init();
    curl_setopt_array($curl, array(
        CURLOPT_URL => FONNTE_DEVICE_URL,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_ENCODING => '',
        CURLOPT_MAXREDIRS => 10,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_CUSTOMREQUEST => 'POST',
        CURLOPT_HTTPHEADER => array(
            'Authorization: ' . FONNTE_TOKEN
        ),
    ));

    $response = curl_exec($curl);
    $err = curl_error($curl);
    curl_close($curl);

    if ($err) {
        return ['status' => false, 'message' => $err];
    }
    
    return json_decode($response, true) ?: ['status' => false];
}
?>

