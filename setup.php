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

// Step 3: Create Products table if it doesn't exist
$checkProductsTableSql = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='Products'";
$productsTableResult = sqlsrv_query($conn, $checkProductsTableSql);

if (!$productsTableResult || sqlsrv_fetch_array($productsTableResult) === null) {
    $createProductsTableSql = "CREATE TABLE Products (
        ProductID INT IDENTITY(1,1) PRIMARY KEY,
        ProductName NVARCHAR(100) NOT NULL,
        Description NVARCHAR(500),
        Category NVARCHAR(50),
        Price DECIMAL(10, 2) NOT NULL,
        Quantity INT NOT NULL DEFAULT 0,
        DateAdded DATETIME DEFAULT GETDATE(),
        AddedBy NVARCHAR(50) NOT NULL,
        LastModified DATETIME DEFAULT GETDATE(),
        ModifiedBy NVARCHAR(50),
        Status NVARCHAR(20) DEFAULT 'ACTIVE'
    )";
    
    if (sqlsrv_query($conn, $createProductsTableSql)) {
        $output[] = "✓ Created Products table";
    } else {
        $output[] = "✗ Failed to create Products table: " . print_r(sqlsrv_errors(), true);
    }
} else {
    $output[] = "✓ Products table already exists";
}

// Step 3.5: Add WholesalePrice column to Products if it doesn't exist
$checkWholesaleSql = "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Products' AND COLUMN_NAME='WholesalePrice'";
$wholesaleResult = sqlsrv_query($conn, $checkWholesaleSql);

if (!$wholesaleResult || sqlsrv_fetch_array($wholesaleResult) === null) {
    $addWholesaleSql = "ALTER TABLE Products ADD WholesalePrice DECIMAL(10, 2)";
    if (sqlsrv_query($conn, $addWholesaleSql)) {
        $output[] = "✓ Added WholesalePrice column to Products table";
    } else {
        $output[] = "✗ Failed to add WholesalePrice column: " . print_r(sqlsrv_errors(), true);
    }
} else {
    $output[] = "✓ WholesalePrice column already exists";
}

// Step 4: Create Orders table if it doesn't exist
$checkOrdersTableSql = "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='Orders'";
$ordersTableResult = sqlsrv_query($conn, $checkOrdersTableSql);

if (!$ordersTableResult || sqlsrv_fetch_array($ordersTableResult) === null) {
    $createOrdersTableSql = "CREATE TABLE Orders (
        OrderID INT IDENTITY(1,1) PRIMARY KEY,
        OrderNumber NVARCHAR(50) NOT NULL UNIQUE,
        Username NVARCHAR(50) NOT NULL,
        ProductID INT NOT NULL,
        ProductName NVARCHAR(100) NOT NULL,
        Quantity INT NOT NULL,
        UnitPrice DECIMAL(10, 2) NOT NULL,
        TotalPrice DECIMAL(10, 2) NOT NULL,
        OrderDate DATETIME DEFAULT GETDATE(),
        Status NVARCHAR(20) DEFAULT 'PENDING',
        DeliveryDate DATETIME,
        Notes NVARCHAR(500),
        FOREIGN KEY (ProductID) REFERENCES Products(ProductID),
        FOREIGN KEY (Username) REFERENCES Users(Username)
    )";
    
    if (sqlsrv_query($conn, $createOrdersTableSql)) {
        $output[] = "✓ Created Orders table";
    } else {
        $output[] = "✗ Failed to create Orders table: " . print_r(sqlsrv_errors(), true);
    }
} else {
    $output[] = "✓ Orders table already exists";
}

// Step 4.5: Add PaymentMethod column to Orders if it doesn't exist
$checkPaymentMethodSql = "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Orders' AND COLUMN_NAME='PaymentMethod'";
$paymentMethodResult = sqlsrv_query($conn, $checkPaymentMethodSql);

if (!$paymentMethodResult || sqlsrv_fetch_array($paymentMethodResult) === null) {
    $addPaymentMethodSql = "ALTER TABLE Orders ADD PaymentMethod NVARCHAR(50) DEFAULT 'Cash On Delivery'";
    if (sqlsrv_query($conn, $addPaymentMethodSql)) {
        $output[] = "✓ Added PaymentMethod column to Orders table";
    } else {
        $output[] = "✗ Failed to add PaymentMethod column: " . print_r(sqlsrv_errors(), true);
    }
} else {
    $output[] = "✓ PaymentMethod column already exists";
}

// Step 5: Create default admin account
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
