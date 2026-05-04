<?php
session_start();
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

// Ensure ActivityLogs table exists
$createTableSql = "
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ActivityLogs' AND xtype='U')
    CREATE TABLE ActivityLogs (
        LogID INT IDENTITY(1,1) PRIMARY KEY,
        Username NVARCHAR(100) NOT NULL,
        FullName NVARCHAR(200),
        Action NVARCHAR(50) NOT NULL,
        Details NVARCHAR(500),
        LoggedAt DATETIME DEFAULT GETDATE()
    )
";
sqlsrv_query($conn, $createTableSql);

$action = isset($_GET['action']) ? $_GET['action'] : null;
$username = isset($_SESSION['username']) ? $_SESSION['username'] : null;
$accountType = isset($_SESSION['accountType']) ? $_SESSION['accountType'] : null;

if ($action === 'get_logs') {
    if ($accountType !== 'ADMIN') {
        echo json_encode(['success' => false, 'error' => 'Unauthorized']);
        exit();
    }

    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $pageSize = 50;
    $offset = ($page - 1) * $pageSize;

    $filterAction = isset($_GET['filterAction']) ? trim($_GET['filterAction']) : '';
    $filterUser   = isset($_GET['filterUser'])   ? trim($_GET['filterUser'])   : '';
    $filterFrom   = isset($_GET['filterFrom'])   ? trim($_GET['filterFrom'])   : '';
    $filterTo     = isset($_GET['filterTo'])     ? trim($_GET['filterTo'])     : '';

    $where = "WHERE 1=1";
    $params = [];

    if ($filterAction !== '') {
        $where .= " AND Action = ?";
        $params[] = $filterAction;
    }
    if ($filterUser !== '') {
        $where .= " AND (Username LIKE ? OR FullName LIKE ?)";
        $params[] = '%' . $filterUser . '%';
        $params[] = '%' . $filterUser . '%';
    }
    if ($filterFrom !== '') {
        $where .= " AND LoggedAt >= ?";
        $params[] = $filterFrom;
    }
    if ($filterTo !== '') {
        $where .= " AND LoggedAt <= ?";
        $params[] = $filterTo;
    }

    $countSql = "SELECT COUNT(*) AS Total FROM ActivityLogs $where";
    $countStmt = sqlsrv_query($conn, $countSql, $params ?: null);
    $totalRows = 0;
    if ($countStmt && $countRow = sqlsrv_fetch_array($countStmt, SQLSRV_FETCH_ASSOC)) {
        $totalRows = $countRow['Total'];
    }

    $sql = "SELECT LogID, Username, FullName, Action, Details, LoggedAt
            FROM ActivityLogs
            $where
            ORDER BY LoggedAt DESC
            OFFSET ? ROWS FETCH NEXT ? ROWS ONLY";

    $params[] = $offset;
    $params[] = $pageSize;

    $result = sqlsrv_query($conn, $sql, $params);
    if ($result === false) {
        echo json_encode(['success' => false, 'error' => 'Failed to fetch logs']);
        exit();
    }

    $logs = [];
    while ($row = sqlsrv_fetch_array($result, SQLSRV_FETCH_ASSOC)) {
        if ($row['LoggedAt'] instanceof DateTime) {
            $row['LoggedAt'] = $row['LoggedAt']->format('Y-m-d H:i:s');
        }
        $logs[] = $row;
    }

    echo json_encode([
        'success' => true,
        'logs' => $logs,
        'total' => $totalRows,
        'page' => $page,
        'pageSize' => $pageSize
    ]);

} else {
    echo json_encode(['success' => false, 'error' => 'Invalid action']);
}

sqlsrv_close($conn);
?>
