# WordPress integration

The static site is built so it can be moved into a WordPress theme without rewriting
markup, CSS or JavaScript. Two parts need wiring up: **assets** and the **enquiry form**.

> Not yet tested against a live WordPress install. The plugin passes `php -l` and uses
> only core WordPress APIs (`register_rest_route`, `wp_mail`, transients). Test it on
> staging before production.

---

## 1. Theme structure

Create a theme folder (e.g. `wp-content/themes/coolingpoint/`) and copy `assets/` into it.

| Static file                    | WordPress template               |
| ------------------------------ | -------------------------------- |
| `<head>`…`<header>` + sprite   | `header.php` (use `wp_head()`)   |
| `<footer>` … floating buttons  | `footer.php` (use `wp_footer()`) |
| `index.html` `<main>`          | `front-page.php`                 |
| `about.html`, `services.html`… | page templates / block patterns  |
| Service detail pages           | `page-{slug}.php` or a CPT       |

Each HTML page contains an inline SVG icon sprite right after `<body>`; put the one from
`index.html` in `header.php` (it includes every icon the home page uses; add symbols from
other pages if you use their icons).

Relative paths such as `assets/images/...` become
`<?php echo esc_url( get_theme_file_uri( 'assets/images/...' ) ); ?>`.

## 2. Enqueue assets (`functions.php`)

```php
add_action( 'wp_enqueue_scripts', function () {
    $v   = '1.0.0';
    $uri = get_theme_file_uri();

    // Full Bootstrap is safer in WordPress (editors add classes the purge step can't see).
    wp_enqueue_style( 'bootstrap', "$uri/assets/vendor/bootstrap/bootstrap.min.css", [], '5.3.9' );
    wp_enqueue_style( 'aos', "$uri/assets/vendor/aos/aos.css", [], '2.3.4' );
    wp_enqueue_style( 'swiper', "$uri/assets/vendor/swiper/swiper-bundle.min.css", [], '11.2.10' );
    wp_enqueue_style( 'coolingpoint', "$uri/assets/css/site.min.css", [ 'bootstrap' ], $v );

    wp_enqueue_script( 'gsap', "$uri/assets/vendor/gsap/gsap.min.js", [], '3.15.1', [ 'strategy' => 'defer' ] );
    wp_enqueue_script( 'gsap-st', "$uri/assets/vendor/gsap/ScrollTrigger.min.js", [ 'gsap' ], '3.15.1', [ 'strategy' => 'defer' ] );
    wp_enqueue_script( 'aos', "$uri/assets/vendor/aos/aos.js", [], '2.3.4', [ 'strategy' => 'defer' ] );
    wp_enqueue_script( 'swiper', "$uri/assets/vendor/swiper/swiper-bundle.min.js", [], '11.2.10', [ 'strategy' => 'defer' ] );
    wp_enqueue_script( 'coolingpoint', "$uri/assets/js/site.min.js", [ 'gsap-st', 'aos', 'swiper' ], $v, [ 'strategy' => 'defer' ] );
} );

// Adds the `js` class used by the stylesheet (keep it early in <head>).
add_action( 'wp_head', function () {
    echo "<script>document.documentElement.classList.add('js');</script>\n";
}, 1 );

// Preload the two self-hosted fonts.
add_action( 'wp_head', function () {
    foreach ( [ 'manrope', 'inter' ] as $f ) {
        printf( '<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n",
            esc_url( get_theme_file_uri( "assets/fonts/$f-latin-wght-normal.woff2" ) ) );
    }
}, 2 );
```

Add `data-page="home"` (etc.) to `<body>` via `body_class` or directly in `header.php`.
`main.js` uses it to highlight "Our Locations" in the nav while that section is in view on the home page.

## 3. Enquiry form

### Option A (recommended): keep the custom form + included plugin

1. Copy `cooling-point-enquiry/` into `wp-content/plugins/` and activate **Cooling Point Enquiry Form**.
2. In the form markup, change the action:
   ```html
   <form class="cp-form" action="<?php echo esc_url( rest_url( 'coolingpoint/v1/enquiry' ) ); ?>" method="post" novalidate data-cp-form>
   ```
3. Set the recipient in `wp-config.php` (falls back to the admin email):
   ```php
   define( 'COOLING_POINT_ENQUIRY_TO', 'enquiries@your-domain.com' );
   ```
4. Install an SMTP plugin (e.g. *WP Mail SMTP*) so `wp_mail()` delivers reliably.

The plugin returns the same JSON as `send-enquiry.php`
(`{ ok, message, errors: { field: "message" } }`), so client-side validation, loading states
and success/error messages work as they do now. It applies the same honeypot, 3-second time
trap, 5-per-hour rate limit and server-side validation.

### Option B: Contact Form 7

If you'd rather manage the form in CF7, remove `data-cp-form` and `action` from the form
(CF7 handles validation and AJAX), then use this form template. The CSS classes keep the design:

```text
<div class="row gx-3">
  <div class="col-sm-6"><div class="cp-field"><label class="cp-label">Full Name *</label>[text* name class:cp-input placeholder "Your full name"]</div></div>
  <div class="col-sm-6"><div class="cp-field"><label class="cp-label">Email Address *</label>[email* email class:cp-input placeholder "you@company.com"]</div></div>
  <div class="col-sm-6"><div class="cp-field"><label class="cp-label">Mobile Number *</label>[tel* phone class:cp-input placeholder "10-digit mobile number"]</div></div>
  <div class="col-sm-6"><div class="cp-field"><label class="cp-label">Service Required *</label>[select* service class:cp-input first_as_label "Select a service" "AC Installation" "AC Repair & Maintenance" "Industrial HVAC Solutions" "Cold Room Solutions" "Solar Panel Installation" "Commercial Refrigeration" "Other / Not sure"]</div></div>
  <div class="col-12"><div class="cp-field"><label class="cp-label">Your Message *</label>[textarea* message class:cp-input placeholder "Tell us about your site, equipment or requirement"]</div></div>
</div>
[submit class:cp-btn class:cp-btn--primary class:cp-btn--block "Send Enquiry"]
```

For spam protection with CF7, enable its built-in Cloudflare Turnstile or reCAPTCHA v3 integration
(Contact → Integration) and/or add the *Honeypot for Contact Form 7* plugin.
