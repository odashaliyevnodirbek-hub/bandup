/**
 * BandUp — Shared Sidebar + Theme Toggle
 * Include this script at the bottom of every page's <body>.
 * It will:
 *  1. Inject the sidebar HTML
 *  2. Mark the active nav item based on current page
 *  3. Load user info from Supabase
 *  4. Handle dark/light theme toggle
 *  5. Handle logout
 */

(function () {
  // ── MOCK USAGE ─────────────────────────────────────────
  function getMockUsage() {
    try { return parseInt(localStorage.getItem('bandup_mock_used') || '0'); } catch { return 0; }
  }
  const mockUsed = getMockUsage();
  const mockFreeTotal = 3;
  const mockLeft = mockFreeTotal - mockUsed;
  const mockBadge = mockLeft > 0
    ? `<span class="nav-free-badge">${mockLeft} free</span>`
    : `<span class="nav-pro">PRO</span>`;

  // ── SIDEBAR HTML ────────────────────────────────────────
  const sidebarHTML = `
  <aside class="sidebar" id="appSidebar">
    <div class="sidebar-logo"><a href="dashboard.html">Band<span>Up</span></a></div>
    <nav class="sidebar-nav">
      <div class="nav-section-label">Main</div>
      <a class="nav-item" href="dashboard.html"   data-page="dashboard">  <span class="icon">🏠</span> Dashboard</a>
      <a class="nav-item" href="mock.html"         data-page="mock">       <span class="icon">📋</span> Mock Test ${mockBadge}</a>
      <a class="nav-item" href="reading.html"      data-page="reading">    <span class="icon">📖</span> Reading</a>
      <a class="nav-item" href="ielts-platform.html" data-page="writing">  <span class="icon">✍️</span> Writing</a>
      <a class="nav-item" href="pricing-page.html" data-page="listening">  <span class="icon">🎧</span> Listening <span class="nav-pro">PRO</span></a>
      <a class="nav-item" href="pricing-page.html" data-page="speaking">   <span class="icon">🎤</span> Speaking  <span class="nav-pro">PRO</span></a>

      <div class="nav-section-label" style="margin-top:0.5rem">Explore</div>
      <a class="nav-item" href="recent.html"       data-page="recent">     <span class="icon">🆕</span> Recent</a>
      <a class="nav-item" href="articles.html"     data-page="articles">   <span class="icon">📰</span> Articles</a>
      <a class="nav-item" href="vocabulary.html"   data-page="vocabulary"> <span class="icon">📚</span> Vocabulary</a>

      <div class="nav-section-label" style="margin-top:0.5rem">Account</div>
      <a class="nav-item" href="pricing-page.html" data-page="upgrade">    <span class="icon">⭐</span> Upgrade</a>
      <a class="nav-item" href="#"                 data-page="settings">   <span class="icon">⚙️</span> Settings</a>
    </nav>
    <div class="sidebar-bottom">
      <div class="user-chip">
        <div class="avatar" id="sidebarAvatar">?</div>
        <div>
          <div class="user-name" id="sidebarName"><span class="skeleton" style="width:80px;height:12px">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div>
          <div class="user-plan">⭐ Free Plan</div>
        </div>
      </div>
      <button class="btn-logout" onclick="handleLogout()"><span>🚪</span> Log Out</button>
    </div>
  </aside>`;

  // ── INJECT SIDEBAR ──────────────────────────────────────
  document.body.insertAdjacentHTML('afterbegin', sidebarHTML);

  // ── MARK ACTIVE PAGE ────────────────────────────────────
  const page = location.pathname.split('/').pop().replace('.html','');
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    if (el.dataset.page === page) el.classList.add('active');
  });

  // ── THEME TOGGLE ────────────────────────────────────────
  function getTheme() {
    try { return localStorage.getItem('bandup_theme') || 'dark'; } catch { return 'dark'; }
  }
  function setTheme(theme) {
    try { localStorage.setItem('bandup_theme', theme); } catch {}
    if (theme === 'light') {
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
    }
    // Update all toggle buttons
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.textContent = theme === 'light' ? '🌙' : '☀️';
      btn.title = theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
    });
  }

  // Apply saved theme immediately
  setTheme(getTheme());

  // Expose toggle function globally
  window.toggleTheme = function () {
    const current = getTheme();
    setTheme(current === 'dark' ? 'light' : 'dark');
  };

  // ── INJECT THEME TOGGLE INTO TOPBAR ─────────────────────
  // Wait for DOM to be ready then find topbar-right and prepend toggle
  function injectThemeButton() {
    const topbarRight = document.querySelector('.topbar-right');
    if (topbarRight) {
      const btn = document.createElement('button');
      btn.className = 'theme-toggle';
      btn.onclick = window.toggleTheme;
      const theme = getTheme();
      btn.textContent = theme === 'light' ? '🌙' : '☀️';
      btn.title = theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
      topbarRight.prepend(btn);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectThemeButton);
  } else {
    injectThemeButton();
  }

  // ── LOAD USER ───────────────────────────────────────────
  async function loadSidebarUser() {
    // Wait for Supabase to be available
    if (typeof supabase === 'undefined' || typeof window._sbClient === 'undefined') {
      // Try to find the client on window
      await new Promise(r => setTimeout(r, 300));
    }
    const sb = window._sbClient;
    if (!sb) return;

    try {
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { location.href = 'login.html'; return; }
      const user = session.user;
      const meta = user.user_metadata || {};
      const firstName = meta.first_name || meta.full_name?.split(' ')[0] || user.email.split('@')[0];
      const fullName  = meta.full_name || firstName;
      const initials  = (firstName[0] || '').toUpperCase() + (meta.last_name?.[0] || '').toUpperCase();
      const nameEl = document.getElementById('sidebarName');
      const avatarEl = document.getElementById('sidebarAvatar');
      if (nameEl) nameEl.textContent = fullName;
      if (avatarEl) avatarEl.textContent = initials || firstName[0].toUpperCase();
    } catch(e) { console.warn('Sidebar user load failed:', e); }
  }

  // ── LOGOUT ──────────────────────────────────────────────
  window.handleLogout = async function () {
    const sb = window._sbClient;
    if (sb) await sb.auth.signOut();
    location.href = 'login.html';
  };

  // Run after page scripts have set up _sbClient
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(loadSidebarUser, 100));
  } else {
    setTimeout(loadSidebarUser, 100);
  }

})();
