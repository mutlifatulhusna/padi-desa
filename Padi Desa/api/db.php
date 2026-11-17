<?php
/**
 * ========================================
 * DATABASE HELPER
 * Platform Padi Desa Cirebon Girang
 * ========================================
 */

require_once 'config.php';

/**
 * Get all records from a table
 */
function getAll($table, $conditions = '') {
    $conn = getDBConnection();
    $sql = "SELECT * FROM $table $conditions";
    $result = $conn->query($sql);
    
    if ($result) {
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        $conn->close();
        return $data;
    }
    
    $conn->close();
    return [];
}

/**
 * Get single record by ID
 */
function getById($table, $id) {
    $conn = getDBConnection();
    $sql = "SELECT * FROM $table WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('i', $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $data = $result->fetch_assoc();
    $stmt->close();
    $conn->close();
    return $data;
}

/**
 * Insert record
 */
function insert($table, $data) {
    $conn = getDBConnection();
    $columns = array_keys($data);
    $values = array_values($data);
    $placeholders = implode(', ', array_fill(0, count($values), '?'));
    $types = str_repeat('s', count($values));
    
    $sql = "INSERT INTO $table (" . implode(', ', $columns) . ") VALUES ($placeholders)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$values);
    
    if ($stmt->execute()) {
        $id = $conn->insert_id;
        $stmt->close();
        $conn->close();
        return $id;
    }
    
    $error = $stmt->error;
    $stmt->close();
    $conn->close();
    throw new Exception($error);
}

/**
 * Update record
 */
function update($table, $id, $data) {
    $conn = getDBConnection();
    $sets = [];
    $values = [];
    $types = '';
    
    foreach ($data as $key => $value) {
        $sets[] = "$key = ?";
        $values[] = $value;
        $types .= 's';
    }
    
    $values[] = $id;
    $types .= 'i';
    
    $sql = "UPDATE $table SET " . implode(', ', $sets) . " WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$values);
    
    if ($stmt->execute()) {
        $affected = $stmt->affected_rows;
        $stmt->close();
        $conn->close();
        return $affected;
    }
    
    $error = $stmt->error;
    $stmt->close();
    $conn->close();
    throw new Exception($error);
}

/**
 * Delete record
 */
function delete($table, $id) {
    $conn = getDBConnection();
    $sql = "DELETE FROM $table WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('i', $id);
    
    if ($stmt->execute()) {
        $affected = $stmt->affected_rows;
        $stmt->close();
        $conn->close();
        return $affected;
    }
    
    $error = $stmt->error;
    $stmt->close();
    $conn->close();
    throw new Exception($error);
}

/**
 * Search records
 */
function search($table, $keyword, $fields) {
    $conn = getDBConnection();
    $conditions = [];
    $values = [];
    $types = '';
    
    foreach ($fields as $field) {
        $conditions[] = "$field LIKE ?";
        $values[] = "%$keyword%";
        $types .= 's';
    }
    
    $sql = "SELECT * FROM $table WHERE " . implode(' OR ', $conditions);
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$values);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
    
    $stmt->close();
    $conn->close();
    return $data;
}

/**
 * Sanitize input
 */
function sanitize($input) {
    $conn = getDBConnection();
    $sanitized = $conn->real_escape_string($input);
    $conn->close();
    return $sanitized;
}

/**
 * Validate required fields
 */
function validateRequired($data, $required) {
    $missing = [];
    foreach ($required as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            $missing[] = $field;
        }
    }
    
    if (!empty($missing)) {
        sendResponse(false, 'Field required: ' . implode(', ', $missing), [], 400);
    }
}
?>