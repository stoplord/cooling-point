# M/S. Cooling Point: Website

Premium, responsive, animated marketing website for **M/S. Cooling Point**, covering commercial
air-conditioning, industrial HVAC, refrigeration, cold rooms and solar panel installation.

**Stack:** HTML5 · CSS3 · Bootstrap 5.3 (grid & utilities) · Vanilla JS · GSAP 3 + ScrollTrigger ·
AOS · Swiper 11 · Lucide icons (inline SVG sprite) · self-hosted Manrope + Inter.
No framework and no build step required to run it; the optional `npm run build` only minifies.

> **Before going live, work through the [Launch checklist](#launch-checklist).** Contact details,
> the domain and the gallery photos are placeholders.

---

## Pages

| Page | File |
| --- | --- |
| Home | `index.html` |
| About Us | `about.html` |
| Services overview | `services.html` |
| Service details (6) | `ac-installation.html`, `ac-repair-maintenance.html`, `industrial-hvac.html`, `cold-room-solutions.html`, `solar-panel-installation.html`, `commercial-refrigeration.html` |
| Gallery | `gallery.html` |
| Contact Us | `contact.html` |
| Not found | `404.html` |

"Our Locations" is a section of the home page (`index.html#locations`) and is also shown on the contact page.

## Folder structure

```
/ (site root, the "coolingpoint" folder)
├── index.html, about.html, services.html, gallery.html, contact.html, 404.html
├── ac-installation.html … commercial-refrigeration.html   ← service detail pages
├── send-enquiry.php          ← enquiry form handler (PHP hosting)
├── .htaccess                 ← compression, caching, security headers (Apache)
├── robots.txt, sitemap.xml, site.webmanifest, favicon.svg, *.png icons
├── assets/
│   ├── css/
│   │   ├── style.css         ← tokens, base, components (source)
│   │   ├── animations.css    ← keyframes, hero entrance, reduced-motion (source)
│   │   ├── responsive.css    ← breakpoint enhancements (source)
│   │   ├── site.min.css      ← the three files above, minified (used by pages)
│   │   └── bootstrap.purged.min.css ← Bootstrap with unused rules removed (used by pages)
│   ├── js/
│   │   ├── main.js           ← header, menu, gallery, lightbox, slider, map, form (source)
│   │   ├── animations.js     ← GSAP/ScrollTrigger choreography (source)
│   │   └── site.min.js       ← both files, minified (used by pages)
│   ├── images/               ← WebP images in 640/1200 (and 768/1280/1920 for heroes)
│   ├── fonts/                ← Manrope & Inter variable fonts (latin subset)
│   └── vendor/               ← Bootstrap (full), GSAP, AOS, Swiper: pinned, self-hosted
├── integrations/wordpress/   ← WordPress plugin + theme integration guide
├── tools/purge-bootstrap.mjs ← build helper
└── package.json              ← optional build scripts (esbuild, purgecss)
```

## Run locally

**With PHP (recommended; the enquiry form works end to end):**

```bash
php -S localhost:8080
```

Then open http://localhost:8080. PHP's `mail()` needs a mail server; on most laptops it will
return the form's "could not send" message. That is expected, and the form works on real hosting.

**Static only (no form backend):**

```bash
npx http-server -p 8080 -c-1 .
```

Opening `index.html` directly from disk also works for browsing. The form can't submit from
`file://`, and some browsers restrict features there.

## Editing & building

Edit the **source** files (`style.css`, `animations.css`, `responsive.css`, `main.js`,
`animations.js`), then regenerate the minified files the pages load:

```bash
npm install
```

```bash
npm run build
```

`npm run build` does three things:

1. Minifies the three CSS files into `assets/css/site.min.css`
2. Minifies the two JS files into `assets/js/site.min.js`
3. Purges Bootstrap against the HTML into `assets/css/bootstrap.purged.min.css` (about 20 KB instead of 232 KB)

If you add Bootstrap classes that weren't used before, re-run the build, or switch the `<link>`
to the full `assets/vendor/bootstrap/bootstrap.min.css`.

The header, footer and `<head>` are repeated in each HTML file (that's how static sites work).
When you change the navigation or contact details, use a project-wide find & replace.

### Animation hooks (no JS changes needed)

| Attribute | Effect |
| --- | --- |
| `data-aos="fade-up" data-aos-delay="100"` | AOS reveal (cards, lists) |
| `data-split` | Heading words rise into view (GSAP) |
| `data-reveal` / `="left"` / `="right"` / `="scale"` / `="fade"` | Element reveal (GSAP) |
| `data-reveal-stagger` | Reveal direct children in sequence |
| `data-reveal-img` / `="left"` / `="right"` | Clip-path image reveal |
| `data-parallax="0.15"` | Vertical parallax |
| `data-count="10"` | Counter, with the final number written in the HTML |
| `.cp-divider` | Animated section separator |
| `.cp-draw` on an `<svg>` | Stroke-drawing line graphics |

The hero entrance is pure CSS (`animations.css`), so the headline paints without waiting for
JavaScript. All motion is disabled under `prefers-reduced-motion`, and no content is hidden if a
script fails to load.

## Enquiry form

`send-enquiry.php` validates and emails each enquiry. The form submits over AJAX (JSON
response) and still works without JavaScript (303 redirect back to `contact.html?enquiry=sent`).

**Configure** the constants at the top of `send-enquiry.php`:

- `RECIPIENT_EMAIL`: where enquiries go
- `FROM_EMAIL`: an address **on your own domain** (otherwise mail is often rejected as spam)
- `MAX_PER_HOUR`, `MIN_SECONDS`: rate limit and time-trap thresholds
- `TURNSTILE_SECRET`: optional Cloudflare Turnstile. Also add the Turnstile widget script and
  `<div class="cf-turnstile" data-sitekey="…">` inside the form.

**Spam protection:** hidden honeypot field, 3-second time trap, 5-per-hour per-IP rate limit
(hashed IPs in the system temp folder), strict server-side validation, header-injection-safe
headers and a link-spam check. Optional Turnstile.

**Delivery:** PHP `mail()` works on most cPanel hosts, but SMTP is more reliable. For SMTP,
replace the `mail()` call with PHPMailer or use your host's SMTP relay.

**No PHP on your host** (Netlify, GitHub Pages and similar): change the form `action` in
`index.html` and `contact.html` to a form service endpoint such as Formspree
(`https://formspree.io/f/your-id`). `main.js` already sends `Accept: application/json` and shows
success or error from the response status.

**WordPress:** see [`integrations/wordpress/README.md`](integrations/wordpress/README.md). It
includes a small plugin that exposes the same endpoint over the WP REST API, plus a Contact Form 7
alternative.

## Launch checklist

These are **placeholders or unverified items**. Replace them before publishing.

- [ ] **Domain.** Replace `https://www.coolingpoint.example` everywhere (canonical tags, Open
      Graph, JSON-LD, `sitemap.xml`, `robots.txt`).
- [ ] **Phone.** Replace `+91 00000 00000` (display) and `+910000000000` (`tel:` links).
- [ ] **WhatsApp.** Replace `910000000000` in every `https://wa.me/…` link (country code + number, digits only).
- [ ] **Email.** Replace `info@coolingpoint.example` in the pages and in `send-enquiry.php`
      (plus `no-reply@coolingpoint.example`).
- [ ] **Social links.** Footer icons point to `#` (`data-placeholder="social"`). Add real profile URLs or delete the icons.
- [ ] **Structured data.** The `HVACBusiness` JSON-LD in each page's `<head>` includes only details
      given in the brief (name, services, service areas, brands). Add `telephone`, `address`,
      `geo`, `openingHoursSpecification`, `logo` and `sameAs` once confirmed. Google needs an
      address for local business rich results.
- [ ] **Gallery and photography.** All photos are licensed stock images from Unsplash (see
      credits below). The gallery is titled "Our Work", so **replace those images with photos of
      your own projects** before launch. Keep the file names, or update the `src`/`srcset`
      attributes; export WebP at 640 px and 1200 px wide.
- [ ] **Testimonials.** Only the two provided reviews are shown. The five-star rows are
      decorative; confirm the customers are happy to be named. No review or rating markup is
      added to the structured data.
- [ ] **Service page copy.** The overview, "What's included", "Ideal for" and FAQ text on the six
      service pages was drafted for this site. Check that every item matches services you actually provide.
- [ ] **Brand logos.** Brands are shown as text on purpose. Use official logos only with each
      brand's written permission. Tiles support an `<img>` if you get it.
- [ ] **Logo.** The snowflake mark (`favicon.svg`, `assets/images/logo-mark.svg`) was created for
      this build. Swap in your official logo if you have one.
- [ ] **HTTPS.** Enable HTTPS, then uncomment the HSTS header in `.htaccess`.

## Deployment

- **Apache / cPanel:** upload everything except `node_modules/`. `.htaccess` enables
  Brotli/Gzip, caching, security headers and the 404 page, and blocks access to tooling folders.
- **Nginx:** enable `gzip on;` for `text/css application/javascript image/svg+xml`, add
  `error_page 404 /404.html;`, cache `/assets/` for 30 days or more, and pass `send-enquiry.php` to PHP-FPM.

Lighthouse (mobile, simulated slow 4G, served with gzip) on this build: home page
Performance 93 · Accessibility 100 · Best Practices 100 · SEO 100; service pages ~96 performance.
Real-world numbers depend on your host.

## Credits & licences

- **Photography:** [Unsplash License](https://unsplash.com/license) (free commercial use). Sources:
  [rooftop condenser fans](https://unsplash.com/photos/cU_hS2TlDZI) ·
  [plant-room pipework](https://unsplash.com/photos/aQkHit3DA20) ·
  [technician on lift](https://unsplash.com/photos/5l991aLrCJ8) ·
  [rooftop outdoor units](https://unsplash.com/photos/PqnP6UfzJ2E) ·
  [rooftop AC work](https://unsplash.com/photos/iS5GDeLDk0E) ·
  [technician with meter](https://unsplash.com/photos/_2AlIm-F6pw) ·
  [cold storage](https://unsplash.com/photos/-rmA0xZAdhY) ·
  [solar installation](https://unsplash.com/photos/rNn_TU8dvoY) ·
  [refrigerated display](https://unsplash.com/photos/NRP0iTFLzPk) ·
  [wall-mounted condensers](https://unsplash.com/photos/VsjNRXO_c2w) ·
  [condenser bank](https://unsplash.com/photos/l_Vn4HlFQVw) ·
  [facade AC units](https://unsplash.com/photos/994AH40vmVs) ·
  [rooftop cooling towers](https://unsplash.com/photos/XoU0NEvH7wU) ·
  [ventilation ducts](https://unsplash.com/photos/L23Drc99Cyk) ·
  [industrial pipework](https://unsplash.com/photos/18CHs5JonWQ) ·
  [chiller equipment](https://unsplash.com/photos/RHLBWUAfO_o) ·
  [chest freezers](https://unsplash.com/photos/N6zB7z7MEvk) ·
  [refrigerated aisle](https://unsplash.com/photos/ouNWk-_iTmM) ·
  [solar field](https://unsplash.com/photos/513dBrMJ_5w) ·
  [solar site helmet](https://unsplash.com/photos/2ASQyjafflo) ·
  [panel diagnostics](https://unsplash.com/photos/LMb98OOtoYU)
- **Map outlines:** West Bengal & Jharkhand boundaries from [Natural Earth](https://www.naturalearthdata.com/) (public domain), simplified.
- **Icons:** [Lucide](https://lucide.dev) (ISC); WhatsApp and social icons from [Font Awesome Free](https://fontawesome.com) (CC BY 4.0).
- **Fonts:** Manrope and Inter (SIL Open Font License) via Fontsource.
- **Libraries:** Bootstrap 5.3.9 (MIT), GSAP 3.15.1 ([GSAP standard licence](https://gsap.com/standard-license), free for commercial use), AOS 2.3.4 (MIT), Swiper 11.2.10 (MIT).
- Brand names are trademarks of their respective owners and are listed only to indicate equipment serviced.

---

© 2026 M/S. Cooling Point.
