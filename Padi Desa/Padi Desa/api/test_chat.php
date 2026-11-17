<?php
$payload = json_encode([
    'message' => 'siapa saya',
    'user' => [
        'name' => 'Admin Desa',
        'roleLabel' => 'Admin',
        'username' => 'admin@desa.id'
    ]
]);

$ch = curl_init('http://localhost/Padi%20Desa%20(2)/Padi%20Desa/api/chat.php');
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$res = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$err = curl_error($ch);
curl_close($ch);

echo "HTTP_CODE: " . $httpCode . "\n";
echo "RESPONSE: " . $res . "\n";
if ($err) echo "CURL_ERROR: " . $err . "\n";
