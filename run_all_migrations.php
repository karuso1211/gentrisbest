<?php
/**
 * GenTri's Best - All-in-One Migration Runner
 * Run this file once via browser to bring the database fully up to date.
 * Safe to re-run: every step checks before acting (idempotent).
 * Access at: http://localhost/gentrisbest/run_all_migrations.php
 */

$serverName = "DESKTOP-06731U1\SQLEXPRESS";
$connectionOptions = ["Database" => "SOFTENG", "Uid" => "", "PWD" => ""];

$steps = [];

function ok($msg)   { return ['status' => 'ok',   'msg' => $msg]; }
function err($msg)  { return ['status' => 'err',  'msg' => $msg]; }
function info($msg) { return ['status' => 'info', 'msg' => $msg]; }

$conn = sqlsrv_connect($serverName, $connectionOptions);
if ($conn === false) {
    $steps[] = err("Database connection failed: " . print_r(sqlsrv_errors(), true));
    $connFailed = true;
} else {
    $connFailed = false;
    $steps[] = ok("Connected to database (SOFTENG on DESKTOP-06731U1\\SQLEXPRESS)");
}

if (!$connFailed) {

    // ─── USERS TABLE ──────────────────────────────────────────────────────────
    $r = sqlsrv_query($conn, "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='Users'");
    if (!$r || !sqlsrv_fetch_array($r)) {
        $sql = "CREATE TABLE Users (
            UserID INT IDENTITY(1,1) PRIMARY KEY,
            FirstName NVARCHAR(50) NOT NULL,
            LastName NVARCHAR(50) NOT NULL,
            Username NVARCHAR(50) NOT NULL UNIQUE,
            ContactNumber NVARCHAR(20) NOT NULL,
            Email NVARCHAR(100) NOT NULL UNIQUE,
            Password NVARCHAR(255) NOT NULL
        )";
        $steps[] = sqlsrv_query($conn, $sql) ? ok("Created Users table") : err("Failed to create Users table: " . print_r(sqlsrv_errors(), true));
    } else {
        $steps[] = info("Users table already exists");
    }

    // AccountType column
    $r = sqlsrv_query($conn, "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Users' AND COLUMN_NAME='AccountType'");
    if (!$r || !sqlsrv_fetch_array($r)) {
        $steps[] = sqlsrv_query($conn, "ALTER TABLE Users ADD AccountType VARCHAR(50) DEFAULT 'USER'")
            ? ok("Added AccountType column to Users")
            : err("Failed to add AccountType: " . print_r(sqlsrv_errors(), true));
    } else {
        $steps[] = info("AccountType column already exists");
    }

    // ─── PRODUCTS TABLE ───────────────────────────────────────────────────────
    $r = sqlsrv_query($conn, "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='Products'");
    if (!$r || !sqlsrv_fetch_array($r)) {
        $sql = "CREATE TABLE Products (
            ProductID INT IDENTITY(1,1) PRIMARY KEY,
            ProductName NVARCHAR(100) NOT NULL,
            Description NVARCHAR(500),
            Category NVARCHAR(50),
            Price DECIMAL(10,2) NOT NULL,
            Quantity INT NOT NULL DEFAULT 0,
            DateAdded DATETIME DEFAULT GETDATE(),
            AddedBy NVARCHAR(50) NOT NULL,
            LastModified DATETIME DEFAULT GETDATE(),
            ModifiedBy NVARCHAR(50),
            Status NVARCHAR(20) DEFAULT 'ACTIVE'
        )";
        $steps[] = sqlsrv_query($conn, $sql) ? ok("Created Products table") : err("Failed to create Products table: " . print_r(sqlsrv_errors(), true));
    } else {
        $steps[] = info("Products table already exists");
    }

    // WholesalePrice column
    $r = sqlsrv_query($conn, "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Products' AND COLUMN_NAME='WholesalePrice'");
    if (!$r || !sqlsrv_fetch_array($r)) {
        $steps[] = sqlsrv_query($conn, "ALTER TABLE Products ADD WholesalePrice DECIMAL(10,2)")
            ? ok("Added WholesalePrice column to Products")
            : err("Failed to add WholesalePrice: " . print_r(sqlsrv_errors(), true));
    } else {
        $steps[] = info("WholesalePrice column already exists");
    }

    // ─── ORDERS TABLE ─────────────────────────────────────────────────────────
    $r = sqlsrv_query($conn, "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='Orders'");
    if (!$r || !sqlsrv_fetch_array($r)) {
        $sql = "CREATE TABLE Orders (
            OrderID INT IDENTITY(1,1) PRIMARY KEY,
            OrderNumber NVARCHAR(50) NOT NULL,
            Username NVARCHAR(50) NOT NULL,
            ProductID INT NOT NULL,
            ProductName NVARCHAR(100) NOT NULL,
            Quantity INT NOT NULL,
            UnitPrice DECIMAL(10,2) NOT NULL,
            TotalPrice DECIMAL(10,2) NOT NULL,
            OrderDate DATETIME DEFAULT GETDATE(),
            Status NVARCHAR(20) DEFAULT 'PENDING',
            DeliveryDate DATETIME,
            Notes NVARCHAR(500),
            FOREIGN KEY (ProductID) REFERENCES Products(ProductID),
            FOREIGN KEY (Username) REFERENCES Users(Username)
        )";
        $steps[] = sqlsrv_query($conn, $sql) ? ok("Created Orders table") : err("Failed to create Orders table: " . print_r(sqlsrv_errors(), true));
    } else {
        $steps[] = info("Orders table already exists");
    }

    // PaymentMethod column
    $r = sqlsrv_query($conn, "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Orders' AND COLUMN_NAME='PaymentMethod'");
    if (!$r || !sqlsrv_fetch_array($r)) {
        $steps[] = sqlsrv_query($conn, "ALTER TABLE Orders ADD PaymentMethod NVARCHAR(50) DEFAULT 'Cash On Delivery'")
            ? ok("Added PaymentMethod column to Orders")
            : err("Failed to add PaymentMethod: " . print_r(sqlsrv_errors(), true));
    } else {
        $steps[] = info("PaymentMethod column already exists");
    }

    // DeliveryAddress column
    $r = sqlsrv_query($conn, "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Orders' AND COLUMN_NAME='DeliveryAddress'");
    if (!$r || !sqlsrv_fetch_array($r)) {
        $steps[] = sqlsrv_query($conn, "ALTER TABLE Orders ADD DeliveryAddress NVARCHAR(500) NULL")
            ? ok("Added DeliveryAddress column to Orders")
            : err("Failed to add DeliveryAddress: " . print_r(sqlsrv_errors(), true));
    } else {
        $steps[] = info("DeliveryAddress column already exists");
    }

    // DeliveryFee column
    $r = sqlsrv_query($conn, "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Orders' AND COLUMN_NAME='DeliveryFee'");
    if (!$r || !sqlsrv_fetch_array($r)) {
        $steps[] = sqlsrv_query($conn, "ALTER TABLE Orders ADD DeliveryFee DECIMAL(10,2) DEFAULT 0")
            ? ok("Added DeliveryFee column to Orders")
            : err("Failed to add DeliveryFee: " . print_r(sqlsrv_errors(), true));
    } else {
        $steps[] = info("DeliveryFee column already exists");
    }

    // ShippedDate column (migrate_add_shipped_date.php)
    $r = sqlsrv_query($conn, "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Orders' AND COLUMN_NAME='ShippedDate'");
    if (!$r || !sqlsrv_fetch_array($r)) {
        $steps[] = sqlsrv_query($conn, "ALTER TABLE Orders ADD ShippedDate DATETIME NULL")
            ? ok("Added ShippedDate column to Orders")
            : err("Failed to add ShippedDate: " . print_r(sqlsrv_errors(), true));
    } else {
        $steps[] = info("ShippedDate column already exists");
    }

    // ─── REMOVE UNIQUE CONSTRAINT ON OrderNumber (migrate_orders_table.php) ───
    $r = sqlsrv_query($conn, "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.UNIQUE_CONSTRAINTS WHERE TABLE_NAME='Orders' AND COLUMN_NAME='OrderNumber'");
    if ($r && $constraint = sqlsrv_fetch_array($r, SQLSRV_FETCH_ASSOC)) {
        $constraintName = $constraint['CONSTRAINT_NAME'];
        $steps[] = sqlsrv_query($conn, "ALTER TABLE Orders DROP CONSTRAINT " . $constraintName)
            ? ok("Dropped UNIQUE constraint on OrderNumber ($constraintName) — allows batch POS orders")
            : err("Failed to drop UNIQUE constraint on OrderNumber: " . print_r(sqlsrv_errors(), true));
    } else {
        $steps[] = info("No UNIQUE constraint on OrderNumber (already correct)");
    }

    // ─── PASSWORD RESETS TABLE ────────────────────────────────────────────────
    $r = sqlsrv_query($conn, "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='PasswordResets'");
    if (!$r || !sqlsrv_fetch_array($r)) {
        $sql = "CREATE TABLE PasswordResets (
            ResetID   INT IDENTITY(1,1) PRIMARY KEY,
            Email     NVARCHAR(100) NOT NULL,
            Token     NVARCHAR(64)  NOT NULL UNIQUE,
            ExpiresAt DATETIME      NOT NULL,
            Used      BIT           NOT NULL DEFAULT 0,
            CreatedAt DATETIME      NOT NULL DEFAULT GETDATE()
        )";
        $steps[] = sqlsrv_query($conn, $sql) ? ok("Created PasswordResets table") : err("Failed to create PasswordResets table: " . print_r(sqlsrv_errors(), true));
    } else {
        $steps[] = info("PasswordResets table already exists");
    }

    // ─── LOGIN OTP TABLE ─────────────────────────────────────────────────────
    $r = sqlsrv_query($conn, "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='LoginOTP'");
    if (!$r || !sqlsrv_fetch_array($r)) {
        $sql = "CREATE TABLE LoginOTP (
            OTPID     INT IDENTITY(1,1) PRIMARY KEY,
            Username  NVARCHAR(50)  NOT NULL,
            OTPHash   NVARCHAR(255) NOT NULL,
            TempToken NVARCHAR(64)  NOT NULL UNIQUE,
            ExpiresAt DATETIME      NOT NULL,
            Used      BIT           NOT NULL DEFAULT 0,
            Attempts  INT           NOT NULL DEFAULT 0,
            CreatedAt DATETIME      NOT NULL DEFAULT GETDATE()
        )";
        $steps[] = sqlsrv_query($conn, $sql)
            ? ok("Created LoginOTP table")
            : err("Failed to create LoginOTP table: " . print_r(sqlsrv_errors(), true));
    } else {
        $steps[] = info("LoginOTP table already exists");
    }

    // ─── IsVerified COLUMN ON USERS ──────────────────────────────────────────
    $r = sqlsrv_query($conn, "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='Users' AND COLUMN_NAME='IsVerified'");
    if (!$r || !sqlsrv_fetch_array($r)) {
        $steps[] = sqlsrv_query($conn, "ALTER TABLE Users ADD IsVerified BIT NOT NULL DEFAULT 1")
            ? ok("Added IsVerified column to Users (existing accounts default to verified)")
            : err("Failed to add IsVerified column: " . print_r(sqlsrv_errors(), true));
    } else {
        $steps[] = info("IsVerified column already exists");
    }

    // ─── EMAIL VERIFICATIONS TABLE ────────────────────────────────────────────
    $evExists = false;
    $r = sqlsrv_query($conn, "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='EmailVerifications'");
    if ($r && sqlsrv_fetch_array($r)) {
        $evExists = true;
        // Check schema is intact — drop and recreate if Username column is missing
        $rc = sqlsrv_query($conn, "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='EmailVerifications' AND COLUMN_NAME='Username'");
        if (!$rc || !sqlsrv_fetch_array($rc)) {
            sqlsrv_query($conn, "DROP TABLE EmailVerifications");
            $evExists = false;
            $steps[] = ok("Dropped incomplete EmailVerifications table (missing columns) — will recreate");
        } else {
            $steps[] = info("EmailVerifications table already exists and schema is intact");
        }
    }
    if (!$evExists) {
        $sql = "CREATE TABLE EmailVerifications (
            TokenID   INT IDENTITY(1,1) PRIMARY KEY,
            Username  NVARCHAR(50)  NOT NULL,
            Token     NVARCHAR(128) NOT NULL UNIQUE,
            ExpiresAt DATETIME      NOT NULL,
            Used      BIT           NOT NULL DEFAULT 0,
            CreatedAt DATETIME      NOT NULL DEFAULT GETDATE()
        )";
        $steps[] = sqlsrv_query($conn, $sql)
            ? ok("Created EmailVerifications table")
            : err("Failed to create EmailVerifications table: " . print_r(sqlsrv_errors(), true));
    }

    // ─── PRODUCT REVIEWS TABLE ───────────────────────────────────────────────
    $r = sqlsrv_query($conn, "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME='ProductReviews'");
    if (!$r || !sqlsrv_fetch_array($r)) {
        $sql = "CREATE TABLE ProductReviews (
            ReviewID  INT IDENTITY(1,1) PRIMARY KEY,
            OrderID   INT           NOT NULL,
            ProductID INT           NOT NULL,
            Username  NVARCHAR(50)  NOT NULL,
            Rating    TINYINT       NOT NULL CHECK (Rating BETWEEN 1 AND 5),
            Comment   NVARCHAR(500) NULL,
            CreatedAt DATETIME      NOT NULL DEFAULT GETDATE(),
            CONSTRAINT UQ_Review_OrderProduct UNIQUE (OrderID, ProductID),
            FOREIGN KEY (ProductID) REFERENCES Products(ProductID),
            FOREIGN KEY (Username)  REFERENCES Users(Username)
        )";
        $steps[] = sqlsrv_query($conn, $sql)
            ? ok("Created ProductReviews table")
            : err("Failed to create ProductReviews table: " . print_r(sqlsrv_errors(), true));
    } else {
        $steps[] = info("ProductReviews table already exists");
    }

    // ─── SYSTEM ACCOUNTS ──────────────────────────────────────────────────────
    $adminUsername = "admin123";
    $r = sqlsrv_query($conn, "SELECT Username FROM Users WHERE Username = ?", [$adminUsername]);
    if ($r && sqlsrv_fetch_array($r)) {
        $steps[] = info("Admin account already exists (admin123)");
    } else {
        $sql = "INSERT INTO Users (FirstName, LastName, Username, Email, ContactNumber, Password, AccountType) VALUES (?, ?, ?, ?, ?, ?, ?)";
        $params = ["Admin", "User", "admin123", "admin@gentrisbest.com", "0000000000", password_hash("password12345", PASSWORD_BCRYPT), "ADMIN"];
        $steps[] = sqlsrv_query($conn, $sql, $params)
            ? ok("Created admin account — Username: admin123 / Password: password12345")
            : err("Failed to create admin account: " . print_r(sqlsrv_errors(), true));
    }

    $walkInUsername = "WALKIN_CUSTOMER";
    $r = sqlsrv_query($conn, "SELECT Username FROM Users WHERE Username = ?", [$walkInUsername]);
    if ($r && sqlsrv_fetch_array($r)) {
        $steps[] = info("WALKIN_CUSTOMER account already exists");
    } else {
        $sql = "INSERT INTO Users (FirstName, LastName, Username, Email, ContactNumber, Password, AccountType) VALUES (?, ?, ?, ?, ?, ?, ?)";
        $params = ["Walk-In", "Customer", "WALKIN_CUSTOMER", "walkin@gentrisbest.com", "N/A", "system_generated", "GUEST"];
        $steps[] = sqlsrv_query($conn, $sql, $params)
            ? ok("Created WALKIN_CUSTOMER account (for POS transactions)")
            : err("Failed to create WALKIN_CUSTOMER: " . print_r(sqlsrv_errors(), true));
    }

    // ─── HASH PLAINTEXT PASSWORDS (migrate_passwords.php) ────────────────────
    $stmt = sqlsrv_query($conn, "SELECT Username, Password FROM Users");
    $migrated = 0;
    $skipped  = 0;
    $hashErrors = 0;
    if ($stmt) {
        while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
            if (str_starts_with($row['Password'], '$2y$')) { $skipped++; continue; }
            $hashed = password_hash($row['Password'], PASSWORD_BCRYPT);
            $upd = sqlsrv_query($conn, "UPDATE Users SET Password = ? WHERE Username = ?", [$hashed, $row['Username']]);
            $upd ? $migrated++ : $hashErrors++;
        }
    }
    if ($hashErrors > 0) {
        $steps[] = err("Password hashing: migrated $migrated, skipped $skipped (already hashed), $hashErrors errors");
    } elseif ($migrated > 0) {
        $steps[] = ok("Hashed $migrated plaintext password(s); $skipped already hashed");
    } else {
        $steps[] = info("All passwords already hashed ($skipped total)");
    }

    sqlsrv_close($conn);
}

$hasErrors = count(array_filter($steps, fn($s) => $s['status'] === 'err')) > 0;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GenTri's Best — Migration Runner</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        body { background: #f0f9ff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .card { max-width: 640px; width: 100%; border-radius: 1rem; box-shadow: 0 .5rem 1.5rem rgba(14,165,233,.18); }
        .card-header { background: #0ea5e9; color: #fff; border-radius: 1rem 1rem 0 0 !important; }
        .step { font-family: monospace; font-size: .88rem; padding: .35rem .6rem; border-radius: .4rem; margin-bottom: .4rem; }
        .step.ok   { background: #d1fae5; color: #065f46; }
        .step.err  { background: #fee2e2; color: #991b1b; }
        .step.info { background: #e0f2fe; color: #0c4a6e; }
        .badge-ok   { background: #10b981; }
        .badge-err  { background: #ef4444; }
    </style>
</head>
<body>
<div class="container py-4">
    <div class="card mx-auto">
        <div class="card-header py-3 d-flex align-items-center gap-2">
            <i class="fa-solid fa-database fa-lg"></i>
            <div>
                <h5 class="mb-0 fw-bold">GenTri's Best — Migration Runner</h5>
                <small class="opacity-75">All migrations &amp; setup in one place</small>
            </div>
        </div>
        <div class="card-body">

            <div class="mb-3">
                <?php if ($hasErrors): ?>
                    <span class="badge badge-err text-white fs-6"><i class="fa-solid fa-triangle-exclamation me-1"></i> Completed with errors</span>
                <?php else: ?>
                    <span class="badge badge-ok text-white fs-6"><i class="fa-solid fa-circle-check me-1"></i> All migrations successful</span>
                <?php endif; ?>
            </div>

            <div class="mb-4">
                <?php foreach ($steps as $step): ?>
                    <div class="step <?= $step['status'] ?>">
                        <?php if ($step['status'] === 'ok'):  ?>
                            <i class="fa-solid fa-check me-1"></i>
                        <?php elseif ($step['status'] === 'err'): ?>
                            <i class="fa-solid fa-xmark me-1"></i>
                        <?php else: ?>
                            <i class="fa-solid fa-info-circle me-1"></i>
                        <?php endif; ?>
                        <?= htmlspecialchars($step['msg']) ?>
                    </div>
                <?php endforeach; ?>
            </div>

            <?php if (!$hasErrors): ?>
            <div class="alert alert-success py-2">
                <strong>Default credentials</strong> (if admin was just created):<br>
                Username: <code>admin123</code> &nbsp;|&nbsp; Password: <code>password12345</code>
            </div>
            <?php endif; ?>

            <div class="alert alert-warning py-2 mb-3">
                <i class="fa-solid fa-lock me-1"></i>
                <strong>Security reminder:</strong> Delete or restrict access to this file after running it.
            </div>

            <a href="GenTrisBest_Login.html" class="btn btn-primary w-100">
                <i class="fa-solid fa-arrow-right-to-bracket me-1"></i> Go to Login
            </a>
        </div>
    </div>
</div>
</body>
</html>
