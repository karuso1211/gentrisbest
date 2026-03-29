<?php
/**
 * Uninstall Script - Removes all database tables
 * Access at: http://localhost/gentrisbest/uninstall.php
 * WARNING: This will permanently delete all data!
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
$action = isset($_POST['action']) ? $_POST['action'] : null;

// If user confirms deletion
if ($action === 'confirm_uninstall') {
    // Drop Orders table first (has foreign key dependency)
    $dropOrdersSql = "IF OBJECT_ID('Orders', 'U') IS NOT NULL DROP TABLE Orders";
    if (sqlsrv_query($conn, $dropOrdersSql)) {
        $output[] = "✓ Dropped Orders table";
    } else {
        $output[] = "✗ Failed to drop Orders table: " . print_r(sqlsrv_errors(), true);
    }
    
    // Drop Products table
    $dropProductsSql = "IF OBJECT_ID('Products', 'U') IS NOT NULL DROP TABLE Products";
    if (sqlsrv_query($conn, $dropProductsSql)) {
        $output[] = "✓ Dropped Products table";
    } else {
        $output[] = "✗ Failed to drop Products table: " . print_r(sqlsrv_errors(), true);
    }
    
    // Drop Users table
    $dropUsersSql = "IF OBJECT_ID('Users', 'U') IS NOT NULL DROP TABLE Users";
    if (sqlsrv_query($conn, $dropUsersSql)) {
        $output[] = "✓ Dropped Users table";
    } else {
        $output[] = "✗ Failed to drop Users table: " . print_r(sqlsrv_errors(), true);
    }
    
    $output[] = "";
    $output[] = "✓ Uninstall Complete! All database tables have been removed.";
    $output[] = "You can now run setup.php to start fresh.";
    $uninstallComplete = true;
} else {
    $uninstallComplete = false;
}

sqlsrv_close($conn);
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GenTri's Best - Uninstall</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        :root {
            --sky-blue: #0ea5e9;
            --danger-red: #ef4444;
        }
        body {
            background-color: #fef2f2;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        .uninstall-container {
            background: white;
            border-radius: 1rem;
            box-shadow: 0 0.5rem 1rem rgba(239, 68, 68, 0.15);
            padding: 2rem;
            max-width: 600px;
            width: 100%;
            border-left: 4px solid var(--danger-red);
        }
        .uninstall-container h1 {
            color: var(--danger-red);
            margin-bottom: 1rem;
        }
        .alert-danger-light {
            background-color: #fee2e2;
            border: 1px solid #fecaca;
            color: #991b1b;
            padding: 1.5rem;
            border-radius: 0.5rem;
            margin-bottom: 1.5rem;
        }
        .alert-danger-light strong {
            color: #7f1d1d;
        }
        .confirmation-list {
            background-color: #fef2f2;
            border: 1px solid #fed7d7;
            border-radius: 0.5rem;
            padding: 1rem;
            margin-bottom: 1.5rem;
        }
        .confirmation-list li {
            margin-bottom: 0.5rem;
            color: #991b1b;
        }
        .confirmation-list strong {
            color: #7f1d1d;
        }
        .output {
            background-color: #1f2937;
            color: #10b981;
            border: 1px solid #374151;
            border-radius: 0.5rem;
            padding: 1rem;
            max-height: 300px;
            overflow-y: auto;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            margin-bottom: 1.5rem;
        }
        .output p {
            margin: 0.5rem 0;
        }
        .btn-danger-custom {
            background-color: var(--danger-red);
            border-color: var(--danger-red);
            color: white;
        }
        .btn-danger-custom:hover {
            background-color: #dc2626;
            border-color: #dc2626;
            color: white;
        }
        .btn-secondary-custom {
            background-color: var(--sky-blue);
            border-color: var(--sky-blue);
            color: white;
        }
        .btn-secondary-custom:hover {
            background-color: #0284c7;
            border-color: #0284c7;
            color: white;
        }
        .text-muted-custom {
            color: #666;
            font-size: 0.9rem;
        }
        .success-message {
            background-color: #dcfce7;
            border: 1px solid #86efac;
            border-radius: 0.5rem;
            padding: 1rem;
            color: #166534;
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>
    <div class="uninstall-container">
        <h1>
            <i class="fa-solid fa-triangle-exclamation me-2"></i>Uninstall GenTri's Best
        </h1>
        
        <?php if ($uninstallComplete): ?>
            <!-- Success Message -->
            <div class="success-message">
                <h5 class="mb-2">
                    <i class="fa-solid fa-check-circle me-2"></i>Uninstall Complete
                </h5>
                <div class="output">
                    <?php foreach ($output as $line): ?>
                        <p><?php echo htmlspecialchars($line); ?></p>
                    <?php endforeach; ?>
                </div>
                <div class="alert alert-info mb-0">
                    <i class="fa-solid fa-info-circle me-2"></i>
                    <strong>Next Step:</strong> Click the button below to run setup.php and recreate all tables.
                </div>
            </div>
            <a href="setup.php" class="btn btn-secondary-custom w-100 fw-medium">
                <i class="fa-solid fa-cog me-2"></i>Go to Setup
            </a>
        <?php else: ?>
            <!-- Warning Message -->
            <div class="alert-danger-light">
                <strong class="d-block mb-2">
                    <i class="fa-solid fa-exclamation-triangle me-2"></i>WARNING: This action cannot be undone!
                </strong>
                <p class="mb-0">This will permanently delete all database tables including:</p>
            </div>
            
            <!-- Tables to be deleted -->
            <div class="confirmation-list">
                <ul class="mb-0">
                    <li><strong>Users Table</strong> - All user accounts and profiles</li>
                    <li><strong>Products Table</strong> - All products and inventory</li>
                    <li><strong>Orders Table</strong> - All orders and transaction history</li>
                </ul>
            </div>
            
            <div class="alert alert-danger mb-3">
                <i class="fa-solid fa-bomb me-2"></i>
                <strong>All data will be permanently deleted!</strong>
                <p class="mb-0 mt-2 text-muted-custom">Make sure you have backed up any important data before proceeding.</p>
            </div>
            
            <!-- Confirmation Form -->
            <form method="POST" class="d-flex gap-2">
                <input type="hidden" name="action" value="confirm_uninstall">
                <button type="submit" class="btn btn-danger-custom flex-grow-1 fw-medium" onclick="return confirm('Are you absolutely sure? This will delete ALL data permanently!')">
                    <i class="fa-solid fa-trash me-2"></i>Yes, Delete Everything
                </button>
                <a href="GenTrisBest_Login.html" class="btn btn-secondary-custom fw-medium">
                    <i class="fa-solid fa-arrow-left me-2"></i>Cancel
                </a>
            </form>
            
            <div class="mt-3 text-center text-muted-custom">
                <small>
                    <i class="fa-solid fa-shield-exclamation me-1"></i>
                    This action requires confirmation. You will be prompted again before deletion.
                </small>
            </div>
        <?php endif; ?>
    </div>

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</body>
</html>
