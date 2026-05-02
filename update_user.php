<?php
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['username'])) {
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit();
}

$action = isset($_POST['action']) ? $_POST['action'] : null;

$serverName = "DESKTOP-06731U1\SQLEXPRESS";
$connectionOptions = [
    "Database" => "SOFTENG",
    "Uid" => "",
    "PWD" => ""
];

$conn = sqlsrv_connect($serverName, $connectionOptions);
if ($conn === false) {
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit();
}

$currentUsername = $_SESSION['username'];

if ($action === 'update_account') {
    $newUsername    = isset($_POST['username'])      ? trim($_POST['username'])      : null;
    $newEmail       = isset($_POST['email'])         ? trim($_POST['email'])         : null;
    $newContact     = isset($_POST['contactNumber']) ? trim($_POST['contactNumber']) : null;

    if (!$newUsername || !$newEmail || !$newContact) {
        echo json_encode(['success' => false, 'error' => 'All fields are required']);
        sqlsrv_close($conn);
        exit();
    }

    // Basic validation
    if (!filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'error' => 'Invalid email address']);
        sqlsrv_close($conn);
        exit();
    }

    // Fetch current user's account type
    $typeSql = "SELECT AccountType FROM Users WHERE Username = ?";
    $typeStmt = sqlsrv_query($conn, $typeSql, [$currentUsername]);
    $typeRow = sqlsrv_fetch_array($typeStmt, SQLSRV_FETCH_ASSOC);
    $accountType = $typeRow ? $typeRow['AccountType'] : 'USER';

    // Regular users cannot change their username
    $canChangeUsername = !in_array($accountType, ['USER', 'GUEST']);
    if (!$canChangeUsername) {
        $newUsername = $currentUsername;
    }

    // Check if new username is taken by another user
    if ($canChangeUsername && $newUsername !== $currentUsername) {
        $checkSql = "SELECT UserID FROM Users WHERE Username = ? AND Username != ?";
        $checkStmt = sqlsrv_query($conn, $checkSql, [$newUsername, $currentUsername]);
        if ($checkStmt && sqlsrv_fetch_array($checkStmt, SQLSRV_FETCH_ASSOC)) {
            echo json_encode(['success' => false, 'error' => 'Username is already taken']);
            sqlsrv_close($conn);
            exit();
        }
    }

    // Check if new email is taken by another user
    $checkEmailSql = "SELECT UserID FROM Users WHERE Email = ? AND Username != ?";
    $checkEmailStmt = sqlsrv_query($conn, $checkEmailSql, [$newEmail, $currentUsername]);
    if ($checkEmailStmt && sqlsrv_fetch_array($checkEmailStmt, SQLSRV_FETCH_ASSOC)) {
        echo json_encode(['success' => false, 'error' => 'Email is already in use']);
        sqlsrv_close($conn);
        exit();
    }

    $sql = "UPDATE Users SET Username = ?, Email = ?, ContactNumber = ? WHERE Username = ?";
    $params = [$newUsername, $newEmail, $newContact, $currentUsername];
    $stmt = sqlsrv_query($conn, $sql, $params);

    if ($stmt === false) {
        echo json_encode(['success' => false, 'error' => 'Update failed', 'debug' => print_r(sqlsrv_errors(), true)]);
        sqlsrv_close($conn);
        exit();
    }

    // Update session username if it changed
    $_SESSION['username'] = $newUsername;

    // Return updated user data so the client can refresh its cache
    $fetchSql = "SELECT FirstName, LastName, Email, ContactNumber, AccountType FROM Users WHERE Username = ?";
    $fetchStmt = sqlsrv_query($conn, $fetchSql, [$newUsername]);
    $row = sqlsrv_fetch_array($fetchStmt, SQLSRV_FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'user' => [
            'username'      => $newUsername,
            'firstName'     => $row['FirstName'],
            'lastName'      => $row['LastName'],
            'email'         => $row['Email'],
            'contactNumber' => $row['ContactNumber'],
            'accountType'   => $row['AccountType'],
            'authenticated' => true
        ]
    ]);
} elseif ($action === 'change_password') {
    $currentPassword = isset($_POST['current_password']) ? $_POST['current_password'] : null;
    $newPassword     = isset($_POST['new_password'])     ? $_POST['new_password']     : null;
    $confirmPassword = isset($_POST['confirm_password']) ? $_POST['confirm_password'] : null;

    if (!$currentPassword || !$newPassword || !$confirmPassword) {
        echo json_encode(['success' => false, 'error' => 'All fields are required']);
        sqlsrv_close($conn);
        exit();
    }

    if ($newPassword !== $confirmPassword) {
        echo json_encode(['success' => false, 'error' => 'New passwords do not match']);
        sqlsrv_close($conn);
        exit();
    }

    if (strlen($newPassword) < 8) {
        echo json_encode(['success' => false, 'error' => 'New password must be at least 8 characters']);
        sqlsrv_close($conn);
        exit();
    }

    // Fetch stored password hash
    $fetchSql = "SELECT Password FROM Users WHERE Username = ?";
    $fetchStmt = sqlsrv_query($conn, $fetchSql, [$currentUsername]);
    $fetchRow = sqlsrv_fetch_array($fetchStmt, SQLSRV_FETCH_ASSOC);

    if (!$fetchRow || !password_verify($currentPassword, $fetchRow['Password'])) {
        echo json_encode(['success' => false, 'error' => 'Current password is incorrect']);
        sqlsrv_close($conn);
        exit();
    }

    $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
    $updateSql = "UPDATE Users SET Password = ? WHERE Username = ?";
    $updateStmt = sqlsrv_query($conn, $updateSql, [$newHash, $currentUsername]);

    if ($updateStmt === false) {
        echo json_encode(['success' => false, 'error' => 'Failed to update password']);
        sqlsrv_close($conn);
        exit();
    }

    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'error' => 'Unknown action']);
}

sqlsrv_close($conn);
?>
