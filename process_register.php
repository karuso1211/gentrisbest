<?php
$serverName = "DESKTOP-06731U1\SQLEXPRESS";
$connectionOptions = [
    "Database" => "SOFTENG",
    "Uid" => "",
    "PWD" => ""
];
$conn = sqlsrv_connect($serverName, $connectionOptions);
if ($conn == false) die(print_r(sqlsrv_errors(), true));

$firstname = $_POST['firstName'];
$lastname = $_POST['lastName'];
$username = $_POST['username'];
$contact = $_POST['contactNumber'];
$email = $_POST['email'];
$password = $_POST['password'];
$confirmPassword = $_POST['confirmPassword'];

// Validate that passwords match (case-sensitive comparison)
if ($password !== $confirmPassword) {
    $result = false;
    $passwordError = "Passwords do not match";
} else {
    $sql = "INSERT INTO Users (FirstName, LastName, Username, ContactNumber, Email, Password)
            VALUES (?, ?, ?, ?, ?, ?)";
    $params = array($firstname, $lastname, $username, $contact, $email, $password);
    $result = sqlsrv_query($conn, $sql, $params);
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Registration Result</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
<?php if ($result): ?>
    <!-- Success Modal -->
    <div class="modal fade show" id="successModal" tabindex="-1" style="display:block; background:rgba(0,0,0,0.5);" aria-modal="true" role="dialog">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header bg-success text-white">
            <h5 class="modal-title"><i class="fa-solid fa-circle-check me-2"></i> Registration Successful</h5>
          </div>
          <div class="modal-body text-center">
            <p class="fw-semibold">Thank you for registering, <?= htmlspecialchars($firstname) ?>!</p>
            <p>You can now log in to your account.</p>
          </div>
          <div class="modal-footer">
            <a href="GenTrisBest_Login.html" class="btn btn-success">Go to Login</a>
          </div>
        </div>
      </div>
    </div>
<?php else: ?>
    <!-- Error Modal -->
    <div class="modal fade show" id="errorModal" tabindex="-1" style="display:block; background:rgba(0,0,0,0.5);" aria-modal="true" role="dialog">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title"><i class="fa-solid fa-circle-exclamation me-2"></i> Registration Failed</h5>
          </div>
          <div class="modal-body text-center">
            <p class="fw-semibold">An error occurred while saving your registration.</p>
            <pre class="text-muted small"><?= print_r(sqlsrv_errors(), true) ?></pre>
          </div>
          <div class="modal-footer">
            <a href="GenTrisBest_Register.html" class="btn btn-danger">Try Again</a>
          </div>
        </div>
      </div>
    </div>
<?php endif; ?>

<script src="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/js/all.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>

<?php sqlsrv_close($conn); ?>
