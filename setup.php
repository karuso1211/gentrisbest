<?php
/**
 * Setup/Migration Script - Run this once to initialize admin features
 * Access at: http://localhost/gentrisbest/setup.php
 */

$serverName = "DESKTOP-06731U1\SQLEXPRESS";
$connectionOptions = [
    "Database" => "SOFTENG",
    "Uid" => "",
    "PWD" => ""
];

$conn = sqlsrv_connect($serverName, $connectionOptions);
if ($conn === false) {
    die("Database connection failed: " . print_r(sqlsrv_errors(), true));
}

$output = [];

// Step 0: Create Users table if it doesn't exist
$checkTableSql = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='Users'";
$tableResult = sqlsrv_query($conn, $checkTableSql);

if (!$tableResult || sqlsrv_fetch_array($tableResult) === null) {
    $createTableSql = "CREATE TABLE Users (
        UserID INT IDENTITY(1,1) PRIMARY KEY,
        FirstName NVARCHAR(50) NOT NULL,
        LastName NVARCHAR(50) NOT NULL,
        Username NVARCHAR(50) NOT NULL UNIQUE,
        ContactNumber NVARCHAR(20) NOT NULL,
        Email NVARCHAR(100) NOT NULL UNIQUE,
        Password NVARCHAR(255) NOT NULL
    )";
    
    if (sqlsrv_query($conn, $createTableSql)) {
        $output[] = "✓ Created Users table";
    } else {
        $output[] = "✗ Failed to create Users table: " . print_r(sqlsrv_errors(), true);
    }
} else {
    $output[] = "✓ Users table already exists";
}

// Step 1: Add account_type column if it doesn't exist
$checkColumnSql = "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Users' AND COLUMN_NAME='AccountType'";
$result = sqlsrv_query($conn, $checkColumnSql);

if (!$result || sqlsrv_fetch_array($result) === null) {
    $addColumnSql = "ALTER TABLE Users ADD AccountType VARCHAR(50) DEFAULT 'USER'";
    if (sqlsrv_query($conn, $addColumnSql)) {
        $output[] = "✓ Added AccountType column to Users table";
    } else {
        $output[] = "✗ Failed to add AccountType column: " . print_r(sqlsrv_errors(), true);
    }
} else {
    $output[] = "✓ AccountType column already exists";
}

// Step 2: Create default admin account
$adminUsername = "admin123";
$adminPassword = "password12345";

$checkAdminSql = "SELECT * FROM Users WHERE Username = ?";
$params = array($adminUsername);
$stmt = sqlsrv_query($conn, $checkAdminSql, $params);

if ($stmt && sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
    $output[] = "✓ Admin account already exists";
} else {
    // Insert admin account
    $insertAdminSql = "INSERT INTO Users (FirstName, LastName, Username, Email, ContactNumber, Password, AccountType) VALUES (?, ?, ?, ?, ?, ?, ?)";
    $adminParams = array(
        "Admin",
        "User",
        $adminUsername,
        "admin@gentrisbest.com",
        "0000000000",
        $adminPassword,
        "ADMIN"
    );
    
    if (sqlsrv_query($conn, $insertAdminSql, $adminParams)) {
        $output[] = "✓ Default admin account created successfully";
        $output[] = "  Username: " . $adminUsername;
        $output[] = "  Password: " . $adminPassword;
    } else {
        $output[] = "✗ Failed to create admin account: " . print_r(sqlsrv_errors(), true);
    }
}

sqlsrv_close($conn);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GenTri's Best - Setup</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        :root {
            --sky-blue: #0ea5e9;
        }
        body {
            background-color: #f0f9ff;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .setup-container {
            background: white;
            border-radius: 1rem;
            box-shadow: 0 0.5rem 1rem rgba(14, 165, 233, 0.15);
            padding: 2rem;
            max-width: 500px;
            width: 100%;
        }
        .setup-container h1 {
            color: var(--sky-blue);
            margin-bottom: 1.5rem;
        }
        .output {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 0.5rem;
            padding: 1rem;
            max-height: 300px;
            overflow-y: auto;
            font-family: monospace;
            font-size: 0.9rem;
        }
        .output p {
            margin: 0.5rem 0;
        }
    </style>
</head>
<body>
    <div class="setup-container">
        <h1>🔧 GenTri's Best Setup</h1>
        <p class="text-muted">Initializing admin features...</p>
        
        <div class="output">
            <?php foreach ($output as $line): ?>
                <p><?php echo htmlspecialchars($line); ?></p>
            <?php endforeach; ?>
        </div>

        <div class="alert alert-info mt-3">
            <strong>Setup Complete!</strong> You can now access the admin panel with:
            <br><strong>Username:</strong> admin123
            <br><strong>Password:</strong> password12345
        </div>

        <a href="GenTrisBest_Login.html" class="btn btn-primary w-100">Go to Login</a>
    </div>
</body>
</html>
