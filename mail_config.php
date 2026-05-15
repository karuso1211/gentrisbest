<?php
// ─── Email / SMTP Configuration ───────────────────────────────────────────────
// Fill in your Gmail credentials below, then run:
//   composer install
// in this folder to install PHPMailer before the forgot-password flow will work.
//
// Gmail setup:
//   1. Go to https://myaccount.google.com/security
//   2. Enable 2-Step Verification
//   3. Search "App passwords", create one for "Mail" → copy the 16-char password
//   4. Paste it into MAIL_PASSWORD below (no spaces)

define('MAIL_HOST',       'smtp.gmail.com');
define('MAIL_PORT',       587);
define('MAIL_ENCRYPTION', 'tls');
define('MAIL_USERNAME',   'manliguisralph@gmail.com');  // <-- change this
define('MAIL_PASSWORD',   'bhbr jzjg yuqw qjjz');   // <-- Gmail App Password
define('MAIL_FROM_EMAIL', 'manliguisralph@gmail.com');  // <-- change this (same as above)
define('MAIL_FROM_NAME',  "Gentris Best Support");

// Base URL of this app (no trailing slash) — auto-detected from the request
$_app_scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$_app_host   = $_SERVER['HTTP_HOST'] ?? 'localhost';
$_app_dir    = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
// Walk up one level if the current script is not at the project root
// (e.g. called from a sub-page like /webapp/gentrisbest/login.php → keep /webapp/gentrisbest)
define('APP_URL', $_app_scheme . '://' . $_app_host . $_app_dir);
unset($_app_scheme, $_app_host, $_app_dir);
