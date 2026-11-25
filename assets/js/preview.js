/* Static preview helpers (GitHub Pages has no PHP):
   - client-side search / brand / availability / sort on listing pages
   - forms that would POST to the server show a friendly "preview" notice instead */
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);

  // Listing pages: filter + sort the rendered cards.
  var grid = document.querySelector('.listing-main .p-grid');
  if (grid) {
    var q = (params.get('q') || '').trim().toLowerCase();
    var brand = params.get('brand') || '';
    var avail = params.get('availability') || '';
    var sort = params.get('sort') || 'newest';
    var use = params.get('use') || '';
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.p-card'));
    var terms = q ? q.split(/\s+/) : [];
    var shown = 0;
    cards.forEach(function (c) {
      var ok = terms.every(function (t) { return c.dataset.name.indexOf(t) !== -1; });
      if (brand && c.dataset.brand !== brand) ok = false;
      if (use && (',' + (c.dataset.uses || '') + ',').indexOf(',' + use + ',') === -1) ok = false;
      if (avail === 'in_stock' && ['in_stock', 'limited'].indexOf(c.dataset.availability) === -1) ok = false;
      c.hidden = !ok;
      if (ok) shown++;
    });
    var key = { name: function (c) { return c.dataset.title.toLowerCase(); } };
    if (sort === 'name') cards.sort(function (a, b) { return key.name(a) < key.name(b) ? -1 : 1; });
    cards.forEach(function (c) { grid.appendChild(c); });
    document.querySelectorAll('#sort option').forEach(function (o) { o.selected = o.value === sort; });
    document.querySelectorAll('#f-brand option').forEach(function (o) { o.selected = o.value === brand; });
    var cb = document.querySelector('input[name="availability"]'); if (cb) cb.checked = avail === 'in_stock';
    document.querySelectorAll('input[name="q"]').forEach(function (i) { i.value = params.get('q') || ''; });
    var count = document.querySelector('.result-count');
    if (count) count.textContent = shown + ' product' + (shown === 1 ? '' : 's');
    document.querySelectorAll('.quick-chips .chip').forEach(function (a) { var m = /[?&]use=([a-z]+)/.exec(a.getAttribute('href') || ''); a.classList.toggle('is-on', m ? m[1] === use : !use && /All purposes/.test(a.textContent)); });
    if (q) {
      var h = document.querySelector('.page-head h1'); if (h) h.textContent = 'Results for “' + params.get('q') + '”';
    }
    if (!shown) {
      var empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML = '<h2>No products match your search</h2><p class="muted">We may still be able to get it for you — ask us on WhatsApp.</p>';
      grid.parentNode.insertBefore(empty, grid.nextSibling);
    }
  }

  // Server forms are disabled in the static preview.
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if ((f.getAttribute('method') || '').toLowerCase() !== 'post') return;
    e.preventDefault();
    var note = f.querySelector('.preview-note');
    if (!note) {
      note = document.createElement('p');
      note.className = 'alert alert-info preview-note';
      note.setAttribute('role', 'status');
      note.textContent = 'Design preview: this form is not connected yet. On the live site it sends your request to AutoCom.';
      f.appendChild(note);
    }
  }, true);
})();
