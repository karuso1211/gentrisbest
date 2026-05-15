<?php
ob_start();
ini_set('display_errors', 0);
session_start();
header('Content-Type: application/json');

$serverName = "DESKTOP-06731U1\SQLEXPRESS";
$connectionOptions = ["Database" => "SOFTENG", "Uid" => "", "PWD" => ""];

$otp       = trim($_POST['otp'] ?? '');
$tempToken = trim($_POST['tempToken'] ?? '');

// Basic format validation
if (!preg_match('/^\d{6}$/', $otp) || !preg_match('/^[0-9a-f]{64}$/', $tempToken)) {
    ob_clean();
    echo json_encode(['success' => false, 'error' => 'Invalid request.']);
    exit();
}

// The session must have the matching temp token
if (empty($_SESSION['otp_temp_token']) || !hash_equals($_SESSION['otp_temp_token'], $tempToken)) {
    ob_clean();
    echo json_encode(['success' => false, 'error' => 'Invalid or expired session. Please log in again.']);
    exit();
}

$conn = sqlsrv_connect($serverName, $connectionOptions);
if ($conn === false) {
    ob_clean();
    echo json_encode(['success' => false, 'error' => 'Database connection failed.']);
    exit();
}

// Fetch the OTP row
$stmt = sqlsrv_query($conn,
    "SELECT OTPID, Username, OTPHash, ExpiresAt, Used, Attempts FROM LoginOTP WHERE TempToken = ? AND Used = 0",
    [$tempToken]);

if (!$stmt || !($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC))) {
    sqlsrv_close($conn);
    ob_clean();
    echo json_encode(['success' => false, 'error' => 'Invalid or expired session. Please log in again.']);
    exit();
}

$otpId    = $row['OTPID'];
$username = $row['Username'];
$attempts = (int)$row['Attempts'];

// Check expiry
$now       = new DateTime();
$expiresAt = $row['ExpiresAt'];
if ($expiresAt instanceof DateTime) {
    $expired = $now > $expiresAt;
} else {
    $expired = $now->getTimestamp() > strtotime($expiresAt);
}

if ($expired) {
    sqlsrv_query($conn, "UPDATE LoginOTP SET Used = 1 WHERE OTPID = ?", [$otpId]);
    sqlsrv_close($conn);
    unset($_SESSION['otp_temp_token'], $_SESSION['otp_username']);
    ob_clean();
    echo json_encode(['success' => false, 'error' => 'Verification code has expired. Please log in again.']);
    exit();
}

// Check brute-force limit
if ($attempts >= 5) {
    sqlsrv_close($conn);
    ob_clean();
    echo json_encode(['success' => false, 'error' => 'Too many failed attempts. Please log in again.']);
    exit();
}

// Verify the code
if (!password_verify($otp, $row['OTPHash'])) {
    $newAttempts = $attempts + 1;
    sqlsrv_query($conn, "UPDATE LoginOTP SET Attempts = ? WHERE OTPID = ?", [$newAttempts, $otpId]);
    $remaining = 5 - $newAttempts;
    sqlsrv_close($conn);
    $msg = $remaining > 0
        ? "Incorrect code. {$remaining} attempt" . ($remaining === 1 ? '' : 's') . " remaining."
        : "Incorrect code. No attempts remaining. Please log in again.";
    ob_clean();
    echo json_encode(['success' => false, 'error' => $msg]);
    exit();
}

// OTP correct — mark used
sqlsrv_query($conn, "UPDATE LoginOTP SET Used = 1 WHERE OTPID = ?", [$otpId]);

// Cross-check username matches session
if ($_SESSION['otp_username'] !== $username) {
    sqlsrv_close($conn);
    unset($_SESSION['otp_temp_token'], $_SESSION['otp_username']);
    ob_clean();
    echo json_encode(['success' => false, 'error' => 'Session mismatch. Please log in again.']);
    exit();
}

// Fetch AccountType
$accStmt = sqlsrv_query($conn, "SELECT AccountType, CONCAT(FirstName, ' ', LastName) AS FullName FROM Users WHERE Username = ?", [$username]);
$accRow  = $accStmt ? sqlsrv_fetch_array($accStmt, SQLSRV_FETCH_ASSOC) : null;
$accountType = $accRow ? strtoupper(trim($accRow['AccountType'])) : 'USER';
$fullName    = $accRow ? $accRow['FullName'] : $username;

// Ensure ActivityLogs table exists then log the login event
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
sqlsrv_query($conn,
    "INSERT INTO ActivityLogs (Username, FullName, Action, Details) VALUES (?, ?, 'LOGIN', ?)",
    [$username, $fullName, 'Logged in as ' . $accountType]);

sqlsrv_close($conn);

// Establish the real authenticated session
$_SESSION['username']    = $username;
$_SESSION['accountType'] = $accountType;
unset($_SESSION['otp_temp_token'], $_SESSION['otp_username']);

ob_clean();
echo json_encode(['success' => true, 'message' => 'Login successful']);
exit();
?>
