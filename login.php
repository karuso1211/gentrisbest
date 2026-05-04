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

        // Fetch full name for activity log
        $nameSql = "SELECT CONCAT(FirstName, ' ', LastName) AS FullName FROM Users WHERE Username = ?";
        $nameStmt = sqlsrv_query($conn, $nameSql, [$username]);
        $fullName = $username;
        if ($nameStmt && $nameRow = sqlsrv_fetch_array($nameStmt, SQLSRV_FETCH_ASSOC)) {
            $fullName = $nameRow['FullName'];
        }

        // Ensure ActivityLogs table exists then insert login event
        sqlsrv_query($conn, "
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ActivityLogs' AND xtype='U')
            CREATE TABLE ActivityLogs (
                LogID INT IDENTITY(1,1) PRIMARY KEY,
                Username NVARCHAR(100) NOT NULL,
                FullName NVARCHAR(200),
                Action NVARCHAR(50) NOT NULL,
                Details NVARCHAR(500),
                LoggedAt DATETIME DEFAULT GETDATE()
            )
        ");
        $logSql = "INSERT INTO ActivityLogs (Username, FullName, Action, Details) VALUES (?, ?, 'LOGIN', ?)";
        sqlsrv_query($conn, $logSql, [$username, $fullName, 'Logged in as ' . $_SESSION['accountType']]);

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
