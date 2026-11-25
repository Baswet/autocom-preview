/* AutoCom storefront — progressive enhancement only; every feature works without JS. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Sticky header border on scroll
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 4); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Mobile menu
  var toggle = document.querySelector('.menu-toggle');
  var mobileNav = document.getElementById('mobile-nav');
  if (toggle && mobileNav) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      toggle.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
      mobileNav.hidden = open;
      if (!open) { var s = mobileNav.querySelector('input'); if (s) s.focus(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !mobileNav.hidden) { mobileNav.hidden = true; toggle.setAttribute('aria-expanded', 'false'); toggle.focus(); }
    });
  }

  // Filter drawer (mobile)
  var drawer = document.querySelector('[data-drawer]');
  var openBtn = document.querySelector('.filters-open');
  if (drawer && openBtn) {
    var backdrop;
    var close = function () {
      drawer.classList.remove('is-open');
      openBtn.setAttribute('aria-expanded', 'false');
      if (backdrop) { backdrop.remove(); backdrop = null; }
      document.body.style.overflow = '';
      openBtn.focus();
    };
    openBtn.addEventListener('click', function () {
      drawer.classList.add('is-open');
      openBtn.setAttribute('aria-expanded', 'true');
      drawer.setAttribute('role', 'dialog');
      drawer.setAttribute('aria-modal', 'true');
      backdrop = document.createElement('div');
      backdrop.className = 'drawer-backdrop';
      backdrop.addEventListener('click', close);
      document.body.appendChild(backdrop);
      document.body.style.overflow = 'hidden';
      var f = drawer.querySelector('a, select, input, button'); if (f) f.focus();
    });
    drawer.querySelector('.filters-close').addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('is-open')) close(); });
  }

  // Auto-submit sort
  document.querySelectorAll('[data-autosubmit]').forEach(function (el) {
    el.addEventListener('change', function () { el.form.submit(); });
  });

  // Hero carousel: slow, pausable, keyboard accessible, respects reduced motion.
  var hero = document.querySelector('[data-carousel]');
  if (hero) {
    var slides = hero.querySelectorAll('.hero-slide');
    var dots = hero.querySelectorAll('.dot');
    if (slides.length > 1) {
      var i = 0, timer = null, paused = reduce;
      var pauseBtn = hero.querySelector('.hero-pause');
      var show = function (n) {
        slides[i].hidden = true; slides[i].classList.remove('is-active');
        dots[i].classList.remove('is-active'); dots[i].setAttribute('aria-selected', 'false');
        i = (n + slides.length) % slides.length;
        slides[i].hidden = false; slides[i].classList.add('is-active');
        dots[i].classList.add('is-active'); dots[i].setAttribute('aria-selected', 'true');
      };
      var start = function () { stop(); if (!paused) timer = setInterval(function () { show(i + 1); }, parseInt(hero.dataset.interval || '7000', 10)); };
      var stop = function () { if (timer) clearInterval(timer); timer = null; };
      hero.querySelector('.hero-next').addEventListener('click', function () { show(i + 1); start(); });
      hero.querySelector('.hero-prev').addEventListener('click', function () { show(i - 1); start(); });
      dots.forEach(function (d, n) { d.addEventListener('click', function () { show(n); start(); }); });
      var setPaused = function (p) { paused = p; pauseBtn.setAttribute('aria-pressed', String(p)); pauseBtn.setAttribute('aria-label', p ? 'Play slideshow' : 'Pause slideshow'); pauseBtn.firstElementChild.textContent = p ? '►' : '❚❚'; p ? stop() : start(); };
      pauseBtn.addEventListener('click', function () { setPaused(!paused); });
      hero.addEventListener('mouseenter', stop);
      hero.addEventListener('mouseleave', start);
      hero.addEventListener('focusin', stop);
      hero.addEventListener('focusout', start);
      setPaused(paused);
    }
  }

  // Product gallery
  var main = document.getElementById('gallery-main');
  if (main) {
    document.querySelectorAll('.thumb').forEach(function (t) {
      t.addEventListener('click', function () {
        main.src = t.dataset.src; main.alt = t.dataset.alt;
        document.querySelectorAll('.thumb').forEach(function (o) { o.classList.remove('is-active'); o.removeAttribute('aria-current'); });
        t.classList.add('is-active'); t.setAttribute('aria-current', 'true');
      });
    });
  }
})();
