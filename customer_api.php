<?php
session_start();

// Set JSON response header
header('Content-Type: application/json');

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

$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : null);
$username = isset($_SESSION['username']) ? $_SESSION['username'] : null;

// Allow guests to view products, but require authentication for other actions
if ($action !== 'get_available_products' && !$username) {
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit();
}

if ($action === 'get_available_products') {
    // Fetch only ACTIVE products with quantity > 0
    $sql = "SELECT ProductID, ProductName, Description, Category, Price, WholesalePrice, Quantity, Status 
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
    
    // Check if user is admin, inventory, or manager - these roles cannot place orders
    if (isset($_SESSION['accountType']) && in_array($_SESSION['accountType'], ['ADMIN', 'INVENTORY', 'MANAGER'])) {
        echo json_encode(['success' => false, 'error' => 'Only regular users can place orders!']);
        exit();
    }
    
    $productId = isset($_POST['productId']) ? intval($_POST['productId']) : null;
    $quantity = isset($_POST['quantity']) ? intval($_POST['quantity']) : null;
    $notes = isset($_POST['notes']) ? trim($_POST['notes']) : null;
    $paymentMethod = isset($_POST['paymentMethod']) ? trim($_POST['paymentMethod']) : 'Cash On Delivery';
    
    // Validate payment method
    $validPaymentMethods = ['Cash On Delivery', 'GCASH', 'Card'];
    if (!in_array($paymentMethod, $validPaymentMethods)) {
        $paymentMethod = 'Cash On Delivery';
    }
    
    // Validate inputs
    if (!$productId || !$quantity || $quantity <= 0) {
        echo json_encode(['success' => false, 'error' => 'Invalid product or quantity']);
        exit();
    }
    
    // Get product details including wholesale price
    $productSql = "SELECT ProductName, Price, WholesalePrice, Quantity FROM Products WHERE ProductID = ?";
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
    
    // Determine unit price: use wholesale price if quantity is 10+ units and wholesale price exists
    $unitPrice = floatval($product['Price']);
    $priceType = 'REGULAR';
    
    if ($quantity >= 10 && !is_null($product['WholesalePrice']) && floatval($product['WholesalePrice']) > 0) {
        $unitPrice = floatval($product['WholesalePrice']);
        $priceType = 'WHOLESALE';
    }
    
    // Generate order number
    $orderNumber = 'ORD-' . date('Ymd') . '-' . uniqid();
    
    // Calculate total price
    $totalPrice = $unitPrice * $quantity;
    
    // Insert order
    $insertSql = "INSERT INTO Orders (OrderNumber, Username, ProductID, ProductName, Quantity, UnitPrice, TotalPrice, PaymentMethod, Notes)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $insertParams = array($orderNumber, $username, $productId, $product['ProductName'], $quantity, $unitPrice, $totalPrice, $paymentMethod, $notes);
    
    if (sqlsrv_query($conn, $insertSql, $insertParams)) {
        // Reduce product quantity
        $updateSql = "UPDATE Products SET Quantity = Quantity - ? WHERE ProductID = ?";
        $updateParams = array($quantity, $productId);
        sqlsrv_query($conn, $updateSql, $updateParams);
        
        echo json_encode([
            'success' => true,
            'message' => 'Order placed successfully',
            'orderNumber' => $orderNumber,
            'totalPrice' => number_format($totalPrice, 2),
            'priceType' => $priceType,
            'unitPrice' => number_format($unitPrice, 2),
            'quantity' => $quantity
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to place order']);
    }
    
} elseif ($action === 'get_order_history') {
    // Fetch user's orders
    $sql = "SELECT OrderID, OrderNumber, ProductName, Quantity, UnitPrice, TotalPrice, OrderDate, Status, PaymentMethod
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
    $sql = "SELECT OrderID, OrderNumber, Username, ProductName, Quantity, UnitPrice, TotalPrice, OrderDate, Status, PaymentMethod,
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
    
} elseif ($action === 'confirm_delivery') {
    // Confirm delivery of an order
    $orderId = isset($_POST['orderId']) ? intval($_POST['orderId']) : null;
    
    if (!$orderId) {
        echo json_encode(['success' => false, 'error' => 'Invalid order ID']);
        exit();
    }
    
    // Get order details
    $orderSql = "SELECT Orders.OrderID, Orders.Status, Orders.Username FROM Orders WHERE OrderID = ?";
    $orderParams = array($orderId);
    $orderResult = sqlsrv_query($conn, $orderSql, $orderParams);
    
    if (!$orderResult || !($order = sqlsrv_fetch_array($orderResult, SQLSRV_FETCH_ASSOC))) {
        echo json_encode(['success' => false, 'error' => 'Order not found']);
        exit();
    }
    
    // Check if only SHIPPED orders can be marked as delivered
    if ($order['Status'] !== 'SHIPPED') {
        echo json_encode(['success' => false, 'error' => 'Only SHIPPED orders can be marked as delivered']);
        exit();
    }
    
    // Check if user is the order owner
    if ($username !== $order['Username']) {
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        exit();
    }
    
    // Update order status to DELIVERED
    $updateSql = "UPDATE Orders SET Status = 'DELIVERED' WHERE OrderID = ?";
    $updateParams = array($orderId);
    
    if (sqlsrv_query($conn, $updateSql, $updateParams)) {
        echo json_encode(['success' => true, 'message' => 'Order marked as delivered successfully']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to confirm delivery']);
    }

} elseif ($action === 'update_order_status') {
    // Update order status (Manager/Admin only)
    $orderId = isset($_POST['orderId']) ? intval($_POST['orderId']) : null;
    $newStatus = isset($_POST['status']) ? trim($_POST['status']) : null;
    
    if (!$orderId || !$newStatus) {
        echo json_encode(['success' => false, 'error' => 'Invalid order ID or status']);
        exit();
    }
    
    // Check if user has permission (ADMIN, INVENTORY, MANAGER only)
    if (!isset($_SESSION['accountType']) || !in_array($_SESSION['accountType'], ['ADMIN', 'INVENTORY', 'MANAGER'])) {
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        exit();
    }
    
    // Validate status is one of allowed values
    $allowedStatuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!in_array($newStatus, $allowedStatuses)) {
        echo json_encode(['success' => false, 'error' => 'Invalid status']);
        exit();
    }
    
    // Get order details
    $orderSql = "SELECT Orders.OrderID, Orders.Status FROM Orders WHERE OrderID = ?";
    $orderParams = array($orderId);
    $orderResult = sqlsrv_query($conn, $orderSql, $orderParams);
    
    if (!$orderResult || !($order = sqlsrv_fetch_array($orderResult, SQLSRV_FETCH_ASSOC))) {
        echo json_encode(['success' => false, 'error' => 'Order not found']);
        exit();
    }
    
    // Allow managers to update PENDING orders to SHIPPED or DELIVERED
    if ($order['Status'] !== 'PENDING') {
        echo json_encode(['success' => false, 'error' => 'Only PENDING orders can be updated by managers']);
        exit();
    }
    
    // Update order status
    $updateSql = "UPDATE Orders SET Status = ? WHERE OrderID = ?";
    $updateParams = array($newStatus, $orderId);
    
    if (sqlsrv_query($conn, $updateSql, $updateParams)) {
        $statusMessage = ($newStatus === 'SHIPPED') ? 'marked as shipped' : 'marked as delivered';
        echo json_encode(['success' => true, 'message' => 'Order ' . $statusMessage . ' successfully']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to update order status']);
    }

} elseif ($action === 'get_today_sales') {
    // Fetch today's orders only (ADMIN, INVENTORY, MANAGER only)
    if (!isset($_SESSION['accountType']) || !in_array($_SESSION['accountType'], ['ADMIN', 'INVENTORY', 'MANAGER'])) {
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        exit();
    }
    
    // Fetch today's orders with user information - use database server's current date
    $sql = "SELECT OrderID, OrderNumber, Username, ProductName, Quantity, UnitPrice, TotalPrice, OrderDate, Status, PaymentMethod,
                   (SELECT CONCAT(FirstName, ' ', LastName) FROM Users WHERE Username = Orders.Username) AS UserFullName
            FROM Orders
            WHERE CAST(OrderDate AS DATE) = CAST(GETDATE() AS DATE)
            ORDER BY OrderDate DESC";
    
    $result = sqlsrv_query($conn, $sql);
    
    if ($result === false) {
        echo json_encode(['success' => false, 'error' => 'Failed to fetch today\'s sales']);
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
    
} else {
    echo json_encode(['success' => false, 'error' => 'Invalid action']);
}

sqlsrv_close($conn);
?>
