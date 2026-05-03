<?php
// ONE-TIME PASSWORD MIGRATION SCRIPT
// Run once via browser, then DELETE this file immediately after.

$serverName = "DESKTOP-06731U1\SQLEXPRESS";
$connectionOptions = [
    "Database" => "SOFTENG",
    "Uid" => "",
    "PWD" => ""
];
$conn = sqlsrv_connect($serverName, $connectionOptions);
if ($conn === false) die(print_r(sqlsrv_errors(), true));

$stmt = sqlsrv_query($conn, "SELECT Username, Password FROM Users");
if ($stmt === false) die(print_r(sqlsrv_errors(), true));

$migrated = 0;
$skipped = 0;

while ($row = sqlsrv_fetch_array($stmt, SQLSRV_FETCH_ASSOC)) {
    $plaintext = $row['Password'];

    // Skip if already a bcrypt hash (starts with $2y$)
    if (str_starts_with($plaintext, '$2y$')) {
        $skipped++;
        continue;
    }

    $hashed = password_hash($plaintext, PASSWORD_BCRYPT);
    $update = sqlsrv_query($conn,
        "UPDATE Users SET Password = ? WHERE Username = ?",
        [$hashed, $row['Username']]
    );

    if ($update === false) {
        echo "ERROR updating " . htmlspecialchars($row['Username']) . ": ";
        echo htmlspecialchars(print_r(sqlsrv_errors(), true)) . "<br>";
    } else {
        $migrated++;
    }
}

sqlsrv_close($conn);
echo "<strong>Done.</strong> Migrated: $migrated | Already hashed (skipped): $skipped<br>";
echo "<strong style='color:red'>Delete this file (migrate_passwords.php) now.</strong>";
?>
