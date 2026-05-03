<?php
/**
 * Migration: Fix Orders Table Unique Constraint
 * 
 * Issue: OrderNumber had UNIQUE constraint which prevented multiple items
 *        from being stored with the same order number (needed for batch POS orders)
 * 
 * Solution: Remove the UNIQUE constraint from OrderNumber column
 */

session_start();

// Check if user is admin
if (!isset($_SESSION['accountType']) || $_SESSION['accountType'] !== 'ADMIN') {
    echo '<h1>Access Denied</h1>';
    echo '<p>Only administrators can run migrations.</p>';
    exit();
}

$serverName = "DESKTOP-06731U1\SQLEXPRESS";
$connectionOptions = [
    "Database" => "SOFTENG",
    "Uid" => "",
    "PWD" => ""
];

$conn = sqlsrv_connect($serverName, $connectionOptions);
if ($conn === false) {
    die('Database connection failed: ' . print_r(sqlsrv_errors(), true));
}

$output = [];

echo '<h2>Orders Table Migration: Fix Unique Constraint</h2>';
echo '<hr>';

// Check if the table exists
$checkTableSql = "SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Orders'";
$checkTableResult = sqlsrv_query($conn, $checkTableSql);

if ($checkTableResult && sqlsrv_fetch_array($checkTableResult)) {
    echo '<p><strong>✓ Orders table exists</strong></p>';
    
    // Check if the UNIQUE constraint exists on OrderNumber
    $checkConstraintSql = "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.UNIQUE_CONSTRAINTS WHERE TABLE_NAME = 'Orders' AND COLUMN_NAME = 'OrderNumber'";
    $checkConstraintResult = sqlsrv_query($conn, $checkConstraintSql);
    
    if ($checkConstraintResult && $constraint = sqlsrv_fetch_array($checkConstraintResult, SQLSRV_FETCH_ASSOC)) {
        $constraintName = $constraint['CONSTRAINT_NAME'];
        echo '<p><strong>Found UNIQUE constraint on OrderNumber:</strong> ' . htmlspecialchars($constraintName) . '</p>';
        
        // Drop the constraint
        $dropConstraintSql = "ALTER TABLE Orders DROP CONSTRAINT " . $constraintName;
        
        if (sqlsrv_query($conn, $dropConstraintSql)) {
            echo '<p style="color: green;"><i class="fa-solid fa-check"></i> <strong>✓ Successfully dropped UNIQUE constraint from OrderNumber</strong></p>';
            echo '<p><em>Multiple items can now be stored with the same order number for batch POS orders.</em></p>';
        } else {
            echo '<p style="color: red;"><i class="fa-solid fa-times"></i> <strong>✗ Failed to drop constraint:</strong></p>';
            echo '<pre>' . print_r(sqlsrv_errors(), true) . '</pre>';
        }
    } else {
        echo '<p style="color: blue;"><strong>ℹ Info:</strong> No UNIQUE constraint found on OrderNumber. Table is already in correct state.</p>';
    }
} else {
    echo '<p style="color: orange;"><strong>⚠ Warning:</strong> Orders table not found. Please run setup.php first.</p>';
}

sqlsrv_close($conn);

echo '<hr>';
echo '<p><a href="GenTrisBest_Dashboard.html" class="btn btn-primary">Back to Dashboard</a></p>';
?>
