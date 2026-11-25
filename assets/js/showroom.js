/* AutoCom showroom — cart, compare, search suggestions, laptop finder, workspaces.
   Data comes only from /catalog.json (publicly visible catalogue). No third-party code. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var BASE = root.getAttribute('data-base') || '';
  var STATIC = root.getAttribute('data-static') === '1';
  var MAX_COMPARE = 3, MAX_CART_LINES = 30;

  function href(path) {
    if (!STATIC) return BASE + path;
    var q = '', i = path.indexOf('?');
    if (i >= 0) { q = path.slice(i); path = path.slice(0, i); }
    if (!/\.[a-z0-9]+$/i.test(path) && path.slice(-1) !== '/') path += '/';
    return BASE + path + q;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function kes(n) { return 'KES ' + Math.round(n).toLocaleString('en-KE'); }
  function store(key, val) {
    try {
      if (val === undefined) { return JSON.parse(localStorage.getItem(key) || 'null'); }
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { store.mem = store.mem || {}; if (val === undefined) return store.mem[key] || null; store.mem[key] = val; }
  }

  /* ---------- Catalogue ---------- */
  var catalogPromise = null;
  function catalog() {
    if (!catalogPromise) {
      catalogPromise = fetch(href('/catalog.json'), { credentials: 'same-origin' })
        .then(function (r) { if (!r.ok) throw new Error('catalog'); return r.json(); })
        .then(function (d) { var map = {}; d.products.forEach(function (p) { map[p.id] = p; }); return { list: d.products, byId: map }; })
        .catch(function () { return { list: [], byId: {} }; });
    }
    return catalogPromise;
  }
  function img(p) { return p.image ? href(p.image).replace(/\/$/, '') : ''; }

  /* ---------- Toast ---------- */
  var toastEl = document.getElementById('toast'), toastTimer;
  function toast(html) {
    if (!toastEl) return;
    toastEl.innerHTML = html;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 3600);
  }

  /* ---------- Cart ---------- */
  function cart() { var c = store('ac_cart'); return c && typeof c === 'object' ? c : {}; }
  function saveCart(c) { store('ac_cart', c); paintCounts(); }
  function addToCart(id, qty, name, silent) {
    var c = cart(); id = String(id);
    if (!c[id] && Object.keys(c).length >= MAX_CART_LINES) { toast('Your cart is full (30 products). Please send this request first.'); return; }
    c[id] = Math.min(99, (c[id] || 0) + (qty || 1));
    saveCart(c);
    if (!silent) toast('Added ' + esc(name || 'item') + ' <a href="' + esc(href('/cart')) + '">View cart</a>');
  }
  function paintCounts() {
    var units = 0, c = cart(); Object.keys(c).forEach(function (k) { units += c[k]; });
    document.querySelectorAll('[data-cart-count]').forEach(function (b) { b.textContent = units; b.hidden = !units; });
    document.querySelectorAll('[data-cart-link]').forEach(function (a) { a.setAttribute('aria-label', 'Cart, ' + units + ' item' + (units === 1 ? '' : 's')); });
    var n = compareIds().length;
    document.querySelectorAll('[data-compare-count]').forEach(function (b) { b.textContent = n; b.hidden = !n; });
    document.querySelectorAll('[data-compare-link]').forEach(function (a) { a.setAttribute('aria-label', 'Compare, ' + n + ' selected'); });
  }

  /* ---------- Compare ---------- */
  function compareIds() { var c = store('ac_compare'); return Array.isArray(c) ? c.map(String).slice(0, MAX_COMPARE) : []; }
  function setCompare(ids) { store('ac_compare', ids.slice(0, MAX_COMPARE)); paintCompare(); paintCounts(); renderTray(); }
  function toggleCompare(id) {
    id = String(id); var ids = compareIds(), i = ids.indexOf(id);
    if (i >= 0) { ids.splice(i, 1); }
    else if (ids.length >= MAX_COMPARE) { toast('You can compare up to three products. Remove one first.'); return; }
    else { ids.push(id); }
    setCompare(ids);
  }
  function paintCompare() {
    var ids = compareIds();
    document.querySelectorAll('[data-compare]').forEach(function (b) {
      var on = ids.indexOf(b.getAttribute('data-compare')) >= 0;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      var l = b.querySelector('[data-compare-label]'); if (l) l.textContent = on ? 'Added to compare' : 'Add to compare';
    });
  }
  var tray = document.getElementById('cmp-tray');
  function renderTray() {
    if (!tray || document.querySelector('[data-compare-page]')) return;
    var ids = compareIds();
    document.body.classList.toggle('has-tray', ids.length > 0);
    if (!ids.length) { tray.classList.remove('is-open'); setTimeout(function () { if (!compareIds().length) tray.hidden = true; }, 350); return; }
    catalog().then(function (cat) {
      var html = '<div class="slots">';
      for (var i = 0; i < MAX_COMPARE; i++) {
        var p = cat.byId[ids[i]];
        html += p ? '<div class="slot">' + (p.image ? '<img src="' + esc(img(p)) + '" alt="">' : '') + '<span>' + esc(p.name) + '</span><button type="button" data-tray-remove="' + p.id + '" aria-label="Remove ' + esc(p.name) + ' from comparison">✕</button></div>'
                  : '<div class="slot empty">Add a product</div>';
      }
      html += '</div><a class="btn btn-sm" href="' + esc(href('/compare?ids=' + ids.join(','))) + '"' + (ids.length < 2 ? ' aria-disabled="true" tabindex="-1"' : '') + '>Compare ' + ids.length + '</a>';
      tray.innerHTML = html; tray.hidden = false;
      requestAnimationFrame(function () { tray.classList.add('is-open'); });
    });
  }

  /* ---------- Delegated clicks ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-cart-add],[data-compare],[data-tray-remove],[data-ws-add],[data-qty],[data-remove]');
    if (!t) return;
    if (t.hasAttribute('data-cart-add')) { addToCart(t.getAttribute('data-cart-add'), 1, t.getAttribute('data-name')); }
    else if (t.hasAttribute('data-compare')) { toggleCompare(t.getAttribute('data-compare')); }
    else if (t.hasAttribute('data-tray-remove')) { toggleCompare(t.getAttribute('data-tray-remove')); }
    else if (t.hasAttribute('data-ws-add')) {
      var card = t.closest('[data-workspace]'), n = 0;
      card.querySelectorAll('[data-ws-item]').forEach(function (li) {
        var cb = li.querySelector('[data-ws-toggle]');
        if (!cb || cb.checked) { addToCart(li.getAttribute('data-id'), parseInt(li.getAttribute('data-qty'), 10) || 1, '', true); n++; }
      });
      toast(n ? 'Added ' + n + ' product' + (n === 1 ? '' : 's') + ' to your cart <a href="' + esc(href('/cart')) + '">View cart</a>' : 'Tick at least one product first.');
    }
  });

  /* ---------- Workspaces: live totals ---------- */
  function wsTotals(card) {
    var total = 0, unpriced = 0, any = 0;
    card.querySelectorAll('[data-ws-item]').forEach(function (li) {
      var cb = li.querySelector('[data-ws-toggle]'); if (cb && !cb.checked) return;
      any++; var p = li.getAttribute('data-price'), q = parseInt(li.getAttribute('data-qty'), 10) || 1;
      if (p) total += parseFloat(p) * q; else unpriced++;
    });
    card.querySelector('[data-ws-total]').textContent = total > 0 ? kes(total) : (any ? 'Price on request' : 'Nothing selected');
    card.querySelector('[data-ws-note]').textContent = unpriced ? unpriced + ' item' + (unpriced === 1 ? '' : 's') + ' priced on request' : (any ? 'Total for listed prices' : '');
  }
  document.querySelectorAll('[data-workspace]').forEach(function (card) {
    card.addEventListener('change', function (e) { if (e.target.matches('[data-ws-toggle]')) wsTotals(card); });
  });

  /* ---------- Search suggestions ---------- */
  document.querySelectorAll('form[data-suggest]').forEach(function (form) {
    var input = form.querySelector('input[type=search]'), list = form.querySelector('.search-suggest'), active = -1, items = [];
    if (!input || !list) return;
    function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; }
    function mark() {
      items.forEach(function (a, i) { a.setAttribute('aria-selected', i === active ? 'true' : 'false'); });
      if (active >= 0) input.setAttribute('aria-activedescendant', items[active].id); else input.removeAttribute('aria-activedescendant');
    }
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      if (q.length < 2) { close(); return; }
      catalog().then(function (cat) {
        var terms = q.split(/\s+/);
        var hits = cat.list.filter(function (p) {
          var hay = (p.name + ' ' + (p.brand || '') + ' ' + (p.model || '') + ' ' + (p.category_name || '')).toLowerCase();
          return terms.every(function (t) { return hay.indexOf(t) >= 0; });
        }).slice(0, 6);
        var base = list.id;
        list.innerHTML = hits.map(function (p, i) {
          return '<li role="presentation"><a role="option" id="' + base + '-' + i + '" href="' + esc(href('/product/' + p.slug)) + '">' + (p.image ? '<img src="' + esc(img(p)) + '" alt="">' : '<span class="ph"></span>') + '<span>' + esc(p.name) + '<small>' + esc([p.brand, p.category_name].filter(Boolean).join(' · ')) + '</small></span></a></li>';
        }).join('') + '<li role="presentation"><a role="option" class="all" id="' + base + '-all" href="' + esc(href('/shop?q=' + encodeURIComponent(input.value.trim()))) + '">' + (hits.length ? 'See all results' : 'No quick matches — search all products') + '</a></li>';
        items = Array.prototype.slice.call(list.querySelectorAll('a')); active = -1;
        list.hidden = false; input.setAttribute('aria-expanded', 'true');
      });
    });
    input.addEventListener('keydown', function (e) {
      if (list.hidden) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(items.length - 1, active + 1); mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(-1, active - 1); mark(); }
      else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); location.href = items[active].href; }
      else if (e.key === 'Escape') { close(); }
    });
    document.addEventListener('click', function (e) { if (!form.contains(e.target)) close(); });
  });

  /* ---------- Shared product card (client-rendered lists) ---------- */
  function card(p, note) {
    var hl = [];
    if (p.processor) hl.push(p.processor);
    if (p.ram_gb) hl.push(p.ram_gb + 'GB RAM');
    if (p.storage_gb) hl.push(p.storage_gb + 'GB ' + (p.storage_type || ''));
    var price = p.price != null ? '<strong>' + kes(p.price) + '</strong>' : '<span class="req">Price on request</span>';
    return '<article class="p-card"><a class="p-media" href="' + esc(href('/product/' + p.slug)) + '" tabindex="-1" aria-hidden="true">' +
      (p.image ? '<img src="' + esc(img(p)) + '" alt="" width="600" height="510" loading="lazy">' : '<span class="placeholder-art"><small>Photo coming soon</small></span>') +
      '<span class="badges">' + (p.demo ? '<span class="pill pill-demo">Demo</span>' : '') + (note ? '<span class="pill">' + esc(note) + '</span>' : '') + '</span></a>' +
      '<div class="p-body">' + (p.brand ? '<p class="p-brand">' + esc(p.brand) + '</p>' : '') +
      '<h3 class="p-title"><a href="' + esc(href('/product/' + p.slug)) + '">' + esc(p.name) + '</a></h3>' +
      (p.model ? '<p class="p-model">Model ' + esc(p.model) + '</p>' : '') +
      (hl.length ? '<ul class="p-hl">' + hl.map(function (h) { return '<li>' + esc(h) + '</li>'; }).join('') + '</ul>' : '') +
      '<div class="p-foot"><div class="p-meta-row"><p class="p-price">' + price + '</p><button type="button" class="cmp-toggle" data-compare="' + p.id + '" aria-pressed="false"><span class="box" aria-hidden="true"></span>Compare<span class="sr-only"> ' + esc(p.name) + '</span></button></div>' +
      '<p class="product-stock p-stock stock-' + esc(p.availability) + '">' + esc(p.availability_label) + '</p>' +
      '<div class="p-actions"><a class="btn btn-ghost grow" href="' + esc(href('/product/' + p.slug)) + '">Details</a><button type="button" class="btn btn-primary grow" data-cart-add="' + p.id + '" data-name="' + esc(p.name) + '"' + (p.availability === 'out_of_stock' ? ' disabled' : '') + '>' + (p.price != null ? 'Add to cart' : 'Add to request') + '</button></div></div></div></article>';
  }

  /* ---------- Laptop finder ---------- */
  var finder = document.querySelector('[data-finder]');
  if (finder) {
    var form = finder.querySelector('form');
    function cpuRank(s) { var m = /\bi([3579])\b|core\s*i([3579])/i.exec(s || ''); return m ? parseInt(m[1] || m[2], 10) : null; }
    function run() {
      catalog().then(function (cat) {
        var f = new FormData(form), use = f.get('use'), min = parseFloat(f.get('min')) || 0, max = parseFloat(f.get('max')) || 0,
            brand = f.get('brand'), cpu = f.get('cpu') ? parseInt(f.get('cpu').slice(1), 10) : 0, ram = parseInt(f.get('ram'), 10) || 0,
            st = parseInt(f.get('storage'), 10) || 0, ssd = !!f.get('ssd');
        var matches = [], maybe = [];
        cat.list.filter(function (p) { return p.category === 'laptops'; }).forEach(function (p) {
          var unknown = false, fail = false;
          function check(known, ok) { if (!known) unknown = true; else if (!ok) fail = true; }
          if (use) check(p.uses.length > 0, p.uses.indexOf(use) >= 0);
          if (min || max) check(p.price != null, (!min || p.price >= min) && (!max || p.price <= max));
          if (brand) check(!!p.brand, p.brand === brand);
          if (cpu) { var r = cpuRank(p.processor); check(r != null, r >= cpu); }
          if (ram) check(p.ram_gb != null, p.ram_gb >= ram);
          if (st) check(p.storage_gb != null, p.storage_gb >= st);
          if (ssd) check(!!p.storage_type, /ssd/i.test(p.storage_type));
          if (fail) return;
          (unknown ? maybe : matches).push(p);
        });
        matches.sort(function (a, b) { return (a.price == null) - (b.price == null) || (a.price || 0) - (b.price || 0); });
        finder.querySelector('[data-finder-title]').textContent = matches.length ? matches.length + ' laptop' + (matches.length === 1 ? '' : 's') + ' match' + (matches.length === 1 ? 'es' : '') + ' your choices' : 'No exact matches in the catalogue yet';
        finder.querySelector('[data-finder-results]').innerHTML = matches.map(function (p) { return card(p, 'Match'); }).join('');
        var mb = finder.querySelector('[data-finder-maybe]');
        mb.hidden = !maybe.length;
        finder.querySelector('[data-finder-maybe-list]').innerHTML = maybe.map(function (p) { return card(p, 'Specs to confirm'); }).join('');
        paintCompare();
      });
    }
    form.addEventListener('change', run);
    form.addEventListener('input', function (e) { if (e.target.type === 'number') run(); });
    form.addEventListener('reset', function () { setTimeout(run, 0); });
    form.addEventListener('submit', function (e) { e.preventDefault(); run(); });
    run();
  }

  /* ---------- Compare page ---------- */
  var cmpPage = document.querySelector('[data-compare-page]');
  if (cmpPage) {
    var fromUrl = (new URLSearchParams(location.search).get('ids') || '').split(',').filter(function (x) { return /^\d+$/.test(x); });
    if (fromUrl.length) store('ac_compare', fromUrl.slice(0, MAX_COMPARE));
    var out = cmpPage.querySelector('[data-cmp-out]'), diffOnly = cmpPage.querySelector('[data-cmp-diff]');
    function renderCompare() {
      catalog().then(function (cat) {
        var ps = compareIds().map(function (id) { return cat.byId[id]; }).filter(Boolean);
        if (ps.length < 2) {
          out.innerHTML = '<div class="empty-state"><h2>' + (ps.length ? 'Add one more product' : 'Nothing to compare yet') + '</h2><p class="muted">Tick “Compare” on two or three products, then come back here.</p><a class="btn btn-primary" href="' + esc(href('/shop')) + '">Browse products</a></div>';
          if (ps.length) out.innerHTML += '<div class="p-grid cols-3">' + ps.map(function (p) { return card(p); }).join('') + '</div>';
          paintCompare(); return;
        }
        var rows = [
          ['Price', function (p) { return p.price != null ? kes(p.price) : 'On request'; }],
          ['Availability', function (p) { return p.availability_label; }],
          ['Brand', function (p) { return p.brand; }], ['Model', function (p) { return p.model; }], ['Category', function (p) { return p.category_name; }],
          ['Processor', function (p) { return p.processor; }], ['Memory', function (p) { return p.ram_gb ? p.ram_gb + 'GB' : ''; }],
          ['Storage', function (p) { return p.storage_gb ? p.storage_gb + 'GB ' + (p.storage_type || '') : ''; }],
          ['Screen', function (p) { return p.screen_in ? p.screen_in + '″' : ''; }],
          ['Good for', function (p) { return p.uses.join(', '); }]
        ];
        var keys = [];
        ps.forEach(function (p) { p.specs.forEach(function (s) { if (s[0] && keys.indexOf(s[0]) < 0 && !/^(brand|model|processor|memory|storage)$/i.test(s[0])) keys.push(s[0]); }); });
        keys.forEach(function (k) { rows.push([k, function (p) { var v = ''; p.specs.forEach(function (s) { if (s[0] === k) v = s[1]; }); return v; }]); });
        var html = '<div class="cmp-wrap"><table class="cmp-table"><caption class="sr-only">Comparison of ' + ps.length + ' products</caption><thead><tr><th scope="col"><span class="sr-only">Feature</span></th>' +
          ps.map(function (p) {
            return '<th scope="col" class="cmp-head">' + (p.image ? '<img src="' + esc(img(p)) + '" alt="" loading="lazy">' : '') + '<b><a href="' + esc(href('/product/' + p.slug)) + '">' + esc(p.name) + '</a></b>' +
              '<div class="p-actions"><button type="button" class="btn btn-primary btn-sm" data-cart-add="' + p.id + '" data-name="' + esc(p.name) + '">Add</button><button type="button" class="btn btn-ghost btn-sm" data-tray-remove="' + p.id + '">Remove<span class="sr-only"> ' + esc(p.name) + '</span></button></div></th>';
          }).join('') + '</tr></thead><tbody>';
        rows.forEach(function (r) {
          var vals = ps.map(function (p) { return r[1](p) || ''; });
          if (vals.every(function (v) { return v === ''; })) return;
          var same = vals.every(function (v) { return v === vals[0]; });
          if (diffOnly.checked && same) return;
          html += '<tr' + (!same ? ' class="diff"' : '') + '><th scope="row">' + esc(r[0]) + '</th>' + vals.map(function (v) { return '<td>' + (v ? esc(v) : '<span class="muted">Ask us</span>') + '</td>'; }).join('') + '</tr>';
        });
        out.innerHTML = html + '</tbody></table></div>';
      });
    }
    diffOnly.addEventListener('change', renderCompare);
    document.addEventListener('click', function (e) { if (e.target.closest('[data-tray-remove]')) setTimeout(renderCompare, 0); });
    renderCompare();
  }

  /* ---------- Cart page ---------- */
  var cartPage = document.querySelector('[data-cart-page]');
  if (document.querySelector('[data-cart-clear]')) { saveCart({}); }
  if (cartPage) {
    var waBase = cartPage.getAttribute('data-wa') || '';
    function renderCart() {
      catalog().then(function (cat) {
        var c = cart(), ids = Object.keys(c).filter(function (id) { return cat.byId[id]; });
        if (ids.length !== Object.keys(c).length) { var cc = {}; ids.forEach(function (id) { cc[id] = c[id]; }); c = cc; saveCart(c); }
        var empty = !ids.length;
        cartPage.querySelector('[data-cart-empty]').hidden = !empty;
        cartPage.querySelector('[data-cart-summary]').hidden = empty;
        cartPage.querySelector('[data-cart-continue]').hidden = empty;
        var total = 0, unpriced = 0, units = 0, lines = [];
        cartPage.querySelector('[data-cart-lines]').innerHTML = ids.map(function (id) {
          var p = cat.byId[id], q = c[id]; units += q;
          if (p.price != null) total += p.price * q; else unpriced++;
          lines.push(q + ' × ' + p.name + (p.model ? ' (' + p.model + ')' : ''));
          return '<li>' + (p.image ? '<img src="' + esc(img(p)) + '" alt="" loading="lazy">' : '<span class="ph"></span>') +
            '<div class="nm"><a href="' + esc(href('/product/' + p.slug)) + '">' + esc(p.name) + '</a><small>' + esc([p.brand, p.model ? 'Model ' + p.model : ''].filter(Boolean).join(' · ')) + '</small><small>' + (p.price != null ? kes(p.price) + ' each' : 'Price on request') + ' · ' + esc(p.availability_label) + '</small></div>' +
            '<div class="cart-line-end"><div class="qty-ctl" role="group" aria-label="Quantity for ' + esc(p.name) + '"><button type="button" data-qty="-1" data-id="' + id + '" aria-label="Decrease quantity">−</button><output aria-live="polite">' + q + '</output><button type="button" data-qty="1" data-id="' + id + '" aria-label="Increase quantity">+</button></div>' +
            '<button type="button" class="linklike tiny" data-remove="' + id + '">' + 'Remove<span class="sr-only"> ' + esc(p.name) + '</span></button></div></li>';
        }).join('');
        cartPage.querySelector('[data-cart-heading]').textContent = units + ' item' + (units === 1 ? '' : 's');
        cartPage.querySelector('[data-cart-units]').textContent = units;
        cartPage.querySelector('[data-cart-total]').textContent = total > 0 ? kes(total) : '—';
        cartPage.querySelector('[data-cart-note]').textContent = unpriced ? unpriced + ' product' + (unpriced === 1 ? ' is' : 's are') + ' priced on request — the shop will confirm the final total before you pay.' : 'Prices are confirmed by the shop before you pay. Delivery, if needed, is quoted separately.';
        cartPage.querySelector('[data-cart-items]').value = JSON.stringify(ids.map(function (id) { return { id: parseInt(id, 10), qty: c[id] }; }));
        var wa = cartPage.querySelector('[data-cart-wa]');
        if (waBase && lines.length) { wa.href = waBase + encodeURIComponent('Hello, I would like to order:\n' + lines.join('\n')); wa.hidden = false; } else { wa.hidden = true; }
      });
    }
    cartPage.addEventListener('click', function (e) {
      var q = e.target.closest('[data-qty]'), r = e.target.closest('[data-remove]'), c = cart();
      if (q) { var id = q.getAttribute('data-id'); c[id] = Math.max(1, Math.min(99, (c[id] || 1) + parseInt(q.getAttribute('data-qty'), 10))); saveCart(c); renderCart(); }
      if (r) { delete c[r.getAttribute('data-remove')]; saveCart(c); renderCart(); }
    });
    var co = cartPage.querySelector('[data-checkout]');
    if (co) co.addEventListener('submit', function (e) { if (!Object.keys(cart()).length) { e.preventDefault(); toast('Your cart is empty.'); } }, true);
    renderCart();
  }

  paintCounts(); paintCompare(); renderTray();
  window.addEventListener('storage', function () { paintCounts(); paintCompare(); renderTray(); });
})();
