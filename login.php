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

$sql = "SELECT AccountType, Password FROM Users WHERE Username = ?";
$params = array($username);
$stmt = sqlsrv_query($conn, $sql, $params);

if ($stmt && $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
    if (password_verify($password, $row['Password'])) {
        $_SESSION['username'] = $username;
        $_SESSION['accountType'] = $row['AccountType'] ? $row['AccountType'] : 'USER';
        header('Content-Type: application/json');
        echo json_encode(['success' => true, 'message' => 'Login successful']);
        exit();
    }
}

header('Content-Type: application/json');
echo json_encode(['success' => false, 'error' => 'Invalid username or password']);
exit();

sqlsrv_close($conn);
?>
