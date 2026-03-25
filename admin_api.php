<?php
session_start();

// Set JSON response header
header('Content-Type: application/json');

// Check if user is authenticated
if (!isset($_SESSION['username'])) {
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit();
}

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

// Get current user's account type
$username = $_SESSION['username'];
$checkAdminSql = "SELECT AccountType FROM Users WHERE Username = ?";
$params = array($username);
$stmt = sqlsrv_query($conn, $checkAdminSql, $params);
$row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);

// Check if user is admin
if (!$row || $row['AccountType'] !== 'ADMIN') {
    echo json_encode(['success' => false, 'error' => 'Admin access required']);
    exit();
}

// Get request action
$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : null);

if ($action === 'get_all_users') {
    // Fetch all users
    $sql = "SELECT FirstName, LastName, Username, Email, ContactNumber, AccountType FROM Users ORDER BY Username";
    $result = sqlsrv_query($conn, $sql);
    
    $users = [];
    while ($row = sqlsrv_fetch_array($result, SQLSRV_FETCH_ASSOC)) {
        $users[] = $row;
    }
    
    echo json_encode(['success' => true, 'users' => $users]);
} elseif ($action === 'update_account_type') {
    // Update user account type
    $targetUsername = isset($_POST['username']) ? $_POST['username'] : null;
    $newAccountType = isset($_POST['account_type']) ? $_POST['account_type'] : null;
    
    if (!$targetUsername || !$newAccountType) {
        echo json_encode(['success' => false, 'error' => 'Missing parameters']);
        exit();
    }
    
    // Prevent admin from removing their own admin status via this endpoint
    if ($targetUsername === $username && $newAccountType !== 'ADMIN') {
        echo json_encode(['success' => false, 'error' => 'Cannot remove your own admin status']);
        exit();
    }
    
    $updateSql = "UPDATE Users SET AccountType = ? WHERE Username = ?";
    $updateParams = array($newAccountType, $targetUsername);
    
    if (sqlsrv_query($conn, $updateSql, $updateParams)) {
        echo json_encode(['success' => true, 'message' => 'Account type updated successfully']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to update account type']);
    }
} elseif ($action === 'delete_user') {
    // Delete user (prevent deleting own account)
    $targetUsername = isset($_POST['username']) ? $_POST['username'] : null;
    
    if (!$targetUsername) {
        echo json_encode(['success' => false, 'error' => 'Username required']);
        exit();
    }
    
    if ($targetUsername === $username) {
        echo json_encode(['success' => false, 'error' => 'Cannot delete your own account']);
        exit();
    }
    
    $deleteSql = "DELETE FROM Users WHERE Username = ?";
    $deleteParams = array($targetUsername);
    
    if (sqlsrv_query($conn, $deleteSql, $deleteParams)) {
        echo json_encode(['success' => true, 'message' => 'User deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to delete user']);
    }
} elseif ($action === 'reset_password') {
    // Reset user password
    $targetUsername = isset($_POST['username']) ? $_POST['username'] : null;
    $newPassword = isset($_POST['new_password']) ? $_POST['new_password'] : null;
    
    if (!$targetUsername || !$newPassword) {
        echo json_encode(['success' => false, 'error' => 'Missing parameters']);
        exit();
    }
    
    // Validate password is not empty and has minimum length
    if (strlen($newPassword) < 4) {
        echo json_encode(['success' => false, 'error' => 'Password must be at least 4 characters']);
        exit();
    }
    
    $updateSql = "UPDATE Users SET Password = ? WHERE Username = ?";
    $updateParams = array($newPassword, $targetUsername);
    
    if (sqlsrv_query($conn, $updateSql, $updateParams)) {
        echo json_encode(['success' => true, 'message' => 'Password reset successfully']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to reset password']);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Invalid action']);
}

sqlsrv_close($conn);
?>
