/* Aarambh — shared JS */
(function () {

  /* ── Mobile sidebar toggle ── */
  var sidebar  = document.getElementById('sidebar');
  var mobileBar = document.querySelector('.mobile-bar');
  var overlay   = document.getElementById('sidebar-overlay');
  var menuBtn   = mobileBar && mobileBar.querySelector('button[aria-label="Open menu"]');

  if (sidebar && mobileBar && overlay) {
    function openSidebar() {
      sidebar.classList.add('open');
      overlay.classList.add('visible');
      if (menuBtn) menuBtn.setAttribute('aria-expanded', 'true');
    }
    function closeSidebar() {
      sidebar.classList.remove('open');
      overlay.classList.remove('visible');
      if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false');
    }
    menuBtn && menuBtn.addEventListener('click', openSidebar);
    overlay.addEventListener('click', closeSidebar);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSidebar();
    });
  }

  /* ── Page entrance animation ── */
  var pageWrap = document.querySelector('.page-wrap');
  if (pageWrap) {
    pageWrap.style.opacity = '0';
    pageWrap.style.transform = 'translateY(12px)';
    pageWrap.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        pageWrap.style.opacity = '1';
        pageWrap.style.transform = 'translateY(0)';
      });
    });
  }

  /* ── Streak value (replace with backend data when ready) ── */
  var streakEl = document.getElementById('streak-value');
  if (streakEl) {
    var stored = localStorage.getItem('aarambh-streak');
    if (stored) streakEl.textContent = stored;
  }

})();