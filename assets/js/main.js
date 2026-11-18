/* ==========================================================================
   M/S. Cooling Point: main.js
   Interface behaviour: header, mobile menu, anchors, back-to-top, gallery
   filter + lightbox, testimonials slider, location map, enquiry form.
   Works without GSAP; animations live in animations.js.
   SOURCE FILE: after editing, run `npm run build` to regenerate site.min.js
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function onReady(fn) {
    if (doc.readyState !== 'loading') fn();
    else doc.addEventListener('DOMContentLoaded', fn);
  }

  /* ------------------------------------------------------------------
     1. Header: transparent -> solid navy on scroll
     ------------------------------------------------------------------ */
  function initHeader() {
    var header = $('.cp-header');
    if (!header) return;
    var ticking = false;
    function update() {
      header.classList.toggle('is-scrolled', window.scrollY > 40);
      ticking = false;
    }
    update();
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
  }

  /* ------------------------------------------------------------------
     2. Mobile menu (accessible: inert when closed, focus trap, Esc)
     ------------------------------------------------------------------ */
  function initMobileMenu() {
    var burger = $('.cp-burger');
    var menu = $('#cp-mobile-menu');
    if (!burger || !menu) return;

    function focusables() { return $$('a[href], button:not([disabled])', menu); }
    function isOpen() { return burger.getAttribute('aria-expanded') === 'true'; }

    function open() {
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Close menu');
      menu.removeAttribute('inert');
      menu.setAttribute('aria-hidden', 'false');
      menu.classList.add('is-open');
      doc.body.classList.add('is-locked');
      window.setTimeout(function () {
        var first = focusables()[0];
        if (first) first.focus({ preventScroll: true });
      }, 300);
    }
    function close(returnFocus) {
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Open menu');
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      menu.setAttribute('inert', '');
      doc.body.classList.remove('is-locked');
      if (returnFocus !== false) burger.focus({ preventScroll: true });
    }

    burger.addEventListener('click', function () { if (isOpen()) close(); else open(); });
    menu.addEventListener('click', function (e) { if (e.target.closest('a')) close(false); });
    doc.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      var items = [burger].concat(focusables());
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    var desktop = window.matchMedia('(min-width: 1200px)');
    var onChange = function (e) { if (e.matches && isOpen()) close(false); };
    if (desktop.addEventListener) desktop.addEventListener('change', onChange);
  }

  /* ------------------------------------------------------------------
     3. Same-page anchors (also handles "index.html#locations" when the
        site is served from "/"), with header offset via CSS scroll-padding.
     ------------------------------------------------------------------ */
  function samePage(url) {
    var strip = function (p) { return p.replace(/index\.html$/, ''); };
    return url.origin === window.location.origin && strip(url.pathname) === strip(window.location.pathname);
  }
  function initAnchors() {
    doc.addEventListener('click', function (e) {
      var link = e.target.closest('a[href*="#"]');
      if (!link || link.hasAttribute('data-no-smooth') || e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      var url;
      try { url = new URL(link.href, window.location.href); } catch (err) { return; }
      if (!url.hash || url.hash === '#' || !samePage(url)) return;
      var target = doc.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
      if (window.history && window.history.pushState) window.history.pushState(null, '', url.hash);
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  }

  /* Home page: highlight "Our Locations" in the nav while that section is in view */
  function initSectionNav() {
    var locations = doc.getElementById('locations');
    if (doc.body.getAttribute('data-page') !== 'home') return;
    if (!locations || !('IntersectionObserver' in window)) return;
    var homeLinks = $$('[data-nav="home"]');
    var locLinks = $$('[data-nav="locations"]');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var inView = entry.isIntersecting;
        locLinks.forEach(function (a) { a.classList.toggle('is-active', inView); });
        homeLinks.forEach(function (a) { a.classList.toggle('is-active', !inView); });
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    io.observe(locations);
  }

  /* ------------------------------------------------------------------
     4. Back-to-top with scroll progress ring
     ------------------------------------------------------------------ */
  function initBackToTop() {
    var btn = $('.cp-backtotop');
    if (!btn) return;
    var ring = $('.cp-backtotop__progress', btn);
    var length = 138.2;
    var ticking = false;
    function update() {
      var max = doc.documentElement.scrollHeight - window.innerHeight;
      var progress = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      btn.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.6);
      if (ring) ring.style.strokeDashoffset = String(length - length * progress);
      ticking = false;
    }
    update();
    window.addEventListener('scroll', function () {
      if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      var skip = $('.cp-skip-link');
      if (skip) skip.focus({ preventScroll: true });
    });
  }

  /* ------------------------------------------------------------------
     5. Gallery: category filter + accessible lightbox (<dialog>)
     ------------------------------------------------------------------ */
  function initGallery() {
    var galleries = $$('[data-gallery]');
    if (!galleries.length) return;
    var dialog = $('#cp-lightbox');

    galleries.forEach(function (gallery) {
      var items = $$('.cp-gallery-item', gallery);
      var filterBar = $('[data-gallery-filter="' + gallery.id + '"]');
      var empty = $('.cp-gallery-empty', gallery.parentNode);

      if (filterBar) {
        var buttons = $$('.cp-filter__btn', filterBar);
        buttons.forEach(function (btn) {
          btn.addEventListener('click', function () {
            var cat = btn.getAttribute('data-filter');
            buttons.forEach(function (b) {
              var active = b === btn;
              b.classList.toggle('is-active', active);
              b.setAttribute('aria-pressed', active ? 'true' : 'false');
            });
            var shown = [];
            items.forEach(function (item) {
              var match = cat === 'all' || item.getAttribute('data-category') === cat;
              item.hidden = !match;
              if (match) shown.push(item);
            });
            if (empty) empty.hidden = shown.length > 0;
            if (window.gsap && !reduceMotion.matches) {
              window.gsap.fromTo(shown, { autoAlpha: 0, y: 24, scale: 0.97 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out', clearProps: 'transform' });
            }
            if (window.ScrollTrigger) window.ScrollTrigger.refresh();
          });
        });
      }

      if (!dialog || typeof dialog.showModal !== 'function') return;
      gallery.addEventListener('click', function (e) {
        var trigger = e.target.closest('.cp-gallery-item__btn');
        if (!trigger) return;
        var visible = items.filter(function (i) { return !i.hidden; }).map(function (i) { return $('.cp-gallery-item__btn', i); });
        openLightbox(visible, visible.indexOf(trigger), trigger);
      });
    });

    if (!dialog || typeof dialog.showModal !== 'function') return;
    var img = $('.cp-lightbox__img', dialog);
    var title = $('.cp-lightbox__title', dialog);
    var cat = $('.cp-lightbox__cat', dialog);
    var counter = $('.cp-lightbox__counter', dialog);
    var list = [];
    var index = 0;
    var opener = null;

    function render(i) {
      index = (i + list.length) % list.length;
      var t = list[index];
      img.classList.add('is-switching');
      var next = new Image();
      next.onload = next.onerror = function () {
        img.src = t.getAttribute('data-full');
        img.alt = t.querySelector('img').alt;
        title.textContent = t.getAttribute('data-title') || '';
        cat.textContent = t.getAttribute('data-cat') || '';
        counter.textContent = String(index + 1).padStart(2, '0') + ' / ' + String(list.length).padStart(2, '0');
        window.requestAnimationFrame(function () { img.classList.remove('is-switching'); });
      };
      next.src = t.getAttribute('data-full');
    }
    function openLightbox(items, i, from) {
      list = items; opener = from;
      render(i < 0 ? 0 : i);
      dialog.showModal();
      doc.body.classList.add('is-locked');
    }
    dialog.addEventListener('close', function () {
      doc.body.classList.remove('is-locked');
      if (opener) opener.focus({ preventScroll: true });
    });
    $('.cp-lightbox__close', dialog).addEventListener('click', function () { dialog.close(); });
    $('.cp-lightbox__prev', dialog).addEventListener('click', function () { render(index - 1); });
    $('.cp-lightbox__next', dialog).addEventListener('click', function () { render(index + 1); });
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); render(index - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); render(index + 1); }
    });
    // close when clicking the empty backdrop area
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog || e.target.classList.contains('cp-lightbox__figure')) dialog.close();
    });
    // swipe on touch screens
    var startX = null;
    dialog.addEventListener('pointerdown', function (e) { startX = e.clientX; });
    dialog.addEventListener('pointerup', function (e) {
      if (startX === null) return;
      var dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 50) render(index + (dx < 0 ? 1 : -1));
    });
  }

  /* ------------------------------------------------------------------
     6. Testimonials slider (Swiper.js)
     ------------------------------------------------------------------ */
  function initTestimonials() {
    var el = $('.cp-testimonial-swiper');
    if (!el || typeof window.Swiper !== 'function') return;
    // eslint-disable-next-line no-new
    new window.Swiper(el, {
      slidesPerView: 1,
      spaceBetween: 24,
      speed: 800,
      rewind: true,
      grabCursor: true,
      autoplay: reduceMotion.matches ? false : { delay: 6500, disableOnInteraction: false, pauseOnMouseEnter: true },
      navigation: { nextEl: '.cp-swiper-next', prevEl: '.cp-swiper-prev' },
      pagination: { el: '.cp-swiper-pagination', clickable: true },
      keyboard: { enabled: true, onlyInViewport: true },
      a11y: {
        enabled: true,
        prevSlideMessage: 'Previous testimonial',
        nextSlideMessage: 'Next testimonial',
        paginationBulletMessage: 'Go to testimonial {{index}}'
      }
    });
  }

  /* ------------------------------------------------------------------
     7. Service locations: link map pins and location cards
     ------------------------------------------------------------------ */
  function initLocations() {
    var map = $('.cp-map');
    if (!map) return;
    var cards = $$('.cp-location-card[data-location]');
    var pins = $$('.cp-map__pin[data-location]', map);
    function setActive(slug) {
      pins.forEach(function (p) { p.classList.toggle('is-active', p.getAttribute('data-location') === slug); });
      cards.forEach(function (c) { c.classList.toggle('is-active', c.getAttribute('data-location') === slug); });
    }
    cards.forEach(function (card) {
      var slug = card.getAttribute('data-location');
      card.addEventListener('mouseenter', function () { setActive(slug); });
      card.addEventListener('focus', function () { setActive(slug); });
      card.addEventListener('mouseleave', function () { setActive(null); });
      card.addEventListener('blur', function () { setActive(null); });
    });
    pins.forEach(function (pin) {
      var slug = pin.getAttribute('data-location');
      pin.addEventListener('mouseenter', function () { setActive(slug); });
      pin.addEventListener('mouseleave', function () { setActive(null); });
      pin.addEventListener('click', function () {
        var card = cards.filter(function (c) { return c.getAttribute('data-location') === slug; })[0];
        if (card) window.location.href = card.href;
      });
    });
  }

  /* ------------------------------------------------------------------
     8. Enquiry form: validation, spam protection, AJAX submit
        Endpoint = the form's action attribute (send-enquiry.php by default;
        see README for Formspree / WordPress alternatives).
     ------------------------------------------------------------------ */
  var rules = {
    name: function (v) {
      if (!v) return 'Please enter your full name.';
      if (v.length < 2) return 'Name looks too short.';
      if (v.length > 80) return 'Please keep your name under 80 characters.';
      if (!/^[\p{L}\p{M} .'-]+$/u.test(v)) return 'Please use letters only.';
      return '';
    },
    email: function (v) {
      if (!v) return 'Please enter your email address.';
      if (v.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Please enter a valid email address.';
      return '';
    },
    phone: function (v) {
      if (!v) return 'Please enter your mobile number.';
      return normalisePhone(v) ? '' : 'Please enter a valid 10-digit mobile number.';
    },
    service: function (v) { return v ? '' : 'Please choose the service you need.'; },
    message: function (v) {
      if (!v) return 'Please tell us a little about your requirement.';
      if (v.length < 10) return 'Please add a few more details (at least 10 characters).';
      if (v.length > 2000) return 'Please keep your message under 2000 characters.';
      return '';
    }
  };

  /* Accepts Indian mobiles (+91 / 91 / 0 prefixes, spaces, dashes) or international +XX numbers. */
  function normalisePhone(raw) {
    var v = String(raw).trim();
    var plus = v.charAt(0) === '+';
    var digits = v.replace(/[\s\-().]/g, '').replace(/^\+/, '');
    if (!/^\d+$/.test(digits)) return null;
    if (digits.length === 12 && digits.indexOf('91') === 0) digits = digits.slice(2);
    else if (digits.length === 11 && digits.charAt(0) === '0') digits = digits.slice(1);
    else if (plus && digits.indexOf('91') !== 0 && digits.length >= 8 && digits.length <= 15) return '+' + digits;
    return /^[6-9]\d{9}$/.test(digits) ? '+91' + digits : null;
  }

  function initForms() {
    $$('form[data-cp-form]').forEach(function (form) {
      var status = $('.cp-form__status', form);
      var submit = $('[type="submit"]', form);
      var started = $('[name="cp_started"]', form);
      if (started) started.value = String(Date.now());

      function field(name) { return form.elements[name]; }
      function setError(name, msg) {
        var input = field(name);
        if (!input) return;
        var wrap = input.closest('.cp-field');
        var err = wrap ? $('.cp-field__error span', wrap) : null;
        input.classList.toggle('is-invalid', !!msg);
        input.classList.toggle('is-valid', !msg && !!input.value.trim());
        input.setAttribute('aria-invalid', msg ? 'true' : 'false');
        if (wrap) wrap.classList.toggle('has-error', !!msg);
        if (err) err.textContent = msg || '';
      }
      function validate(name) {
        var input = field(name);
        if (!input || !rules[name]) return '';
        var msg = rules[name](input.value.trim());
        setError(name, msg);
        return msg;
      }
      function showStatus(type, title, text) {
        if (!status) return;
        status.className = 'cp-form__status cp-form__status--' + type + ' is-visible';
        status.innerHTML = '';
        var icon = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('class', 'cp-icon');
        icon.setAttribute('aria-hidden', 'true');
        var use = doc.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttribute('href', type === 'success' ? '#i-circle-check' : '#i-circle-alert');
        icon.appendChild(use);
        var body = doc.createElement('div');
        var strong = doc.createElement('strong');
        strong.textContent = title;
        var p = doc.createElement('span');
        p.textContent = text;
        body.appendChild(strong);
        body.appendChild(p);
        status.appendChild(icon);
        status.appendChild(body);
        status.setAttribute('tabindex', '-1');
        status.focus({ preventScroll: true });
        status.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
      }
      function setLoading(on) {
        if (!submit) return;
        submit.classList.toggle('is-loading', on);
        submit.disabled = on;
        submit.setAttribute('aria-busy', on ? 'true' : 'false');
      }

      Object.keys(rules).forEach(function (name) {
        var input = field(name);
        if (!input) return;
        input.addEventListener('blur', function () { if (input.value.trim()) validate(name); });
        input.addEventListener('input', function () { if (input.getAttribute('aria-invalid') === 'true') validate(name); });
        input.addEventListener('change', function () { if (input.tagName === 'SELECT') validate(name); });
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var firstInvalid = null;
        Object.keys(rules).forEach(function (name) {
          if (validate(name) && !firstInvalid) firstInvalid = field(name);
        });
        if (firstInvalid) {
          firstInvalid.focus();
          return;
        }
        // Honeypot: real visitors never fill this hidden field.
        var hp = field('website');
        if (hp && hp.value) { showStatus('success', 'Thank you!', 'Your enquiry has been received.'); form.reset(); return; }

        setLoading(true);
        var data = new FormData(form);
        var phone = normalisePhone(field('phone').value);
        if (phone) data.set('phone', phone);

        fetch(form.getAttribute('action'), {
          method: 'POST',
          body: data,
          headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
        }).then(function (res) {
          return res.json().catch(function () { return { ok: false, message: '' }; }).then(function (json) {
            return { http: res.ok, json: json };
          });
        }).then(function (r) {
          if (r.http && r.json && (r.json.ok || r.json.ok === undefined)) {
            showStatus('success', 'Thank you, your enquiry has been sent.', r.json.message || 'Our team will get back to you shortly.');
            form.reset();
            $$('.is-valid', form).forEach(function (el) { el.classList.remove('is-valid'); });
            if (started) started.value = String(Date.now());
            return;
          }
          if (r.json && r.json.errors) {
            Object.keys(r.json.errors).forEach(function (k) { setError(k, r.json.errors[k]); });
          }
          showStatus('error', 'Your enquiry could not be sent.', (r.json && r.json.message) || 'Please try again, or reach us directly on WhatsApp or phone.');
        }).catch(function () {
          showStatus('error', 'Connection problem.', 'We could not reach the server. Please check your connection, or contact us on WhatsApp or phone.');
        }).then(function () { setLoading(false); });
      });

      // Pre-fill from links such as contact.html?service=industrial-hvac&location=Kolkata
      var params = new URLSearchParams(window.location.search);
      var svc = params.get('service');
      var loc = params.get('location');
      if (svc && field('service')) {
        var opt = $('option[value="' + svc.replace(/"/g, '') + '"]', field('service'));
        if (opt) field('service').value = svc;
      }
      if (loc && field('message') && !field('message').value) {
        field('message').value = 'Location: ' + loc.slice(0, 40) + '\n';
      }
      if (params.get('enquiry') === 'sent') showStatus('success', 'Thank you, your enquiry has been sent.', 'Our team will get back to you shortly.');
      if (params.get('enquiry') === 'error') showStatus('error', 'Your enquiry could not be sent.', 'Please try again, or reach us directly on WhatsApp or phone.');
    });
  }

  /* ------------------------------------------------------------------
     9. AOS (declarative reveals) with a safety net
     ------------------------------------------------------------------ */
  function initAOS() {
    if (!window.AOS) { root.classList.add('no-aos'); return; }
    window.AOS.init({
      duration: 850,
      easing: 'ease-out-cubic',
      once: true,
      offset: 40,
      disable: function () { return reduceMotion.matches; }
    });
  }

  onReady(function () {
    initHeader();
    initMobileMenu();
    initAnchors();
    initSectionNav();
    initBackToTop();
    initGallery();
    initTestimonials();
    initLocations();
    initForms();
    initAOS();
  });
})();
