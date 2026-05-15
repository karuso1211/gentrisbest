<?php
ob_start();
ini_set('display_errors', 0);

$serverName = "DESKTOP-06731U1\SQLEXPRESS";
$connectionOptions = ["Database" => "SOFTENG", "Uid" => "", "PWD" => ""];

require_once __DIR__ . '/mail_config.php';

$autoloadPath = __DIR__ . '/vendor/autoload.php';
$mailerAvailable = file_exists($autoloadPath);
if ($mailerAvailable) {
    require_once $autoloadPath;
}

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

$conn = sqlsrv_connect($serverName, $connectionOptions);
if ($conn === false) die('Database connection failed.');

$firstname       = trim($_POST['firstName']       ?? '');
$lastname        = trim($_POST['lastName']        ?? '');
$username        = trim($_POST['username']        ?? '');
$contact         = trim($_POST['contactNumber']   ?? '');
$email           = trim($_POST['email']           ?? '');
$password        = $_POST['password']             ?? '';
$confirmPassword = $_POST['confirmPassword']      ?? '';

$errorMessage = null;

if ($password !== $confirmPassword) {
    $errorMessage = 'Passwords do not match.';
} elseif (strlen($password) < 8) {
    $errorMessage = 'Password must be at least 8 characters.';
} elseif (!preg_match('/[A-Z]/', $password)) {
    $errorMessage = 'Password must contain at least one uppercase letter.';
} elseif (!preg_match('/[^A-Za-z0-9]/', $password)) {
    $errorMessage = 'Password must contain at least one special character.';
} else {
    $chkEmail = sqlsrv_query($conn, "SELECT 1 FROM Users WHERE Email = ?", [$email]);
    if ($chkEmail && sqlsrv_fetch_array($chkEmail)) {
        $errorMessage = 'That email address is already registered. Please use a different email or log in.';
    } else {
        $chkUser = sqlsrv_query($conn, "SELECT 1 FROM Users WHERE Username = ?", [$username]);
        if ($chkUser && sqlsrv_fetch_array($chkUser)) {
            $errorMessage = 'That username is already taken. Please choose a different username.';
        }
    }
}

$result      = false;
$mailSent    = false;
$mailError   = null;

if (!$errorMessage) {
    // Ensure EmailVerifications table exists with correct schema
    $evExists = false;
    $chkTbl = sqlsrv_query($conn, "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='EmailVerifications'");
    if ($chkTbl && sqlsrv_fetch_array($chkTbl)) {
        $chkCol2 = sqlsrv_query($conn, "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='EmailVerifications' AND COLUMN_NAME='Username'");
        if ($chkCol2 && sqlsrv_fetch_array($chkCol2)) {
            $evExists = true;
        } else {
            // Table exists but schema is broken — drop and recreate
            sqlsrv_query($conn, "DROP TABLE EmailVerifications");
        }
    }
    if (!$evExists) {
        sqlsrv_query($conn, "CREATE TABLE EmailVerifications (
            TokenID   INT IDENTITY(1,1) PRIMARY KEY,
            Username  NVARCHAR(50)  NOT NULL,
            Token     NVARCHAR(128) NOT NULL UNIQUE,
            ExpiresAt DATETIME      NOT NULL,
            Used      BIT           NOT NULL DEFAULT 0,
            CreatedAt DATETIME      NOT NULL DEFAULT GETDATE()
        )");
    }

    // Ensure IsVerified column exists (default 1 so existing accounts stay verified)
    $chkCol = sqlsrv_query($conn, "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Users' AND COLUMN_NAME='IsVerified'");
    if (!$chkCol || !sqlsrv_fetch_array($chkCol)) {
        sqlsrv_query($conn, "ALTER TABLE Users ADD IsVerified BIT NOT NULL DEFAULT 1");
    }

    $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
    $sql = "INSERT INTO Users (FirstName, LastName, Username, ContactNumber, Email, Password, IsVerified)
            VALUES (?, ?, ?, ?, ?, ?, 0)";
    $result = sqlsrv_query($conn, $sql, [$firstname, $lastname, $username, $contact, $email, $hashedPassword]);

    if (!$result) {
        $errorMessage = 'Registration failed due to a server error. Please try again.';
    } else {
        // Generate verification token
        $token     = bin2hex(random_bytes(32));
        $tokenStmt = sqlsrv_query($conn,
            "INSERT INTO EmailVerifications (Username, Token, ExpiresAt) VALUES (?, ?, DATEADD(HOUR, 24, GETDATE()))",
            [$username, $token]);

        if (!$tokenStmt) {
            $mailError = 'Token DB error: ' . print_r(sqlsrv_errors(), true);
        } elseif (!$mailerAvailable) {
            $mailError = 'Mail library not found. Run "composer install".';
        } else {
            $verifyUrl = APP_URL . '/verify_email.php?token=' . $token;
            $firstName = htmlspecialchars($firstname, ENT_QUOTES, 'UTF-8');

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
                $mail->addAddress($email);
                $mail->isHTML(true);
                $mail->Subject = "Verify your account - GenTri's Best";
                $mail->Body = "
<!DOCTYPE html>
<html>
<body style='font-family:system-ui,Arial,sans-serif;background:#f0f9ff;margin:0;padding:20px;'>
  <div style='max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 4px 12px rgba(14,165,233,.15);'>
    <div style='text-align:center;margin-bottom:24px;'>
      <h2 style='color:#0ea5e9;margin:0 0 4px;'>Verify Your Account</h2>
      <p style='color:#64748b;font-size:14px;margin:0;'>GenTri's Best - Dairy Box</p>
    </div>
    <p style='color:#334155;'>Hi <strong>{$firstName}</strong>,</p>
    <p style='color:#334155;'>Thank you for registering! Please click the button below to verify your email address and activate your account. This link expires in <strong>24 hours</strong>.</p>
    <div style='text-align:center;margin:28px 0;'>
      <a href='{$verifyUrl}' style='display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:1rem;font-weight:600;letter-spacing:.02em;'>Verify My Account</a>
    </div>
    <p style='color:#64748b;font-size:13px;'>If the button doesn't work, copy and paste this link into your browser:<br><a href='{$verifyUrl}' style='color:#0ea5e9;word-break:break-all;'>{$verifyUrl}</a></p>
    <p style='color:#64748b;font-size:13px;'>If you did not register for an account, you can safely ignore this email.</p>
    <hr style='border:none;border-top:1px solid #e0f2fe;margin:24px 0;'>
    <p style='color:#94a3b8;font-size:12px;text-align:center;margin:0;'>GenTri's Best - Dairy Box GenTri</p>
  </div>
</body>
</html>";
                $mail->AltBody = "Hi {$firstName},\n\nPlease verify your account by visiting:\n{$verifyUrl}\n\nThis link expires in 24 hours.\n\n- GenTri's Best Team";
                $mail->send();
                $mailSent = true;
            } catch (\Exception $e) {
                $mailError = $e->getMessage();
            }
        }
    }
}

sqlsrv_close($conn);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Registration Result</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
<?php if ($result): ?>
    <div class="modal fade show" id="successModal" tabindex="-1" style="display:block; background:rgba(0,0,0,0.5);" aria-modal="true" role="dialog">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header bg-success text-white">
            <h5 class="modal-title"><i class="fa-solid fa-circle-check me-2"></i> Registration Successful</h5>
          </div>
          <div class="modal-body text-center">
            <p class="fw-semibold">Welcome, <?= htmlspecialchars($firstname) ?>!</p>
            <?php if ($mailSent): ?>
                <p>A verification link has been sent to <strong><?= htmlspecialchars($email) ?></strong>. Please check your inbox and click the link to activate your account before logging in.</p>
                <p class="text-muted small">Don't see it? Check your spam/junk folder.</p>
            <?php else: ?>
                <p>Your account was created but we could not send a verification email<?= $mailError ? " ($mailError)" : '' ?>. Please contact support to activate your account.</p>
            <?php endif; ?>
          </div>
          <div class="modal-footer justify-content-center">
            <a href="GenTrisBest_Login.html" class="btn btn-success">Go to Login</a>
          </div>
        </div>
      </div>
    </div>
<?php else: ?>
    <div class="modal fade show" id="errorModal" tabindex="-1" style="display:block; background:rgba(0,0,0,0.5);" aria-modal="true" role="dialog">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title"><i class="fa-solid fa-circle-exclamation me-2"></i> Registration Failed</h5>
          </div>
          <div class="modal-body text-center">
            <p class="fw-semibold"><?= htmlspecialchars($errorMessage) ?></p>
          </div>
          <div class="modal-footer">
            <a href="register.html" class="btn btn-danger">Try Again</a>
          </div>
        </div>
      </div>
    </div>
<?php endif; ?>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
