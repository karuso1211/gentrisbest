<?php
header('Content-Type: application/json');

require_once __DIR__ . '/mail_config.php';

$autoloadPath = __DIR__ . '/vendor/autoload.php';
if (!file_exists($autoloadPath)) {
    echo json_encode(['success' => false, 'error' => 'Mail library not installed. Run "composer install" in the project folder.']);
    exit();
}
require_once $autoloadPath;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$serverName = "DESKTOP-06731U1\\SQLEXPRESS";
$connectionOptions = ["Database" => "SOFTENG", "Uid" => "", "PWD" => ""];
$conn = sqlsrv_connect($serverName, $connectionOptions);
if ($conn === false) {
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit();
}

$email = isset($_POST['email']) ? trim($_POST['email']) : null;

if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(['success' => false, 'error' => 'Please enter a valid email address']);
    sqlsrv_close($conn);
    exit();
}

// Look up the user (don't reveal whether the email exists)
$stmt = sqlsrv_query($conn, "SELECT Username, FirstName FROM Users WHERE Email = ?", [$email]);
$user = ($stmt) ? sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC) : null;

if (!$user) {
    echo json_encode(['success' => true, 'message' => 'If that email is registered, a reset link has been sent.']);
    sqlsrv_close($conn);
    exit();
}

// Remove any previous unused tokens for this email
sqlsrv_query($conn, "DELETE FROM PasswordResets WHERE Email = ? AND Used = 0", [$email]);

// Generate a secure 64-char hex token (32 random bytes)
$token = bin2hex(random_bytes(32));
$expiresAt = new DateTime('+1 hour');

$insertSql  = "INSERT INTO PasswordResets (Email, Token, ExpiresAt) VALUES (?, ?, ?)";
$insertStmt = sqlsrv_query($conn, $insertSql, [$email, $token, $expiresAt]);

if (!$insertStmt) {
    echo json_encode(['success' => false, 'error' => 'Failed to create reset request. Please try again.']);
    sqlsrv_close($conn);
    exit();
}

sqlsrv_close($conn);

// Build reset URL dynamically from the incoming request so it works
// whether accessed via localhost or a Cloudflare tunnel domain.
$protocol  = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host      = $_SERVER['HTTP_HOST'] ?? 'localhost';
$scriptDir = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
$baseUrl   = $protocol . '://' . $host . $scriptDir;
$resetLink = $baseUrl . '/reset_password.html?token=' . urlencode($token);
$firstName = htmlspecialchars($user['FirstName'], ENT_QUOTES, 'UTF-8');

// Send email via PHPMailer + Gmail SMTP
$mail = new PHPMailer(true);
try {
    $mail->isSMTP();
    $mail->CharSet    = PHPMailer::CHARSET_UTF8;
    $mail->Host       = MAIL_HOST;
    $mail->SMTPAuth   = true;
    $mail->Username   = MAIL_USERNAME;
    $mail->Password   = MAIL_PASSWORD;
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = MAIL_PORT;

    $mail->setFrom(MAIL_FROM_EMAIL, MAIL_FROM_NAME);
    $mail->addAddress($email);
    $mail->isHTML(true);
    $mail->Subject = "Password Reset - GenTri's Best";
    $mail->Body = "
<!DOCTYPE html>
<html>
<body style='font-family:system-ui,Arial,sans-serif;background:#f0f9ff;margin:0;padding:20px;'>
  <div style='max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 4px 12px rgba(14,165,233,.15);'>
    <div style='text-align:center;margin-bottom:24px;'>
      <h2 style='color:#0ea5e9;margin:0 0 4px;'>Password Reset</h2>
      <p style='color:#64748b;font-size:14px;margin:0;'>GenTri's Best — Dairy Box</p>
    </div>
    <p style='color:#334155;'>Hi <strong>{$firstName}</strong>,</p>
    <p style='color:#334155;'>We received a request to reset your password. Click the button below to choose a new one:</p>
    <div style='text-align:center;margin:28px 0;'>
      <a href='{$resetLink}'
         style='background:#0ea5e9;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;display:inline-block;'>
        Reset My Password
      </a>
    </div>
    <p style='color:#64748b;font-size:13px;'>This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.</p>
    <hr style='border:none;border-top:1px solid #e0f2fe;margin:24px 0;'>
    <p style='color:#94a3b8;font-size:12px;text-align:center;margin:0;'>
      GenTri's Best &nbsp;·&nbsp; Dairy Box GenTri
    </p>
  </div>
</body>
</html>";
    $mail->AltBody = "Hi {$firstName},\n\nReset your password here:\n{$resetLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, please ignore this email.\n\n— GenTri's Best Team";

    $mail->send();
    echo json_encode(['success' => true, 'message' => 'If that email is registered, a reset link has been sent.']);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => 'Could not send email. Please contact support or try again later.']);
}
