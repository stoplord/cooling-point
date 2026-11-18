/* ==========================================================================
   M/S. Cooling Point: animations.js
   GSAP + ScrollTrigger choreography. Lightweight by design:
   - transforms/opacity only, one ScrollTrigger per element group
   - skipped entirely under prefers-reduced-motion
   - nothing is hidden before this script runs, so content never depends on it
   Hooks:
     data-split            heading words rise into view
     data-reveal[="left|right|fade|scale"]   element reveal
     data-reveal-stagger   reveal direct children in sequence
     data-reveal-img       clip-path image reveal
     data-parallax="0.15"  vertical parallax (fraction of element height)
     data-count="10"       animated counter (final value is already in the HTML)
     .cp-divider           line draws from the centre
     .cp-draw path         SVG stroke drawing
   SOURCE FILE: after editing, run `npm run build` to regenerate site.min.js
   ========================================================================== */
(function () {
  'use strict';

  var doc = document;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  function start() {
    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    // Reduced motion or GSAP unavailable: everything is already visible.
    if (reduce || !gsap) return;
    if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

    gsap.defaults({ ease: 'power3.out', duration: 1 });

    /* ---------- Split headings into words (keeps text accessible) ---------- */
    function splitWords(el) {
      if (el.__split) return el.__split;
      var words = [];
      var gradient = el.classList.contains('text-gradient');
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (child) {
          if (child.nodeType === 3) {
            var parts = child.textContent.split(/(\s+)/);
            var frag = doc.createDocumentFragment();
            parts.forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(part)); return; }
              var outer = doc.createElement('span');
              outer.className = 'cp-split-word';
              var inner = doc.createElement('span');
              inner.textContent = part;
              var inGradient = gradient || (child.parentNode.classList && child.parentNode.classList.contains('text-gradient'));
              if (inGradient) inner.className = 'text-gradient';
              outer.appendChild(inner);
              frag.appendChild(outer);
              words.push(inner);
            });
            child.parentNode.replaceChild(frag, child);
          } else if (child.nodeType === 1 && !child.classList.contains('cp-split-word')) {
            walk(child);
          }
        });
      })(el);
      // gradient now lives on each word; remove it from the wrappers to avoid double clipping
      $$('.text-gradient', el).forEach(function (n) { if (!n.parentNode.classList.contains('cp-split-word')) n.classList.remove('text-gradient'); });
      if (gradient) el.classList.remove('text-gradient');
      el.__split = words;
      return words;
    }

    /* ---------- 1. Hero: scroll parallax ----------
       (The entrance itself is pure CSS, see animations.css, so the headline
       paints without waiting for this script.) */
    var hero = doc.querySelector('.cp-hero, .cp-page-hero');
    if (hero && ScrollTrigger) {
      var media = hero.querySelector('.cp-hero__media, .cp-page-hero__media');
      if (media) {
        gsap.to(media, { yPercent: 14, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      }
      var content = hero.querySelector('.cp-hero__content');
      if (content) {
        gsap.to(content, { y: -60, opacity: 0.15, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom 20%', scrub: true } });
      }
    }

    if (!ScrollTrigger) return;

    /* ---------- 2. Section headings: word reveal ---------- */
    $$('[data-split]').forEach(function (el) {
      if (hero && hero.contains(el)) return;
      var words = splitWords(el);
      gsap.fromTo(words, { yPercent: 110 }, {
        yPercent: 0, duration: 1, stagger: 0.045, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });

    /* ---------- 3. Generic reveals ---------- */
    var from = {
      up: { y: 40, autoAlpha: 0 },
      left: { x: -50, autoAlpha: 0 },
      right: { x: 50, autoAlpha: 0 },
      fade: { autoAlpha: 0 },
      scale: { scale: 0.92, autoAlpha: 0 }
    };
    $$('[data-reveal]').forEach(function (el) {
      var type = el.getAttribute('data-reveal') || 'up';
      var vars = from[type] || from.up;
      gsap.from(el, Object.assign({}, vars, {
        duration: 1.1,
        delay: parseFloat(el.getAttribute('data-delay') || 0),
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      }));
    });
    $$('[data-reveal-stagger]').forEach(function (group) {
      var kids = Array.prototype.slice.call(group.children);
      gsap.from(kids, {
        y: 34, autoAlpha: 0, duration: 0.9, stagger: 0.1,
        scrollTrigger: { trigger: group, start: 'top 86%', once: true }
      });
    });

    /* ---------- 4. Image reveals (clip-path + inner zoom) ---------- */
    $$('[data-reveal-img]').forEach(function (wrap) {
      var img = wrap.querySelector('img');
      var dir = wrap.getAttribute('data-reveal-img') || 'up';
      var clipFrom = dir === 'left' ? 'inset(0% 100% 0% 0%)' : dir === 'right' ? 'inset(0% 0% 0% 100%)' : 'inset(100% 0% 0% 0%)';
      var tlImg = gsap.timeline({ scrollTrigger: { trigger: wrap, start: 'top 85%', once: true } });
      tlImg.fromTo(wrap, { clipPath: clipFrom }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut', clearProps: 'clipPath' });
      if (img) tlImg.fromTo(img, { scale: 1.3 }, { scale: 1, duration: 1.8, ease: 'expo.out', clearProps: 'transform' }, 0);
    });

    /* ---------- 5. Parallax ---------- */
    $$('[data-parallax]').forEach(function (el) {
      var amount = parseFloat(el.getAttribute('data-parallax')) || 0.15;
      gsap.fromTo(el, { yPercent: -amount * 50 }, {
        yPercent: amount * 50, ease: 'none',
        scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    /* ---------- 6. Counters (final value already in the markup) ---------- */
    $$('[data-count]').forEach(function (el) {
      var end = parseFloat(el.getAttribute('data-count'));
      if (isNaN(end)) return;
      var obj = { v: 0 };
      el.textContent = '0';
      gsap.to(obj, {
        v: end, duration: 2, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onUpdate: function () { el.textContent = String(Math.round(obj.v)); },
        onComplete: function () { el.textContent = String(end); }
      });
    });

    /* ---------- 7. Section dividers ---------- */
    $$('.cp-divider').forEach(function (d) {
      var line = d.querySelector('.cp-divider__line');
      var node = d.querySelector('.cp-divider__node');
      var t = gsap.timeline({ scrollTrigger: { trigger: d, start: 'top 92%', once: true } });
      if (line) t.fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 1.6, ease: 'expo.inOut' });
      if (node) t.fromTo(node, { scale: 0, rotate: -45 }, { scale: 1, rotate: 45, duration: 0.8, ease: 'back.out(2)' }, 0.4);
    });

    /* ---------- 8. SVG line drawing ---------- */
    $$('.cp-draw').forEach(function (svg) {
      var paths = $$('path, circle, line, polyline', svg).filter(function (p) { return typeof p.getTotalLength === 'function' && !p.classList.contains('cp-no-draw'); });
      paths.forEach(function (p) {
        var len = Math.ceil(p.getTotalLength());
        p.style.strokeDasharray = len + ' ' + len;
        p.style.strokeDashoffset = String(len);
      });
      gsap.to(paths, {
        strokeDashoffset: 0, duration: 2.4, stagger: 0.08, ease: 'power2.inOut',
        scrollTrigger: { trigger: svg.closest('section') || svg, start: 'top 75%', once: true },
        onComplete: function () { paths.forEach(function (p) { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; }); }
      });
    });

    /* ---------- 9. Map pins pop in ---------- */
    var pins = $$('.cp-map__pin');
    if (pins.length) {
      gsap.from(pins, {
        autoAlpha: 0, y: -14, duration: 0.7, stagger: 0.07, ease: 'back.out(2)',
        scrollTrigger: { trigger: '.cp-map', start: 'top 80%', once: true }
      });
    }

    /* Recalculate positions once fonts and lazy images have settled */
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }

  if (doc.readyState !== 'loading') start();
  else doc.addEventListener('DOMContentLoaded', start);
})();
