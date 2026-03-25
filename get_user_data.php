<?php
session_start();

header('Content-Type: application/json');

// Check if user is authenticated via session
if (!isset($_SESSION['username'])) {
    echo json_encode([
        'authenticated' => false,
        'error' => 'No session found',
        'debug' => 'Session username not set'
    ]);
    exit();
}

$username = $_SESSION['username'];

$serverName = "DESKTOP-06731U1\SQLEXPRESS";
$connectionOptions = [
    "Database" => "SOFTENG",
    "Uid" => "",
    "PWD" => ""
];

$conn = sqlsrv_connect($serverName, $connectionOptions);
if ($conn === false) {
    echo json_encode([
        'authenticated' => false,
        'error' => 'Database connection failed',
        'debug' => print_r(sqlsrv_errors(), true)
    ]);
    exit();
}

// Try to fetch user data - handle if AccountType column doesn't exist
$sql = "SELECT FirstName, LastName, Email, ContactNumber FROM Users WHERE Username = ?";
$params = array($username);
$stmt = sqlsrv_query($conn, $sql, $params);

if ($stmt === false) {
    echo json_encode([
        'authenticated' => false,
        'error' => 'Query failed',
        'debug' => print_r(sqlsrv_errors(), true),
        'sql' => $sql,
        'username' => $username
    ]);
    sqlsrv_close($conn);
    exit();
}

$row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);

if ($row) {
    // Try to get AccountType if it exists
    $accountType = 'USER';
    $sqlCheck = "SELECT AccountType FROM Users WHERE Username = ?";
    $stmtCheck = sqlsrv_query($conn, $sqlCheck, array($username));
    if ($stmtCheck) {
        $rowCheck = sqlsrv_fetch_array($stmtCheck, SQLSRV_FETCH_ASSOC);
        if ($rowCheck && isset($rowCheck['AccountType'])) {
            $accountType = $rowCheck['AccountType'];
        }
    }
    
    echo json_encode([
        'authenticated' => true,
        'username' => $username,
        'firstName' => $row['FirstName'],
        'lastName' => $row['LastName'],
        'email' => $row['Email'],
        'contactNumber' => $row['ContactNumber'],
        'accountType' => $accountType
    ]);
} else {
    echo json_encode([
        'authenticated' => false,
        'error' => 'User not found in database',
        'debug' => 'Username: ' . $username
    ]);
}

sqlsrv_close($conn);
?>
