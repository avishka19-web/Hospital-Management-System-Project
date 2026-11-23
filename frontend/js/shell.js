// Builds the sidebar + top bar for every dashboard page and guards access by role.
(function () {
  const { esc } = UI;
  const NAV = {
    admin: [
      ['dashboard', 'fa-gauge-high', 'Dashboard'], ['doctors', 'fa-user-doctor', 'Doctors'], ['patients', 'fa-users', 'Patients'],
      ['appointments', 'fa-calendar-check', 'Appointments'], ['departments', 'fa-building-columns', 'Departments & services'],
      ['reports', 'fa-chart-line', 'Reports'], ['messages', 'fa-envelope', 'Messages']
    ],
    doctor: [
      ['dashboard', 'fa-gauge-high', 'Dashboard'], ['appointments', 'fa-calendar-check', 'Appointments'],
      ['patients', 'fa-hospital-user', 'My patients'], ['profile', 'fa-clock', 'Profile & availability']
    ],
    patient: [
      ['dashboard', 'fa-gauge-high', 'Dashboard'], ['book-appointment', 'fa-calendar-plus', 'Book appointment'], ['appointments', 'fa-calendar-check', 'My appointments'],
      ['records', 'fa-file-medical', 'Records & prescriptions'], ['profile', 'fa-user', 'My profile']
    ]
  };

  window.Shell = {
    async mount({ role, active, title }) {
      const user = await Auth.require(role);
      if (!user) return new Promise(() => {}); // redirecting; stop the page script
      document.body.classList.add('dash');
      const links = NAV[role].map(([p, icon, label]) => `<a class="side-link ${p === active ? 'active' : ''}" href="${p}.html" ${p === active ? 'aria-current="page"' : ''}><i class="fa-solid ${icon}"></i>${label}</a>`).join('');
      const photo = user.doctor && user.doctor.photo;
      document.getElementById('shell').outerHTML = `
        <div class="shell">
          <aside class="sidebar" id="sidebar">
            <a class="brand" href="${window.ROOT}index.html">${Site.logo()}<span>Meridian<small>General Hospital</small></span></a>
            <div class="nav-group">${esc(UI.cap(role))} workspace</div>
            <nav>${links}</nav>
            <div class="side-user">
              <div class="who">${UI.avatar(user.name, photo)}<div style="min-width:0"><b>${esc(user.name)}</b><span>${esc(role)}</span></div></div>
              <a class="side-link" href="${window.ROOT}index.html" style="margin:0"><i class="fa-solid fa-globe"></i>View website</a>
              <button class="logout" id="logoutBtn"><i class="fa-solid fa-arrow-right-from-bracket"></i>Log out</button>
            </div>
          </aside>
          <div class="scrim" id="scrim"></div>
          <div class="main">
            <header class="topbar">
              <button class="icon-btn menu-btn" id="menuBtn" aria-label="Open menu"><i class="fa-solid fa-bars"></i></button>
              <h1>${esc(title)}</h1>
              <span class="date">${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </header>
            <main class="page" id="content"></main>
          </div>
        </div>`;
      document.title = `${title} · Meridian HMS`;
      const toggle = (open) => document.body.classList.toggle('nav-open', open);
      document.getElementById('menuBtn').onclick = () => toggle(true);
      document.getElementById('scrim').onclick = () => toggle(false);
      document.getElementById('logoutBtn').onclick = async () => { if (await UI.confirm({ title: 'Log out', message: 'You will need to sign in again to continue.', confirmText: 'Log out' })) Auth.logout(); };
      return { user, main: document.getElementById('content') };
    }
  };

  // Change-password card used on doctor and patient profile pages.
  Shell.passwordCard = (el) => {
    el.innerHTML = `<div class="card-head"><h3>Change password</h3></div><form class="card-pad" id="pwForm" novalidate>
      <div class="form-grid"><div class="field full"><label for="cp">Current password</label><input class="input" id="cp" type="password" autocomplete="current-password"></div>
      <div class="field"><label for="np">New password</label><input class="input" id="np" type="password" autocomplete="new-password"><div class="hint">At least 8 characters with a letter and a number.</div></div>
      <div class="field"><label for="cf">Confirm new password</label><input class="input" id="cf" type="password" autocomplete="new-password"></div></div>
      <button class="btn btn-navy" type="submit">Update password</button></form>`;
    const f = el.querySelector('#pwForm');
    f.onsubmit = async (e) => {
      e.preventDefault(); UI.formError(f);
      const b = { currentPassword: f.cp.value, newPassword: f.np.value, confirmPassword: f.cf.value };
      if (!b.currentPassword) return UI.formError(f, 'Enter your current password.');
      if (b.newPassword.length < 8 || !/[A-Za-z]/.test(b.newPassword) || !/\d/.test(b.newPassword)) return UI.formError(f, 'New password must be at least 8 characters and include a letter and a number.');
      if (b.newPassword !== b.confirmPassword) return UI.formError(f, 'New passwords do not match.');
      const btn = f.querySelector('button'); UI.busy(btn, true, 'Updating...');
      try { const r = await API.put('/auth/me/password', b); UI.toast(r.message); f.reset(); } catch (err) { UI.formError(f, err.message); }
      UI.busy(btn, false);
    };
  };
})();
