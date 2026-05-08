<?php
session_start();
header('Content-Type: application/json');

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
$stmt = sqlsrv_query($conn, "SELECT AccountType FROM Users WHERE Username = ?", [$username]);
$row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC);

if (!$row || $row['AccountType'] !== 'ADMIN') {
    echo json_encode(['success' => false, 'error' => 'Admin access required']);
    exit();
}

$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : null);

if ($action === 'get_tables') {
    $result = sqlsrv_query($conn, "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME");
    $tables = [];
    while ($r = sqlsrv_fetch_array($result, SQLSRV_FETCH_ASSOC)) {
        $tables[] = $r['TABLE_NAME'];
    }
    echo json_encode(['success' => true, 'tables' => $tables]);

} elseif ($action === 'get_table_data') {
    $table    = isset($_GET['table'])  ? trim($_GET['table'])  : '';
    $page     = isset($_GET['page'])   ? max(1, intval($_GET['page'])) : 1;
    $pageSize = 50;
    $search   = isset($_GET['search']) ? trim($_GET['search']) : '';

    if ($table === '') {
        echo json_encode(['success' => false, 'error' => 'Table name required']);
        exit();
    }

    // Whitelist: validate table name against actual DB tables (prevents SQL injection)
    $check = sqlsrv_query($conn,
        "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME = ?",
        [$table]
    );
    if (!sqlsrv_fetch_array($check, SQLSRV_FETCH_ASSOC)) {
        echo json_encode(['success' => false, 'error' => 'Invalid table name']);
        exit();
    }

    // Get columns and their types
    $colResult = sqlsrv_query($conn,
        "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ? ORDER BY ORDINAL_POSITION",
        [$table]
    );
    $columns = [];
    while ($c = sqlsrv_fetch_array($colResult, SQLSRV_FETCH_ASSOC)) {
        $columns[] = $c;
    }
    $colNames = array_column($columns, 'COLUMN_NAME');

    // Only search across castable (non-binary) column types
    $searchableTypes = ['varchar','nvarchar','char','nchar','text','ntext',
                        'int','bigint','smallint','tinyint','decimal','numeric',
                        'float','real','money','smallmoney','datetime','date','datetime2','bit'];
    $searchable = array_filter($columns, function($c) use ($searchableTypes) {
        return in_array(strtolower($c['DATA_TYPE']), $searchableTypes);
    });
    $searchableNames = array_column(array_values($searchable), 'COLUMN_NAME');

    // Build WHERE clause using parameterised LIKE on searchable columns
    $whereClause  = '';
    $searchParams = [];
    if ($search !== '' && !empty($searchableNames)) {
        $conditions  = array_map(function($col) { return "TRY_CAST([$col] AS NVARCHAR(MAX)) LIKE ?"; }, $searchableNames);
        $whereClause = 'WHERE ' . implode(' OR ', $conditions);
        $searchParams = array_fill(0, count($searchableNames), "%$search%");
    }

    // Total row count
    $countSql    = "SELECT COUNT(*) AS total FROM [$table] $whereClause";
    $countResult = sqlsrv_query($conn, $countSql, $searchParams ?: null);
    $countRow    = sqlsrv_fetch_array($countResult, SQLSRV_FETCH_ASSOC);
    $total       = (int)$countRow['total'];

    // Paginated rows — ORDER BY first column for consistent paging
    $firstCol   = !empty($colNames) ? "[{$colNames[0]}]" : "(SELECT NULL)";
    $offset     = ($page - 1) * $pageSize;
    $dataSql    = "SELECT * FROM [$table] $whereClause ORDER BY $firstCol OFFSET ? ROWS FETCH NEXT ? ROWS ONLY";
    $dataParams = array_merge($searchParams, [$offset, $pageSize]);
    $dataResult = sqlsrv_query($conn, $dataSql, $dataParams);

    $rows = [];
    while ($r = sqlsrv_fetch_array($dataResult, SQLSRV_FETCH_ASSOC)) {
        $cleaned = [];
        foreach ($r as $k => $v) {
            if ($v instanceof DateTime) {
                $cleaned[$k] = $v->format('Y-m-d H:i:s');
            } elseif (is_resource($v)) {
                $cleaned[$k] = '[binary]';
            } else {
                $cleaned[$k] = $v;
            }
        }
        $rows[] = $cleaned;
    }

    echo json_encode([
        'success'    => true,
        'table'      => $table,
        'columns'    => $colNames,
        'rows'       => $rows,
        'total'      => $total,
        'page'       => $page,
        'pageSize'   => $pageSize,
        'totalPages' => $total > 0 ? (int)ceil($total / $pageSize) : 1
    ]);

} else {
    echo json_encode(['success' => false, 'error' => 'Invalid action']);
}

sqlsrv_close($conn);
?>
