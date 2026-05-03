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

// Base URL of this app (no trailing slash)
define('APP_URL', 'http://localhost/webapp/gentrisbest');
