<?php
session_start();

// Set JSON response header
header('Content-Type: application/json');

// Check if user is authenticated
if (!isset($_SESSION['username'])) {
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
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
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit();
}

// Get current user's account type
$username = $_SESSION['username'];
$checkUserSql = "SELECT AccountType FROM Users WHERE Username = ?";
$params = array($username);
$stmt = sqlsrv_query($conn, $checkUserSql, $params);
$row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);

// Check if user has permission to access inventory (ADMIN, Inventory, Manager)
$allowedRoles = ['ADMIN', 'INVENTORY', 'MANAGER'];
if (!$row || !in_array($row['AccountType'], $allowedRoles)) {
    echo json_encode(['success' => false, 'error' => 'Inventory access required. Allowed roles: ADMIN, INVENTORY, MANAGER']);
    exit();
}

// Get request action
$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : null);

if ($action === 'get_all_products') {
    // Fetch all products
    $sql = "SELECT ProductID, ProductName, Category, Description, Price, Quantity, Status, DateAdded, AddedBy FROM Products ORDER BY DateAdded DESC";
    $result = sqlsrv_query($conn, $sql);
    
    if ($result === false) {
        echo json_encode(['success' => false, 'error' => 'Failed to fetch products']);
        exit();
    }
    
    $products = [];
    while ($row = sqlsrv_fetch_array($result, SQLSRV_FETCH_ASSOC)) {
        $products[] = $row;
    }
    
    echo json_encode(['success' => true, 'products' => $products]);
    
} elseif ($action === 'add_product') {
    // Add new product - Check for write permissions (ADMIN, INVENTORY)
    $allowedWriteRoles = ['ADMIN', 'INVENTORY', 'MANAGER'];
    if (!in_array($row['AccountType'], $allowedWriteRoles)) {
        echo json_encode(['success' => false, 'error' => 'Permission denied to add products']);
        exit();
    }
    
    $productName = isset($_POST['productName']) ? trim($_POST['productName']) : null;
    $category = isset($_POST['category']) ? trim($_POST['category']) : null;
    $description = isset($_POST['description']) ? trim($_POST['description']) : null;
    $price = isset($_POST['price']) ? floatval($_POST['price']) : null;
    $quantity = isset($_POST['quantity']) ? intval($_POST['quantity']) : null;
    
    // Validate required fields
    if (!$productName || $price === null || $quantity === null) {
        echo json_encode(['success' => false, 'error' => 'Missing required fields: productName, price, quantity']);
        exit();
    }
    
    if ($price < 0 || $quantity < 0) {
        echo json_encode(['success' => false, 'error' => 'Price and quantity must be non-negative']);
        exit();
    }
    
    $insertSql = "INSERT INTO Products (ProductName, Category, Description, Price, Quantity, Status, AddedBy, ModifiedBy) 
                   VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?)";
    $insertParams = array($productName, $category, $description, $price, $quantity, $username, $username);
    
    if (sqlsrv_query($conn, $insertSql, $insertParams)) {
        echo json_encode(['success' => true, 'message' => 'Product added successfully']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to add product']);
    }
    
} elseif ($action === 'update_product') {
    // Update product - Check for write permissions
    $allowedWriteRoles = ['ADMIN', 'INVENTORY', 'MANAGER'];
    if (!in_array($row['AccountType'], $allowedWriteRoles)) {
        echo json_encode(['success' => false, 'error' => 'Permission denied to update products']);
        exit();
    }
    
    $productId = isset($_POST['productId']) ? intval($_POST['productId']) : null;
    $productName = isset($_POST['productName']) ? trim($_POST['productName']) : null;
    $category = isset($_POST['category']) ? trim($_POST['category']) : null;
    $description = isset($_POST['description']) ? trim($_POST['description']) : null;
    $price = isset($_POST['price']) ? floatval($_POST['price']) : null;
    $quantity = isset($_POST['quantity']) ? intval($_POST['quantity']) : null;
    
    // Validate required fields
    if (!$productId || !$productName || $price === null || $quantity === null) {
        echo json_encode(['success' => false, 'error' => 'Missing required fields']);
        exit();
    }
    
    if ($price < 0 || $quantity < 0) {
        echo json_encode(['success' => false, 'error' => 'Price and quantity must be non-negative']);
        exit();
    }
    
    $updateSql = "UPDATE Products SET ProductName = ?, Category = ?, Description = ?, Price = ?, Quantity = ?, ModifiedBy = ?, LastModified = GETDATE() WHERE ProductID = ?";
    $updateParams = array($productName, $category, $description, $price, $quantity, $username, $productId);
    
    if (sqlsrv_query($conn, $updateSql, $updateParams)) {
        echo json_encode(['success' => true, 'message' => 'Product updated successfully']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to update product']);
    }
    
} elseif ($action === 'delete_product') {
    // Delete product - Only ADMIN can delete
    if ($row['AccountType'] !== 'ADMIN') {
        echo json_encode(['success' => false, 'error' => 'Only ADMIN can delete products']);
        exit();
    }
    
    $productId = isset($_POST['productId']) ? intval($_POST['productId']) : null;
    
    if (!$productId) {
        echo json_encode(['success' => false, 'error' => 'Product ID is required']);
        exit();
    }
    
    $deleteSql = "DELETE FROM Products WHERE ProductID = ?";
    $deleteParams = array($productId);
    
    if (sqlsrv_query($conn, $deleteSql, $deleteParams)) {
        echo json_encode(['success' => true, 'message' => 'Product deleted successfully']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to delete product']);
    }
    
} elseif ($action === 'update_quantity') {
    // Update product quantity only - INVENTORY, MANAGER, ADMIN can do this
    $allowedQuantityRoles = ['ADMIN', 'INVENTORY', 'MANAGER'];
    if (!in_array($row['AccountType'], $allowedQuantityRoles)) {
        echo json_encode(['success' => false, 'error' => 'Permission denied to update inventory']);
        exit();
    }
    
    $productId = isset($_POST['productId']) ? intval($_POST['productId']) : null;
    $quantity = isset($_POST['quantity']) ? intval($_POST['quantity']) : null;
    
    if (!$productId || $quantity === null) {
        echo json_encode(['success' => false, 'error' => 'Product ID and quantity are required']);
        exit();
    }
    
    if ($quantity < 0) {
        echo json_encode(['success' => false, 'error' => 'Quantity must be non-negative']);
        exit();
    }
    
    $updateSql = "UPDATE Products SET Quantity = ?, ModifiedBy = ?, LastModified = GETDATE() WHERE ProductID = ?";
    $updateParams = array($quantity, $username, $productId);
    
    if (sqlsrv_query($conn, $updateSql, $updateParams)) {
        echo json_encode(['success' => true, 'message' => 'Quantity updated successfully']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to update quantity']);
    }
} else {
    echo json_encode(['success' => false, 'error' => 'Invalid action']);
}

sqlsrv_close($conn);
?>
