<?php
session_start();

// Destroy the session
session_destroy();

// Clear session variables
$_SESSION = array();
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
