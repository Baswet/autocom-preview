/* AutoCom admin helpers: confirmation for destructive actions. */
(function () {
  'use strict';
  document.addEventListener('submit', function (e) {
    var f = e.target;
    var msg = f.getAttribute('data-confirm');
    var btn = e.submitter;
    if (btn && btn.hasAttribute('data-confirm')) msg = btn.getAttribute('data-confirm');
    if (msg && !window.confirm(msg)) e.preventDefault();
  }, true);
})();
