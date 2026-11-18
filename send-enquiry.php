<?php
/**
 * M/S. Cooling Point: enquiry form handler
 * ------------------------------------------------------------------
 * Receives the enquiry form (contact.html / index.html), validates it,
 * applies spam protection and emails the enquiry to the business.
 *
 * Works on any standard PHP 7.4+ host (cPanel, Hostinger, etc.).
 * Responds with JSON for the AJAX form (assets/js/main.js) and with a
 * redirect for browsers that submit without JavaScript.
 *
 * Spam protection layers:
 *   1. Honeypot field ("website") that humans never see or fill
 *   2. Time trap: submissions faster than MIN_SECONDS are rejected
 *   3. Per-IP rate limit (hashed IPs, stored in the system temp folder)
 *   4. Strict server-side validation + header-injection safe email
 *   5. Optional Cloudflare Turnstile check (set TURNSTILE_SECRET)
 *
 * For reliable delivery on shared hosting, consider SMTP (e.g. PHPMailer)
 * instead of PHP mail(). See README.md > "Enquiry form".
 */

declare(strict_types=1);

/* ------------------------------------------------------------------
   CONFIGURATION: edit these values before going live
   ------------------------------------------------------------------ */
const RECIPIENT_EMAIL = 'info@coolingpoint.example';      // where enquiries are delivered
const FROM_EMAIL      = 'no-reply@coolingpoint.example';  // must be an address on YOUR domain
const FROM_NAME       = 'Cooling Point Website';
const SUBJECT_PREFIX  = 'New website enquiry';
const MIN_SECONDS     = 3;      // reject forms submitted faster than this (bots)
const MAX_PER_HOUR    = 5;      // submissions allowed per IP per hour
const TURNSTILE_SECRET = '';    // optional: Cloudflare Turnstile secret key
const REDIRECT_PAGE   = 'contact.html';

const SERVICES = [
    'ac-installation'          => 'AC Installation',
    'ac-repair-maintenance'    => 'AC Repair & Maintenance',
    'industrial-hvac'          => 'Industrial HVAC Solutions',
    'cold-room-solutions'      => 'Cold Room Solutions',
    'solar-panel-installation' => 'Solar Panel Installation',
    'commercial-refrigeration' => 'Commercial Refrigeration',
    'other'                    => 'Other / Not sure',
];

/* ------------------------------------------------------------------ */

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

$wantsJson = (isset($_SERVER['HTTP_ACCEPT']) && strpos($_SERVER['HTTP_ACCEPT'], 'application/json') !== false)
    || (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest');

function respond(bool $ok, string $message, array $errors = [], int $status = 200): void
{
    global $wantsJson;
    if ($wantsJson) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode(['ok' => $ok, 'message' => $message, 'errors' => (object) $errors], JSON_UNESCAPED_UNICODE);
    } else {
        header('Location: ' . REDIRECT_PAGE . '?enquiry=' . ($ok ? 'sent' : 'error') . '#enquiry', true, 303);
    }
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    header('Allow: POST');
    respond(false, 'Method not allowed.', [], 405);
}

/** Trim, strip control characters and limit length. */
function clean(string $key, int $max): string
{
    $value = isset($_POST[$key]) && is_string($_POST[$key]) ? $_POST[$key] : '';
    $value = preg_replace('/[^\P{C}\n\t]/u', '', $value) ?? '';
    $value = trim($value);
    return function_exists('mb_substr') ? mb_substr($value, 0, $max) : substr($value, 0, $max);
}

/** Accepts Indian mobiles (+91 / 91 / 0 prefixes) or international +XX numbers. Mirrors main.js. */
function normalise_phone(string $raw): ?string
{
    $raw = trim($raw);
    $plus = strpos($raw, '+') === 0;
    $digits = preg_replace('/[\s\-().]/', '', $raw) ?? '';
    $digits = ltrim($digits, '+');
    if ($digits === '' || !ctype_digit($digits)) return null;
    if (strlen($digits) === 12 && strpos($digits, '91') === 0) $digits = substr($digits, 2);
    elseif (strlen($digits) === 11 && $digits[0] === '0') $digits = substr($digits, 1);
    elseif ($plus && strpos($digits, '91') !== 0 && strlen($digits) >= 8 && strlen($digits) <= 15) return '+' . $digits;
    return preg_match('/^[6-9]\d{9}$/', $digits) ? '+91' . $digits : null;
}

/* 1. Honeypot: pretend success so bots learn nothing */
if (clean('website', 200) !== '') {
    respond(true, 'Thank you! Your enquiry has been received.');
}

/* 2. Time trap (only when the timestamp was set by JavaScript) */
$started = clean('cp_started', 20);
if ($started !== '' && ctype_digit($started)) {
    $elapsed = (time() * 1000 - (int) $started) / 1000;
    if ($elapsed < MIN_SECONDS) {
        respond(false, 'That was very quick! Please wait a moment and submit again.', [], 429);
    }
}

/* 3. Rate limit per IP (hashed, never stored in plain text) */
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$bucket = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'cp_enquiry_' . hash('sha256', $ip . __FILE__) . '.json';
$now = time();
$hits = [];
if (is_file($bucket)) {
    $hits = json_decode((string) @file_get_contents($bucket), true) ?: [];
    $hits = array_values(array_filter($hits, static function ($t) use ($now) { return is_int($t) && $t > $now - 3600; }));
}
if (count($hits) >= MAX_PER_HOUR) {
    respond(false, 'Too many enquiries from your connection. Please try again later or contact us on WhatsApp.', [], 429);
}

/* 4. Optional Cloudflare Turnstile */
if (TURNSTILE_SECRET !== '') {
    $token = clean('cf-turnstile-response', 2048);
    $ctx = stream_context_create(['http' => [
        'method'  => 'POST',
        'header'  => 'Content-Type: application/x-www-form-urlencoded',
        'content' => http_build_query(['secret' => TURNSTILE_SECRET, 'response' => $token, 'remoteip' => $ip]),
        'timeout' => 8,
    ]]);
    $verify = json_decode((string) @file_get_contents('https://challenges.cloudflare.com/turnstile/v0/siteverify', false, $ctx), true);
    if (empty($verify['success'])) {
        respond(false, 'Spam check failed. Please refresh the page and try again.', [], 400);
    }
}

/* 5. Validation */
$name    = clean('name', 80);
$email   = clean('email', 120);
$phoneIn = clean('phone', 20);
$service = clean('service', 40);
$message = clean('message', 2000);
$page    = preg_replace('/[^a-z0-9\-]/', '', strtolower(clean('cp_page', 30))) ?? '';

$errors = [];
if ($name === '' || (function_exists('mb_strlen') ? mb_strlen($name) : strlen($name)) < 2) {
    $errors['name'] = 'Please enter your full name.';
} elseif (!preg_match("/^[\p{L}\p{M} .'-]+$/u", $name)) {
    $errors['name'] = 'Please use letters only.';
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Please enter a valid email address.';
}
$phone = normalise_phone($phoneIn);
if ($phone === null) {
    $errors['phone'] = 'Please enter a valid 10-digit mobile number.';
}
if (!array_key_exists($service, SERVICES)) {
    $errors['service'] = 'Please choose the service you need.';
}
if ((function_exists('mb_strlen') ? mb_strlen($message) : strlen($message)) < 10) {
    $errors['message'] = 'Please add a few more details (at least 10 characters).';
}
// Basic link-spam heuristic
if (preg_match_all('~https?://~i', $message) > 2) {
    $errors['message'] = 'Please remove links from your message.';
}
if ($errors) {
    respond(false, 'Please correct the highlighted fields.', $errors, 422);
}

/* 6. Compose and send */
$serviceLabel = SERVICES[$service];
$safeName = str_replace(["\r", "\n"], ' ', $name);
$subject = SUBJECT_PREFIX . ': ' . $serviceLabel . ' (' . $safeName . ')';
$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

$body  = "New enquiry from the M/S. Cooling Point website\n";
$body .= str_repeat('-', 48) . "\n";
$body .= "Name:     {$name}\n";
$body .= "Email:    {$email}\n";
$body .= "Mobile:   {$phone}\n";
$body .= "Service:  {$serviceLabel}\n";
$body .= "Page:     " . ($page ?: 'unknown') . "\n";
$body .= "Sent:     " . gmdate('Y-m-d H:i') . " UTC\n";
$body .= str_repeat('-', 48) . "\n\n";
$body .= $message . "\n";

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'From: =?UTF-8?B?' . base64_encode(FROM_NAME) . '?= <' . FROM_EMAIL . '>',
    'Reply-To: ' . $email,   // validated by FILTER_VALIDATE_EMAIL, so no CR/LF
    'X-Mailer: CoolingPoint/1.0',
];

$sent = @mail(RECIPIENT_EMAIL, $encodedSubject, $body, implode("\r\n", $headers), '-f' . FROM_EMAIL);

if (!$sent) {
    error_log('[cooling-point] mail() failed for enquiry from page ' . $page);
    respond(false, 'Sorry, we could not send your enquiry right now. Please contact us on WhatsApp or by phone.', [], 500);
}

$hits[] = $now;
@file_put_contents($bucket, json_encode($hits), LOCK_EX);

respond(true, 'Thank you, ' . $safeName . '. Our team will get back to you shortly.');
