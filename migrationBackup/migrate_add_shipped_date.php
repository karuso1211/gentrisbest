<?php
// Migration: Add ShippedDate column to Orders table
$serverName = "DESKTOP-06731U1\SQLEXPRESS";
$connectionOptions = ["Database" => "SOFTENG", "Uid" => "", "PWD" => ""];
$conn = sqlsrv_connect($serverName, $connectionOptions);
if ($conn === false) { die("Connection failed: " . print_r(sqlsrv_errors(), true)); }

$sql = "IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Orders' AND COLUMN_NAME = 'ShippedDate')
        BEGIN
            ALTER TABLE Orders ADD ShippedDate DATETIME NULL
        END";

$result = sqlsrv_query($conn, $sql);
if ($result === false) {
    echo "Error adding ShippedDate column: " . print_r(sqlsrv_errors(), true);
} else {
    echo "ShippedDate column added (or already exists).";
}

sqlsrv_close($conn);
