<?php
header('Content-Type: application/json');

$serverName = "DESKTOP-06731U1\\SQLEXPRESS";
$connectionOptions = ["Database" => "SOFTENG", "Uid" => "", "PWD" => ""];
$conn = sqlsrv_connect($serverName, $connectionOptions);
if ($conn === false) {
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit();
}

$token       = isset($_POST['token'])            ? trim($_POST['token'])      : null;
$newPassword = isset($_POST['new_password'])     ? $_POST['new_password']     : null;
$confirm     = isset($_POST['confirm_password']) ? $_POST['confirm_password'] : null;

if (!$token || !$newPassword || !$confirm) {
    echo json_encode(['success' => false, 'error' => 'All fields are required']);
    sqlsrv_close($conn);
    exit();
}

if ($newPassword !== $confirm) {
    echo json_encode(['success' => false, 'error' => 'Passwords do not match']);
    sqlsrv_close($conn);
    exit();
}

if (strlen($newPassword) < 8) {
    echo json_encode(['success' => false, 'error' => 'Password must be at least 8 characters']);
    sqlsrv_close($conn);
    exit();
}

if (!preg_match('/[A-Z]/', $newPassword)) {
    echo json_encode(['success' => false, 'error' => 'Password must contain at least one uppercase letter']);
    sqlsrv_close($conn);
    exit();
}

if (!preg_match('/[^A-Za-z0-9]/', $newPassword)) {
    echo json_encode(['success' => false, 'error' => 'Password must contain at least one special character']);
    sqlsrv_close($conn);
    exit();
}

// Validate token
$stmt = sqlsrv_query($conn, "SELECT Email, ExpiresAt, Used FROM PasswordResets WHERE Token = ?", [$token]);
$reset = ($stmt) ? sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC) : null;

if (!$reset) {
    echo json_encode(['success' => false, 'error' => 'Invalid or expired reset link. Please request a new one.']);
    sqlsrv_close($conn);
    exit();
}

if ($reset['Used']) {
    echo json_encode(['success' => false, 'error' => 'This reset link has already been used. Please request a new one.']);
    sqlsrv_close($conn);
    exit();
}

// sqlsrv returns DATETIME columns as PHP DateTime objects
$expiresAt = $reset['ExpiresAt'];
$now = new DateTime();
$expired = ($expiresAt instanceof DateTime) ? ($expiresAt < $now) : (new DateTime($expiresAt) < $now);

if ($expired) {
    echo json_encode(['success' => false, 'error' => 'This reset link has expired. Please request a new one.']);
    sqlsrv_close($conn);
    exit();
}

$email = $reset['Email'];
$newHash = password_hash($newPassword, PASSWORD_DEFAULT);

// Update the user's password
$updateStmt = sqlsrv_query($conn, "UPDATE Users SET Password = ? WHERE Email = ?", [$newHash, $email]);

if (!$updateStmt || sqlsrv_rows_affected($updateStmt) === 0) {
    echo json_encode(['success' => false, 'error' => 'Failed to update password. Please try again.']);
    sqlsrv_close($conn);
    exit();
}

// Invalidate the token so it cannot be reused
sqlsrv_query($conn, "UPDATE PasswordResets SET Used = 1 WHERE Token = ?", [$token]);

sqlsrv_close($conn);

echo json_encode(['success' => true, 'message' => 'Password reset successfully']);
