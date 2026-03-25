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

$username = $_SESSION['username'];
$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : null);

if ($action === 'get_available_products') {
    // Fetch only ACTIVE products with quantity > 0
    $sql = "SELECT ProductID, ProductName, Description, Category, Price, Quantity, Status 
            FROM Products 
            WHERE Status = 'ACTIVE' 
            ORDER BY ProductName";
    
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
    
} elseif ($action === 'place_order') {
    // Place an order
    $productId = isset($_POST['productId']) ? intval($_POST['productId']) : null;
    $quantity = isset($_POST['quantity']) ? intval($_POST['quantity']) : null;
    $notes = isset($_POST['notes']) ? trim($_POST['notes']) : null;
    
    // Validate inputs
    if (!$productId || !$quantity || $quantity <= 0) {
        echo json_encode(['success' => false, 'error' => 'Invalid product or quantity']);
        exit();
    }
    
    // Get product details
    $productSql = "SELECT ProductName, Price, Quantity FROM Products WHERE ProductID = ?";
    $productParams = array($productId);
    $productStmt = sqlsrv_query($conn, $productSql, $productParams);
    
    if (!$productStmt || !($product = sqlsrv_fetch_array($productStmt, SQLSRV_FETCH_ASSOC))) {
        echo json_encode(['success' => false, 'error' => 'Product not found']);
        exit();
    }
    
    // Check if quantity is available
    if ($product['Quantity'] < $quantity) {
        echo json_encode(['success' => false, 'error' => 'Insufficient stock. Available: ' . $product['Quantity']]);
        exit();
    }
    
    // Generate order number
    $orderNumber = 'ORD-' . date('Ymd') . '-' . uniqid();
    
    // Calculate total price
    $unitPrice = floatval($product['Price']);
    $totalPrice = $unitPrice * $quantity;
    
    // Insert order
    $insertSql = "INSERT INTO Orders (OrderNumber, Username, ProductID, ProductName, Quantity, UnitPrice, TotalPrice, Notes)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    $insertParams = array($orderNumber, $username, $productId, $product['ProductName'], $quantity, $unitPrice, $totalPrice, $notes);
    
    if (sqlsrv_query($conn, $insertSql, $insertParams)) {
        // Reduce product quantity
        $updateSql = "UPDATE Products SET Quantity = Quantity - ? WHERE ProductID = ?";
        $updateParams = array($quantity, $productId);
        sqlsrv_query($conn, $updateSql, $updateParams);
        
        echo json_encode([
            'success' => true,
            'message' => 'Order placed successfully',
            'orderNumber' => $orderNumber,
            'totalPrice' => number_format($totalPrice, 2)
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to place order']);
    }
    
} elseif ($action === 'get_order_history') {
    // Fetch user's orders
    $sql = "SELECT OrderID, OrderNumber, ProductName, Quantity, UnitPrice, TotalPrice, OrderDate, Status
            FROM Orders
            WHERE Username = ?
            ORDER BY OrderDate DESC";
    
    $params = array($username);
    $result = sqlsrv_query($conn, $sql, $params);
    
    if ($result === false) {
        echo json_encode(['success' => false, 'error' => 'Failed to fetch order history']);
        exit();
    }
    
    $orders = [];
    while ($row = sqlsrv_fetch_array($result, SQLSRV_FETCH_ASSOC)) {
        // Format OrderDate to ISO 8601 string for JavaScript
        if ($row['OrderDate'] instanceof DateTime) {
            $row['OrderDate'] = $row['OrderDate']->format('Y-m-d H:i:s');
        }
        $orders[] = $row;
    }
    
    echo json_encode(['success' => true, 'orders' => $orders]);
    
} elseif ($action === 'get_all_orders') {
    // Check if user has permission (ADMIN, INVENTORY, MANAGER only)
    if (!isset($_SESSION['accountType']) || !in_array($_SESSION['accountType'], ['ADMIN', 'INVENTORY', 'MANAGER'])) {
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        exit();
    }
    
    // Fetch all orders with user information
    $sql = "SELECT OrderID, OrderNumber, Username, ProductName, Quantity, UnitPrice, TotalPrice, OrderDate, Status, 
                   (SELECT CONCAT(FirstName, ' ', LastName) FROM Users WHERE Username = Orders.Username) AS UserFullName
            FROM Orders
            ORDER BY OrderDate DESC";
    
    $result = sqlsrv_query($conn, $sql);
    
    if ($result === false) {
        echo json_encode(['success' => false, 'error' => 'Failed to fetch orders']);
        exit();
    }
    
    $orders = [];
    while ($row = sqlsrv_fetch_array($result, SQLSRV_FETCH_ASSOC)) {
        // Format OrderDate to ISO 8601 string for JavaScript
        if ($row['OrderDate'] instanceof DateTime) {
            $row['OrderDate'] = $row['OrderDate']->format('Y-m-d H:i:s');
        }
        $orders[] = $row;
    }
    
    echo json_encode(['success' => true, 'orders' => $orders]);
    
} elseif ($action === 'cancel_order') {
    // Cancel an order
    $orderId = isset($_POST['orderId']) ? intval($_POST['orderId']) : null;
    
    if (!$orderId) {
        echo json_encode(['success' => false, 'error' => 'Invalid order ID']);
        exit();
    }
    
    // Get order details
    $orderSql = "SELECT Orders.OrderID, Orders.ProductID, Orders.Quantity, Orders.Status, Orders.Username FROM Orders WHERE OrderID = ?";
    $orderParams = array($orderId);
    $orderResult = sqlsrv_query($conn, $orderSql, $orderParams);
    
    if (!$orderResult || !($order = sqlsrv_fetch_array($orderResult, SQLSRV_FETCH_ASSOC))) {
        echo json_encode(['success' => false, 'error' => 'Order not found']);
        exit();
    }
    
    // Check if only PENDING orders can be cancelled
    if ($order['Status'] !== 'PENDING') {
        echo json_encode(['success' => false, 'error' => 'Only PENDING orders can be cancelled']);
        exit();
    }
    
    // Check if user is the order owner or has admin rights
    $userAccountType = isset($_SESSION['accountType']) ? $_SESSION['accountType'] : 'USER';
    if ($username !== $order['Username'] && !in_array($userAccountType, ['ADMIN', 'INVENTORY', 'MANAGER'])) {
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        exit();
    }
    
    // Update order status to CANCELLED
    $updateSql = "UPDATE Orders SET Status = 'CANCELLED' WHERE OrderID = ?";
    $updateParams = array($orderId);
    
    if (sqlsrv_query($conn, $updateSql, $updateParams)) {
        // Restore product quantity
        $restoreSql = "UPDATE Products SET Quantity = Quantity + ? WHERE ProductID = ?";
        $restoreParams = array($order['Quantity'], $order['ProductID']);
        sqlsrv_query($conn, $restoreSql, $restoreParams);
        
        echo json_encode(['success' => true, 'message' => 'Order cancelled successfully']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to cancel order']);
    }
    
} else {
    echo json_encode(['success' => false, 'error' => 'Invalid action']);
}

sqlsrv_close($conn);
?>
