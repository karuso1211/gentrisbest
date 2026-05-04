<?php
session_start();

// Log the logout event before destroying session
if (isset($_SESSION['username'])) {
    $serverName = "DESKTOP-06731U1\SQLEXPRESS";
    $conn = sqlsrv_connect($serverName, ["Database" => "SOFTENG", "Uid" => "", "PWD" => ""]);
    if ($conn) {
        $username = $_SESSION['username'];
        $accountType = isset($_SESSION['accountType']) ? $_SESSION['accountType'] : 'USER';

        $nameSql = "SELECT CONCAT(FirstName, ' ', LastName) AS FullName FROM Users WHERE Username = ?";
        $nameStmt = sqlsrv_query($conn, $nameSql, [$username]);
        $fullName = $username;
        if ($nameStmt && $nameRow = sqlsrv_fetch_array($nameStmt, SQLSRV_FETCH_ASSOC)) {
            $fullName = $nameRow['FullName'];
        }

        $logSql = "INSERT INTO ActivityLogs (Username, FullName, Action, Details) VALUES (?, ?, 'LOGOUT', ?)";
        sqlsrv_query($conn, $logSql, [$username, $fullName, 'Logged out (' . $accountType . ')']);
        sqlsrv_close($conn);
    }
}

// Clear session variables then destroy
$_SESSION = array();
session_destroy();
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Logout</title>
</head>
<body>
    <script>
        window.location.href = 'GenTrisBest_Login.html';
    </script>
</body>
</html>
