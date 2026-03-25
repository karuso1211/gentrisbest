<?php
session_start();

$serverName = "DESKTOP-06731U1\SQLEXPRESS";
$connectionOptions = [
    "Database" => "SOFTENG",
    "Uid" => "",
    "PWD" => ""
];
$conn = sqlsrv_connect($serverName, $connectionOptions);
if ($conn === false) {
    die(print_r(sqlsrv_errors(), true));
}

$username = $_POST['username'];
$password = $_POST['password'];

// Prepared statement to prevent SQL injection
$sql = "SELECT * FROM Users WHERE Username = ? AND Password = ?";
$params = array($username, $password);
$stmt = sqlsrv_query($conn, $sql, $params);

if ($stmt && sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
    // ✅ Account found - set session
    $_SESSION['username'] = $username;
    
    // Return JSON success instead of redirecting
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'message' => 'Login successful']);
    exit();
} else {
    // ❌ Invalid account
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'Invalid username or password']);
    exit();
}

sqlsrv_close($conn);
?>
