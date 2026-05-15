<?php
error_reporting(0);
ini_set('display_errors', 0);
ob_start();
session_start();

function respond(array $data): void {
    ob_end_clean();
    header('Content-Type: application/json');
    echo json_encode($data);
    exit();
}

require_once __DIR__ . '/mail_config.php';

$autoloadPath = __DIR__ . '/vendor/autoload.php';
if (!file_exists($autoloadPath)) {
    respond(['success' => false, 'error' => 'Mail library not installed. Run "composer install".']);
}
require_once $autoloadPath;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$serverName = "DESKTOP-06731U1\SQLEXPRESS";
$connectionOptions = ["Database" => "SOFTENG", "Uid" => "", "PWD" => ""];

$conn = sqlsrv_connect($serverName, $connectionOptions);
if ($conn === false) {
    respond(['success' => false, 'error' => 'Database connection failed']);
}

$username  = trim($_POST['username'] ?? '');
$password  = $_POST['password'] ?? '';
$loginType = $_POST['loginType'] ?? 'user';

if (!$username || !$password) {
    respond(['success' => false, 'error' => 'Username and password are required']);
}

$adminTypes = ['ADMIN', 'INVENTORY', 'MANAGER', 'FRONT DESK'];

$stmt = sqlsrv_query($conn, "SELECT AccountType, Password FROM Users WHERE Username = ?", [$username]);

if ($stmt && $row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
    if (password_verify($password, $row['Password'])) {
        $accountType    = $row['AccountType'] ? strtoupper(trim($row['AccountType'])) : 'USER';
        $isAdminAccount = in_array($accountType, $adminTypes);

        if ($loginType === 'admin' && !$isAdminAccount) {
            respond(['success' => false, 'error' => 'This account does not have staff or admin access. Please use the Customer login instead.']);
        }
        if ($loginType === 'user' && $isAdminAccount) {
            respond(['success' => false, 'error' => 'Staff accounts must use the Staff / Admin login, not the Customer login.']);
        }

        // Block unverified accounts (IsVerified = 0)
        $verStmt = sqlsrv_query($conn, "SELECT IsVerified FROM Users WHERE Username = ?", [$username]);
        if ($verStmt && ($verRow = sqlsrv_fetch_array($verStmt, SQLSRV_FETCH_ASSOC))) {
            if (isset($verRow['IsVerified']) && (int)$verRow['IsVerified'] === 0) {
                respond(['success' => false, 'error' => 'Your email address has not been verified yet. Please check your inbox for the verification link and click it before logging in.']);
            }
        }

        // ADMIN and GUEST accounts skip OTP — direct login
        if ($accountType === 'ADMIN' || $accountType === 'GUEST') {
            $_SESSION['username']    = $username;
            $_SESSION['accountType'] = $accountType;
            respond(['success' => true, 'message' => 'Login successful']);
        }

        // Rate limit: max 3 OTP requests per username in 5 minutes
        $rateStmt = sqlsrv_query($conn,
            "SELECT COUNT(*) AS cnt FROM LoginOTP WHERE Username = ? AND CreatedAt > DATEADD(MINUTE, -5, GETDATE())",
            [$username]);
        if ($rateStmt) {
            $rateRow = sqlsrv_fetch_array($rateStmt, SQLSRV_FETCH_ASSOC);
            if ($rateRow && (int)$rateRow['cnt'] >= 3) {
                respond(['success' => false, 'error' => 'Too many login attempts. Please wait 5 minutes before trying again.']);
            }
        }

        // Clear old unused OTP rows for this user
        sqlsrv_query($conn, "DELETE FROM LoginOTP WHERE Username = ? AND Used = 0", [$username]);

        // Generate 6-digit OTP
        $otp       = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $otpHash   = password_hash($otp, PASSWORD_BCRYPT);
        $tempToken = bin2hex(random_bytes(32));

        $insertStmt = sqlsrv_query($conn,
            "INSERT INTO LoginOTP (Username, OTPHash, TempToken, ExpiresAt) VALUES (?, ?, ?, DATEADD(MINUTE, 10, GETDATE()))",
            [$username, $otpHash, $tempToken]);
        if (!$insertStmt) {
            respond(['success' => false, 'error' => 'Failed to initiate login. Please try again.']);
        }

        // Fetch email and first name
        $userStmt = sqlsrv_query($conn, "SELECT FirstName, Email FROM Users WHERE Username = ?", [$username]);
        $userRow  = $userStmt ? sqlsrv_fetch_array($userStmt, SQLSRV_FETCH_ASSOC) : null;

        if (!$userRow || !$userRow['Email']) {
            sqlsrv_query($conn, "DELETE FROM LoginOTP WHERE TempToken = ?", [$tempToken]);
            respond(['success' => false, 'error' => 'No email address on file for this account. Please contact support.']);
        }

        $firstName = htmlspecialchars($userRow['FirstName'], ENT_QUOTES, 'UTF-8');
        $userEmail = $userRow['Email'];

        sqlsrv_close($conn);

        $_SESSION['otp_temp_token'] = $tempToken;
        $_SESSION['otp_username']   = $username;

        // Send OTP email
        $mail = new PHPMailer(true);
        try {
            $mail->SMTPDebug  = 0;
            $mail->isSMTP();
            $mail->CharSet    = PHPMailer::CHARSET_UTF8;
            $mail->Host       = MAIL_HOST;
            $mail->SMTPAuth   = true;
            $mail->Username   = MAIL_USERNAME;
            $mail->Password   = MAIL_PASSWORD;
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = MAIL_PORT;

            $mail->setFrom(MAIL_FROM_EMAIL, MAIL_FROM_NAME);
            $mail->addAddress($userEmail);
            $mail->isHTML(true);
            $mail->Subject = "Your Login Code - GenTri's Best";
            $mail->Body = "
<!DOCTYPE html>
<html>
<body style='font-family:system-ui,Arial,sans-serif;background:#f0f9ff;margin:0;padding:20px;'>
  <div style='max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 4px 12px rgba(14,165,233,.15);'>
    <div style='text-align:center;margin-bottom:24px;'>
      <h2 style='color:#0ea5e9;margin:0 0 4px;'>Verification Code</h2>
      <p style='color:#64748b;font-size:14px;margin:0;'>GenTri's Best - Dairy Box</p>
    </div>
    <p style='color:#334155;'>Hi <strong>{$firstName}</strong>,</p>
    <p style='color:#334155;'>Use the code below to complete your sign-in. It expires in <strong>10 minutes</strong>.</p>
    <div style='text-align:center;margin:28px 0;'>
      <div style='display:inline-block;background:#f0f9ff;border:2px solid #0ea5e9;border-radius:12px;padding:16px 40px;'>
        <span style='font-size:2.2rem;font-weight:700;letter-spacing:0.35em;color:#0ea5e9;font-family:monospace;'>{$otp}</span>
      </div>
    </div>
    <p style='color:#64748b;font-size:13px;'>If you did not attempt to sign in, someone else may have your password. Consider changing it immediately.</p>
    <hr style='border:none;border-top:1px solid #e0f2fe;margin:24px 0;'>
    <p style='color:#94a3b8;font-size:12px;text-align:center;margin:0;'>GenTri's Best - Dairy Box GenTri</p>
  </div>
</body>
</html>";
            $mail->AltBody = "Hi {$firstName},\n\nYour login code is: {$otp}\n\nIt expires in 10 minutes.\n\nIf you did not try to sign in, please change your password.\n\n- GenTri's Best Team";
            $mail->send();
        } catch (Exception $e) {
            $conn2 = sqlsrv_connect($serverName, $connectionOptions);
            if ($conn2) {
                sqlsrv_query($conn2, "DELETE FROM LoginOTP WHERE TempToken = ?", [$tempToken]);
                sqlsrv_close($conn2);
            }
            unset($_SESSION['otp_temp_token'], $_SESSION['otp_username']);
            respond(['success' => false, 'error' => 'Could not send verification email. Please try again.']);
        }

        respond(['success' => false, 'otpRequired' => true, 'tempToken' => $tempToken]);
    }
}

respond(['success' => false, 'error' => 'Invalid username or password']);
