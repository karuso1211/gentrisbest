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
    $sql = "SELECT ProductID, ProductName, Description, Category, Price, WholesalePrice, Quantity, Status, ImagePath
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
    
    // Check if user is admin, inventory, manager, or front desk - these roles cannot place orders
    if (isset($_SESSION['accountType']) && in_array($_SESSION['accountType'], ['ADMIN', 'INVENTORY', 'MANAGER', 'FRONT DESK'])) {
        echo json_encode(['success' => false, 'error' => 'Only regular users can place orders!']);
        exit();
    }
    
    $productId = isset($_POST['productId']) ? intval($_POST['productId']) : null;
    $quantity = isset($_POST['quantity']) ? intval($_POST['quantity']) : null;
    $notes = isset($_POST['notes']) ? trim($_POST['notes']) : null;
    $paymentMethod = isset($_POST['paymentMethod']) ? trim($_POST['paymentMethod']) : 'Cash On Delivery';
    $deliveryAddress = isset($_POST['deliveryAddress']) ? trim($_POST['deliveryAddress']) : null;
    $deliveryFee = isset($_POST['deliveryFee']) ? floatval($_POST['deliveryFee']) : 0;
    
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
    
    // Use client-supplied order number (cart checkout shares one number) or generate new one
    $clientOrderNumber = isset($_POST['orderNumber']) ? trim($_POST['orderNumber']) : null;
    if ($clientOrderNumber && preg_match('/^ORD-\d{8}-.+$/', $clientOrderNumber) && strlen($clientOrderNumber) <= 60) {
        $orderNumber = $clientOrderNumber;
    } else {
        $orderNumber = 'ORD-' . date('Ymd') . '-' . uniqid();
    }
    
    // Calculate total price (product subtotal + delivery fee)
    $subtotal = $unitPrice * $quantity;
    $totalPrice = $subtotal + $deliveryFee;

    // Insert order
    $insertSql = "INSERT INTO Orders (OrderNumber, Username, ProductID, ProductName, Quantity, UnitPrice, TotalPrice, PaymentMethod, Notes, DeliveryAddress, DeliveryFee)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    $insertParams = array($orderNumber, $username, $productId, $product['ProductName'], $quantity, $unitPrice, $totalPrice, $paymentMethod, $notes, $deliveryAddress, $deliveryFee);
    
    if (sqlsrv_query($conn, $insertSql, $insertParams)) {
        // Reduce product quantity
        $updateSql = "UPDATE Products SET Quantity = Quantity - ? WHERE ProductID = ?";
        $updateParams = array($quantity, $productId);
        sqlsrv_query($conn, $updateSql, $updateParams);

        // Log order placement — deduplicate so multi-item cart orders only log once per OrderNumber
        $logPlaceDetails = "Order $orderNumber placed ({$product['ProductName']}, qty: $quantity, via $paymentMethod)";
        $dupCheckSql = "SELECT COUNT(*) AS Cnt FROM ActivityLogs
                        WHERE Username = ? AND Action = 'ORDER_PLACED'
                        AND Details LIKE ? AND LoggedAt >= DATEADD(SECOND, -10, GETDATE())";
        $dupStmt = sqlsrv_query($conn, $dupCheckSql, [$username, 'Order ' . $orderNumber . '%']);
        $isDuplicate = false;
        if ($dupStmt && $dupRow = sqlsrv_fetch_array($dupStmt, SQLSRV_FETCH_ASSOC)) {
            $isDuplicate = $dupRow['Cnt'] > 0;
        }
        if (!$isDuplicate) {
            $nameSql = "SELECT CONCAT(FirstName, ' ', LastName) AS FullName FROM Users WHERE Username = ?";
            $nameStmt = sqlsrv_query($conn, $nameSql, [$username]);
            $fullName = $username;
            if ($nameStmt && $nameRow = sqlsrv_fetch_array($nameStmt, SQLSRV_FETCH_ASSOC)) {
                $fullName = $nameRow['FullName'];
            }
            $logSql = "INSERT INTO ActivityLogs (Username, FullName, Action, Details) VALUES (?, ?, 'ORDER_PLACED', ?)";
            sqlsrv_query($conn, $logSql, [$username, $fullName, $logPlaceDetails]);
        }

        // Save GCash screenshot if provided
        if ($paymentMethod === 'GCASH' && isset($_FILES['gcashScreenshot']) && $_FILES['gcashScreenshot']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = 'uploads/gcash_proofs/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0755, true);
            }
            $ext = strtolower(pathinfo($_FILES['gcashScreenshot']['name'], PATHINFO_EXTENSION));
            $allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            if (in_array($ext, $allowedExts)) {
                move_uploaded_file($_FILES['gcashScreenshot']['tmp_name'], $uploadDir . $orderNumber . '.' . $ext);
            }
        }

        echo json_encode([
            'success' => true,
            'message' => 'Order placed successfully',
            'orderNumber' => $orderNumber,
            'subtotal' => number_format($subtotal, 2),
            'deliveryFee' => number_format($deliveryFee, 2),
            'totalPrice' => number_format($totalPrice, 2),
            'priceType' => $priceType,
            'unitPrice' => number_format($unitPrice, 2),
            'quantity' => $quantity,
            'deliveryAddress' => $deliveryAddress
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to place order']);
    }
    
} elseif ($action === 'pos_order') {
    // POS Order for walk-in customers (front desk only)
    // Check if user is FRONT DESK
    if (!isset($_SESSION['accountType']) || $_SESSION['accountType'] !== 'FRONT DESK') {
        echo json_encode(['success' => false, 'error' => 'Only FRONT DESK users can process POS orders']);
        exit();
    }
    
    $productId = isset($_POST['productId']) ? intval($_POST['productId']) : null;
    $quantity = isset($_POST['quantity']) ? intval($_POST['quantity']) : null;
    $paymentMethod = isset($_POST['paymentMethod']) ? trim($_POST['paymentMethod']) : 'Cash';
    $transactionId = isset($_POST['transactionId']) ? trim($_POST['transactionId']) : null;
    
    // Validate payment method for POS
    $validPOSPaymentMethods = ['Cash', 'GCASH', 'Card'];
    if (!in_array($paymentMethod, $validPOSPaymentMethods)) {
        $paymentMethod = 'Cash';
    }
    
    // Validate inputs
    if (!$productId || !$quantity || $quantity <= 0) {
        echo json_encode(['success' => false, 'error' => 'Invalid product or quantity']);
        exit();
    }
    
    // Get product details
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
    
    // Determine unit price
    $unitPrice = floatval($product['Price']);
    $priceType = 'REGULAR';
    
    if ($quantity >= 10 && !is_null($product['WholesalePrice']) && floatval($product['WholesalePrice']) > 0) {
        $unitPrice = floatval($product['WholesalePrice']);
        $priceType = 'WHOLESALE';
    }
    
    // Use provided transaction ID or generate new one
    if (!$transactionId) {
        $transactionId = 'POS-' . date('Ymd') . '-' . uniqid();
    }
    
    // Calculate total price
    $totalPrice = $unitPrice * $quantity;
    
    // Insert POS transaction (using Orders table with special username)
    $insertSql = "INSERT INTO Orders (OrderNumber, Username, ProductID, ProductName, Quantity, UnitPrice, TotalPrice, PaymentMethod, Notes, Status)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'DELIVERED')";
    $insertParams = array($transactionId, 'WALKIN_CUSTOMER', $productId, $product['ProductName'], $quantity, $unitPrice, $totalPrice, $paymentMethod, 'POS Transaction by ' . $username);
    
    $insertResult = sqlsrv_query($conn, $insertSql, $insertParams);
    
    if ($insertResult) {
        // Reduce product quantity
        $updateSql = "UPDATE Products SET Quantity = Quantity - ? WHERE ProductID = ?";
        $updateParams = array($quantity, $productId);
        $updateResult = sqlsrv_query($conn, $updateSql, $updateParams);
        
        if (!$updateResult) {
            // Fallback error message
            $errors = sqlsrv_errors();
            echo json_encode(['success' => false, 'error' => 'Failed to update inventory: ' . ($errors ? $errors[0]['message'] : 'Unknown error')]);
            exit();
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'POS transaction completed',
            'transactionId' => $transactionId,
            'totalPrice' => number_format($totalPrice, 2),
            'priceType' => $priceType,
            'unitPrice' => number_format($unitPrice, 2),
            'quantity' => $quantity
        ]);
    } else {
        // Get detailed error information
        $errors = sqlsrv_errors();
        $errorMsg = 'Failed to process POS transaction';
        if ($errors) {
            $errorMsg = 'Database error: ' . $errors[0]['message'];
            // Check if it's a foreign key constraint error
            if (strpos($errors[0]['message'], 'WALKIN_CUSTOMER') !== false || strpos($errors[0]['message'], 'FOREIGN KEY') !== false) {
                $errorMsg = 'POS system not initialized. Please run setup.php to create the WALKIN_CUSTOMER account.';
            }
        }
        echo json_encode(['success' => false, 'error' => $errorMsg]);
    }
    
} elseif ($action === 'get_order_history') {
    // Fetch user's orders
    $sql = "SELECT OrderID, OrderNumber, ProductName, Quantity, UnitPrice, TotalPrice, DeliveryFee, DeliveryAddress, OrderDate, ShippedDate, DeliveryDate, Status, PaymentMethod
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
        if ($row['OrderDate'] instanceof DateTime) {
            $row['OrderDate'] = $row['OrderDate']->format('Y-m-d H:i:s');
        }
        if (isset($row['ShippedDate']) && $row['ShippedDate'] instanceof DateTime) {
            $row['ShippedDate'] = $row['ShippedDate']->format('Y-m-d H:i:s');
        }
        if (isset($row['DeliveryDate']) && $row['DeliveryDate'] instanceof DateTime) {
            $row['DeliveryDate'] = $row['DeliveryDate']->format('Y-m-d H:i:s');
        }
        $orders[] = $row;
    }

    echo json_encode(['success' => true, 'orders' => $orders]);

} elseif ($action === 'get_all_orders') {
    // Check if user has permission (ADMIN, INVENTORY, MANAGER, FRONT DESK)
    if (!isset($_SESSION['accountType']) || !in_array($_SESSION['accountType'], ['ADMIN', 'INVENTORY', 'MANAGER', 'FRONT DESK'])) {
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        exit();
    }
    
    // Fetch all orders with user information
    $sql = "SELECT OrderID, OrderNumber, Username, ProductName, Quantity, UnitPrice, TotalPrice, DeliveryFee, DeliveryAddress, OrderDate, ShippedDate, DeliveryDate, Status, PaymentMethod,
                   (SELECT CONCAT(FirstName, ' ', LastName) FROM Users WHERE Username = Orders.Username) AS UserFullName,
                   (SELECT ContactNumber FROM Users WHERE Username = Orders.Username) AS UserContactNumber
            FROM Orders
            ORDER BY OrderDate DESC";
    
    $result = sqlsrv_query($conn, $sql);
    
    if ($result === false) {
        echo json_encode(['success' => false, 'error' => 'Failed to fetch orders']);
        exit();
    }
    
    $orders = [];
    while ($row = sqlsrv_fetch_array($result, SQLSRV_FETCH_ASSOC)) {
        if ($row['OrderDate'] instanceof DateTime) {
            $row['OrderDate'] = $row['OrderDate']->format('Y-m-d H:i:s');
        }
        if (isset($row['ShippedDate']) && $row['ShippedDate'] instanceof DateTime) {
            $row['ShippedDate'] = $row['ShippedDate']->format('Y-m-d H:i:s');
        }
        if (isset($row['DeliveryDate']) && $row['DeliveryDate'] instanceof DateTime) {
            $row['DeliveryDate'] = $row['DeliveryDate']->format('Y-m-d H:i:s');
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
    if ($username !== $order['Username'] && !in_array($userAccountType, ['ADMIN', 'INVENTORY', 'MANAGER', 'FRONT DESK'])) {
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

        // Log cancellation
        $nameSql = "SELECT CONCAT(FirstName, ' ', LastName) AS FullName FROM Users WHERE Username = ?";
        $nameStmt = sqlsrv_query($conn, $nameSql, [$username]);
        $fullName = $username;
        if ($nameStmt && $nameRow = sqlsrv_fetch_array($nameStmt, SQLSRV_FETCH_ASSOC)) {
            $fullName = $nameRow['FullName'];
        }
        $orderNumSql = "SELECT OrderNumber FROM Orders WHERE OrderID = ?";
        $orderNumStmt = sqlsrv_query($conn, $orderNumSql, [$orderId]);
        $orderNumber = '#' . $orderId;
        if ($orderNumStmt && $orderNumRow = sqlsrv_fetch_array($orderNumStmt, SQLSRV_FETCH_ASSOC)) {
            $orderNumber = $orderNumRow['OrderNumber'];
        }
        $logSql = "INSERT INTO ActivityLogs (Username, FullName, Action, Details) VALUES (?, ?, 'ORDER_CANCELLED', ?)";
        sqlsrv_query($conn, $logSql, [$username, $fullName, "Order $orderNumber cancelled"]);

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
    
    // Update order status to DELIVERED and record delivery timestamp
    $updateSql = "UPDATE Orders SET Status = 'DELIVERED', DeliveryDate = GETDATE() WHERE OrderID = ?";
    $updateParams = array($orderId);

    if (sqlsrv_query($conn, $updateSql, $updateParams)) {
        // Log delivery confirmation
        $nameSql = "SELECT CONCAT(FirstName, ' ', LastName) AS FullName FROM Users WHERE Username = ?";
        $nameStmt = sqlsrv_query($conn, $nameSql, [$username]);
        $fullName = $username;
        if ($nameStmt && $nameRow = sqlsrv_fetch_array($nameStmt, SQLSRV_FETCH_ASSOC)) {
            $fullName = $nameRow['FullName'];
        }
        $orderNumSql = "SELECT OrderNumber FROM Orders WHERE OrderID = ?";
        $orderNumStmt = sqlsrv_query($conn, $orderNumSql, [$orderId]);
        $orderNumber = '#' . $orderId;
        if ($orderNumStmt && $orderNumRow = sqlsrv_fetch_array($orderNumStmt, SQLSRV_FETCH_ASSOC)) {
            $orderNumber = $orderNumRow['OrderNumber'];
        }
        $logSql = "INSERT INTO ActivityLogs (Username, FullName, Action, Details) VALUES (?, ?, 'ORDER_DELIVERED', ?)";
        sqlsrv_query($conn, $logSql, [$username, $fullName, "Order $orderNumber confirmed as delivered by customer"]);

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
    
    // Check if user has permission (ADMIN, INVENTORY, MANAGER only - NOT FRONT DESK)
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
    
    // Admins and managers can override any order status; others restricted to PENDING only
    $isAdminOrManager = in_array($_SESSION['accountType'], ['ADMIN', 'MANAGER']);
    if (!$isAdminOrManager && $order['Status'] !== 'PENDING') {
        echo json_encode(['success' => false, 'error' => 'Only PENDING orders can be updated']);
        exit();
    }

    // Order must be SHIPPED before it can be marked as DELIVERED
    if ($newStatus === 'DELIVERED' && $order['Status'] !== 'SHIPPED') {
        echo json_encode(['success' => false, 'error' => 'Order must be shipped before it can be marked as delivered']);
        exit();
    }
    
    // Update order status and record timestamp for SHIPPED/DELIVERED transitions
    if ($newStatus === 'SHIPPED') {
        $updateSql = "UPDATE Orders SET Status = ?, ShippedDate = GETDATE() WHERE OrderID = ?";
    } elseif ($newStatus === 'DELIVERED') {
        $updateSql = "UPDATE Orders SET Status = ?, DeliveryDate = GETDATE() WHERE OrderID = ?";
    } else {
        $updateSql = "UPDATE Orders SET Status = ? WHERE OrderID = ?";
    }
    $updateParams = array($newStatus, $orderId);

    if (sqlsrv_query($conn, $updateSql, $updateParams)) {
        // Log order status change — deduplicate by OrderNumber so cart orders (multiple IDs, one number) only log once
        $orderNumSql = "SELECT OrderNumber FROM Orders WHERE OrderID = ?";
        $orderNumStmt = sqlsrv_query($conn, $orderNumSql, [$orderId]);
        $orderNumber = '#' . $orderId;
        if ($orderNumStmt && $orderNumRow = sqlsrv_fetch_array($orderNumStmt, SQLSRV_FETCH_ASSOC)) {
            $orderNumber = $orderNumRow['OrderNumber'];
        }
        $logDetails = "Order $orderNumber status changed from {$order['Status']} to $newStatus";
        // Only insert if no identical log exists in the last 10 seconds (prevents duplicate logs for multi-item orders)
        $dupCheckSql = "SELECT COUNT(*) AS Cnt FROM ActivityLogs
                        WHERE Username = ? AND Action = 'ORDER_STATUS_UPDATE' AND Details = ?
                        AND LoggedAt >= DATEADD(SECOND, -10, GETDATE())";
        $dupStmt = sqlsrv_query($conn, $dupCheckSql, [$username, $logDetails]);
        $isDuplicate = false;
        if ($dupStmt && $dupRow = sqlsrv_fetch_array($dupStmt, SQLSRV_FETCH_ASSOC)) {
            $isDuplicate = $dupRow['Cnt'] > 0;
        }
        if (!$isDuplicate) {
            $nameSql = "SELECT CONCAT(FirstName, ' ', LastName) AS FullName FROM Users WHERE Username = ?";
            $nameStmt = sqlsrv_query($conn, $nameSql, [$username]);
            $fullName = $username;
            if ($nameStmt && $nameRow = sqlsrv_fetch_array($nameStmt, SQLSRV_FETCH_ASSOC)) {
                $fullName = $nameRow['FullName'];
            }
            $logSql = "INSERT INTO ActivityLogs (Username, FullName, Action, Details) VALUES (?, ?, 'ORDER_STATUS_UPDATE', ?)";
            sqlsrv_query($conn, $logSql, [$username, $fullName, $logDetails]);
        }

        $statusMessage = ($newStatus === 'SHIPPED') ? 'marked as shipped' : 'marked as delivered';
        echo json_encode(['success' => true, 'message' => 'Order ' . $statusMessage . ' successfully']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Failed to update order status']);
    }

} elseif ($action === 'get_today_sales') {
    // Fetch today's orders only (ADMIN, INVENTORY, MANAGER, FRONT DESK)
    if (!isset($_SESSION['accountType']) || !in_array($_SESSION['accountType'], ['ADMIN', 'INVENTORY', 'MANAGER', 'FRONT DESK'])) {
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
