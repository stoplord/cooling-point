<?php
/**
 * Plugin Name:       Cooling Point Enquiry Form
 * Description:       REST endpoint for the M/S. Cooling Point enquiry form (same fields, validation and spam protection as send-enquiry.php). Sends enquiries with wp_mail().
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * License:           GPL-2.0-or-later
 *
 * Endpoint: POST /wp-json/coolingpoint/v1/enquiry
 * Point the form's action attribute at that URL; assets/js/main.js needs no changes.
 * Recipient: Settings > General > Administration Email Address, or define
 * COOLING_POINT_ENQUIRY_TO in wp-config.php.
 * For reliable delivery, use an SMTP plugin (e.g. WP Mail SMTP) with wp_mail().
 */

if (!defined('ABSPATH')) {
    exit;
}

const CP_ENQ_MIN_SECONDS = 3;
const CP_ENQ_MAX_PER_HOUR = 5;

function cp_enq_services(): array
{
    return [
        'ac-installation'          => 'AC Installation',
        'ac-repair-maintenance'    => 'AC Repair & Maintenance',
        'industrial-hvac'          => 'Industrial HVAC Solutions',
        'cold-room-solutions'      => 'Cold Room Solutions',
        'solar-panel-installation' => 'Solar Panel Installation',
        'commercial-refrigeration' => 'Commercial Refrigeration',
        'other'                    => 'Other / Not sure',
    ];
}

/** Mirrors normalisePhone() in assets/js/main.js */
function cp_enq_normalise_phone(string $raw): ?string
{
    $raw = trim($raw);
    $plus = strpos($raw, '+') === 0;
    $digits = ltrim((string) preg_replace('/[\s\-().]/', '', $raw), '+');
    if ($digits === '' || !ctype_digit($digits)) return null;
    if (strlen($digits) === 12 && strpos($digits, '91') === 0) $digits = substr($digits, 2);
    elseif (strlen($digits) === 11 && $digits[0] === '0') $digits = substr($digits, 1);
    elseif ($plus && strpos($digits, '91') !== 0 && strlen($digits) >= 8 && strlen($digits) <= 15) return '+' . $digits;
    return preg_match('/^[6-9]\d{9}$/', $digits) ? '+91' . $digits : null;
}

add_action('rest_api_init', static function () {
    register_rest_route('coolingpoint/v1', '/enquiry', [
        'methods'             => 'POST',
        'permission_callback' => '__return_true', // public form; protected by the checks below
        'callback'            => 'cp_enq_handle',
    ]);
});

function cp_enq_respond(WP_REST_Request $request, bool $ok, string $message, array $errors = [], int $status = 200)
{
    $accept = (string) $request->get_header('accept');
    if (strpos($accept, 'application/json') === false && !$request->get_header('x_requested_with')) {
        // Browser submitted without JavaScript: send them back to the page
        $back = wp_get_referer() ?: home_url('/');
        wp_safe_redirect(add_query_arg('enquiry', $ok ? 'sent' : 'error', $back) . '#enquiry', 303);
        exit;
    }
    return new WP_REST_Response(['ok' => $ok, 'message' => $message, 'errors' => (object) $errors], $status);
}

function cp_enq_handle(WP_REST_Request $request)
{
    $p = static function (string $key, int $max) use ($request): string {
        $v = $request->get_param($key);
        return is_string($v) ? mb_substr(trim($v), 0, $max) : '';
    };

    // 1. Honeypot
    if ($p('website', 200) !== '') {
        return cp_enq_respond($request, true, 'Thank you! Your enquiry has been received.');
    }
    // 2. Time trap
    $started = $p('cp_started', 20);
    if ($started !== '' && ctype_digit($started) && (time() * 1000 - (int) $started) / 1000 < CP_ENQ_MIN_SECONDS) {
        return cp_enq_respond($request, false, 'That was very quick! Please wait a moment and submit again.', [], 429);
    }
    // 3. Rate limit (hashed IP, transient)
    $ip = isset($_SERVER['REMOTE_ADDR']) ? sanitize_text_field(wp_unslash($_SERVER['REMOTE_ADDR'])) : 'unknown';
    $key = 'cp_enq_' . md5($ip . wp_salt('nonce'));
    $hits = (int) get_transient($key);
    if ($hits >= CP_ENQ_MAX_PER_HOUR) {
        return cp_enq_respond($request, false, 'Too many enquiries from your connection. Please try again later or contact us on WhatsApp.', [], 429);
    }

    // 4. Validation
    $name    = sanitize_text_field($p('name', 80));
    $email   = sanitize_email($p('email', 120));
    $phone   = cp_enq_normalise_phone($p('phone', 20));
    $service = sanitize_key($p('service', 40));
    $message = sanitize_textarea_field($p('message', 2000));
    $page    = sanitize_key($p('cp_page', 30));
    $services = cp_enq_services();

    $errors = [];
    if (mb_strlen($name) < 2 || !preg_match("/^[\p{L}\p{M} .'-]+$/u", $name)) $errors['name'] = 'Please enter your full name.';
    if (!is_email($email)) $errors['email'] = 'Please enter a valid email address.';
    if ($phone === null) $errors['phone'] = 'Please enter a valid 10-digit mobile number.';
    if (!isset($services[$service])) $errors['service'] = 'Please choose the service you need.';
    if (mb_strlen($message) < 10) $errors['message'] = 'Please add a few more details (at least 10 characters).';
    if (preg_match_all('~https?://~i', $message) > 2) $errors['message'] = 'Please remove links from your message.';
    if ($errors) {
        return cp_enq_respond($request, false, 'Please correct the highlighted fields.', $errors, 422);
    }

    // 5. Send
    $to = defined('COOLING_POINT_ENQUIRY_TO') ? COOLING_POINT_ENQUIRY_TO : get_option('admin_email');
    $subject = sprintf('New website enquiry: %s (%s)', $services[$service], $name);
    $body = "New enquiry from the M/S. Cooling Point website\n" . str_repeat('-', 48) . "\n"
        . "Name:     {$name}\nEmail:    {$email}\nMobile:   {$phone}\nService:  {$services[$service]}\n"
        . 'Page:     ' . ($page ?: 'unknown') . "\n" . str_repeat('-', 48) . "\n\n{$message}\n";
    $sent = wp_mail($to, $subject, $body, ['Reply-To: ' . $name . ' <' . $email . '>']);

    if (!$sent) {
        return cp_enq_respond($request, false, 'Sorry, we could not send your enquiry right now. Please contact us on WhatsApp or by phone.', [], 500);
    }
    set_transient($key, $hits + 1, HOUR_IN_SECONDS);
    return cp_enq_respond($request, true, 'Thank you, ' . $name . '. Our team will get back to you shortly.');
}
