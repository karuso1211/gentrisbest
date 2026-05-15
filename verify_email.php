<?php
ini_set('display_errors', 0);

$serverName = "DESKTOP-06731U1\SQLEXPRESS";
$connectionOptions = ["Database" => "SOFTENG", "Uid" => "", "PWD" => ""];

$token = trim($_GET['token'] ?? '');

$pageTitle   = '';
$message     = '';
$isSuccess   = false;
$showLogin   = false;

if (!preg_match('/^[0-9a-f]{64}$/', $token)) {
    $pageTitle = 'Invalid Link';
    $message   = 'The verification link is invalid. Please check your email for the correct link.';
} else {
    $conn = sqlsrv_connect($serverName, $connectionOptions);
    if ($conn === false) {
        $pageTitle = 'Server Error';
        $message   = 'A server error occurred. Please try again later.';
    } else {
        $stmt = sqlsrv_query($conn,
            "SELECT TokenID, Username, ExpiresAt, Used FROM EmailVerifications WHERE Token = ?",
            [$token]);

        if (!$stmt || !($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC))) {
            $pageTitle = 'Invalid Link';
            $message   = 'The verification link is invalid or has already been used.';
        } elseif ((int)$row['Used'] === 1) {
            $pageTitle = 'Already Verified';
            $message   = 'This verification link has already been used. You can log in to your account.';
            $isSuccess  = true;
            $showLogin  = true;
        } else {
            // Check expiry
            $now       = new DateTime();
            $expiresAt = $row['ExpiresAt'];
            $expired   = ($expiresAt instanceof DateTime)
                ? ($now > $expiresAt)
                : ($now->getTimestamp() > strtotime($expiresAt));

            if ($expired) {
                sqlsrv_query($conn, "UPDATE EmailVerifications SET Used = 1 WHERE TokenID = ?", [$row['TokenID']]);
                $pageTitle = 'Link Expired';
                $message   = 'Your verification link has expired (links are valid for 24 hours). Please register again or contact support.';
            } else {
                $username = $row['Username'];

                // Mark token used and verify the account
                sqlsrv_query($conn, "UPDATE EmailVerifications SET Used = 1 WHERE TokenID = ?", [$row['TokenID']]);
                $upd = sqlsrv_query($conn, "UPDATE Users SET IsVerified = 1 WHERE Username = ?", [$username]);

                if ($upd) {
                    $pageTitle = 'Email Verified';
                    $message   = 'Your email address has been verified successfully! You can now log in to your account.';
                    $isSuccess = true;
                    $showLogin = true;
                } else {
                    $pageTitle = 'Verification Failed';
                    $message   = 'We could not verify your account due to a server error. Please try again or contact support.';
                }
            }
        }

        sqlsrv_close($conn);
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GenTri's Best | <?= htmlspecialchars($pageTitle) ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root { --sky-blue: #0ea5e9; --sky-blue-hover: #0284c7; }
        body { background:#f0f9ff; min-height:100vh; display:flex; align-items:center; justify-content:center; font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif; }
        .card { max-width:460px; width:100%; border-radius:1rem; box-shadow:0 .5rem 1rem rgba(14,165,233,.15); }
        .icon-circle { width:72px; height:72px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:2rem; }
        .btn-sky { background-color:var(--sky-blue); color:#fff; border:none; }
        .btn-sky:hover { background-color:var(--sky-blue-hover); color:#fff; }
    </style>
</head>
<body>
    <div class="card p-4 border-0 text-center">
        <div class="mb-3">
            <?php if ($isSuccess): ?>
                <div class="icon-circle bg-success bg-opacity-10 text-success mx-auto mb-3">
                    <i class="fa-solid fa-circle-check"></i>
                </div>
                <h4 class="fw-bold text-success mb-2"><?= htmlspecialchars($pageTitle) ?></h4>
            <?php else: ?>
                <div class="icon-circle bg-danger bg-opacity-10 text-danger mx-auto mb-3">
                    <i class="fa-solid fa-circle-exclamation"></i>
                </div>
                <h4 class="fw-bold text-danger mb-2"><?= htmlspecialchars($pageTitle) ?></h4>
            <?php endif; ?>
            <p class="text-muted mb-4"><?= htmlspecialchars($message) ?></p>
            <?php if ($showLogin): ?>
                <a href="GenTrisBest_Login.html" class="btn btn-sky px-4 py-2 fw-semibold">
                    <i class="fa-solid fa-arrow-right-to-bracket me-2"></i>Go to Login
                </a>
            <?php else: ?>
                <a href="register.html" class="btn btn-outline-secondary px-4 py-2">
                    <i class="fa-solid fa-user-plus me-2"></i>Back to Register
                </a>
            <?php endif; ?>
        </div>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
