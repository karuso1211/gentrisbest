<?php
session_start();

// Set JSON response header
header('Content-Type: application/json');

// Check if user is authenticated
if (!isset($_SESSION['username'])) {
    // Allow guest users to access limited features
    echo json_encode([
        'authenticated' => false, 
        'isGuest' => true,
        'username' => 'Guest',
        'firstName' => 'Guest',
        'lastName' => 'User',
        'accountType' => 'GUEST'
    ]);
    exit();
}

// User is authenticated, fetch their data from database
$serverName = "DESKTOP-06731U1\SQLEXPRESS";
$connectionOptions = [
    "Database" => "SOFTENG",
    "Uid" => "",
    "PWD" => ""
];

$conn = sqlsrv_connect($serverName, $connectionOptions);
if ($conn === false) {
    echo json_encode(['authenticated' => false, 'error' => 'Database connection failed']);
    exit();
}

$username = $_SESSION['username'];

// Fetch user data
$sql = "SELECT FirstName, LastName, Email, ContactNumber, AccountType FROM Users WHERE Username = ?";
$params = array($username);
$stmt = sqlsrv_query($conn, $sql, $params);

if ($stmt && $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
    // User found, return their data
    echo json_encode([
        'authenticated' => true,
        'username' => $username,
        'firstName' => $row['FirstName'],
        'lastName' => $row['LastName'],
        'email' => $row['Email'],
        'contactNumber' => $row['ContactNumber'],
        'accountType' => $row['AccountType'] ? $row['AccountType'] : 'USER'
    ]);
} else {
    // User session exists but not found in database
    echo json_encode(['authenticated' => false]);
}

sqlsrv_close($conn);
?>
