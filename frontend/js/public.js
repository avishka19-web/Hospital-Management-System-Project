// Shared header/footer for public pages.
(function () {
  const { esc } = UI;
  const NAV = [['index.html', 'Home'], ['about.html', 'About'], ['doctors.html', 'Doctors'], ['departments.html', 'Departments'], ['contact.html', 'Contact']];

  window.Site = {
    logo() { return `<span class="brand-mark"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3z" fill="#fff"/></svg></span>`; },
    bookUrl(doctorId) {
      const u = Auth.token() && Auth.user();
      const target = 'patient/book-appointment.html' + (doctorId ? '?doctor=' + doctorId : '');
      if (u && u.role === 'patient') return target;
      return 'login.html?redirect=' + encodeURIComponent(UI.abs(target));
    },
    init(active) {
      const u = Auth.token() ? Auth.user() : null;
      const links = NAV.map(([h, t]) => `<a href="${h}" class="${h === active ? 'active' : ''}">${t}</a>`).join('');
      const actions = u
        ? `<a class="btn btn-primary btn-sm" href="${Auth.home(u.role)}">Dashboard</a><button class="btn btn-outline btn-sm" id="siteLogout">Log out</button>`
        : `<a class="btn btn-ghost btn-sm" href="login.html">Log in</a><a class="btn btn-primary btn-sm" href="register.html">Register</a>`;
      document.getElementById('site-header').innerHTML = `
        <div class="topstrip"><div class="container"><span><i class="fa-solid fa-phone-volume"></i>Emergency 24x7: <a href="tel:+912240001099">+91 22 4000 1099</a></span><span><i class="fa-regular fa-clock"></i>OPD: Mon-Sat, 9:00 AM - 5:00 PM</span></div></div>
        <header class="site-header" id="siteHeader"><div class="container">
          <a class="brand" href="index.html">${Site.logo()}<span>Meridian<small>General Hospital</small></span></a>
          <nav class="nav-links" aria-label="Main">${links}</nav>
          <div class="nav-actions">${actions}</div>
          <button class="icon-btn nav-toggle" id="navToggle" aria-label="Toggle menu"><i class="fa-solid fa-bars"></i></button>
        </div></header>`;
      document.getElementById('navToggle').onclick = () => document.getElementById('siteHeader').classList.toggle('open');
      const lo = document.getElementById('siteLogout');
      if (lo) lo.onclick = () => Auth.logout();
      document.querySelectorAll('img[data-img]').forEach((i) => { i.referrerPolicy = 'no-referrer'; i.src = window.IMG[i.dataset.img] || UI.fallback(i.alt); });

      document.getElementById('site-footer').innerHTML = `
        <footer class="site-footer"><div class="container">
          <div class="cols">
            <div><a class="brand" href="index.html">${Site.logo()}<span>Meridian<small>General Hospital</small></span></a><p>Compassionate, evidence-based care for every family, backed by specialists across eight departments.</p>
              <div class="social"><a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><i class="fa-brands fa-facebook-f"></i></a><a href="https://www.x.com" target="_blank" rel="noopener noreferrer" aria-label="X"><i class="fa-brands fa-x-twitter"></i></a><a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i class="fa-brands fa-instagram"></i></a><a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i class="fa-brands fa-linkedin-in"></i></a></div></div>
            <div><h5>Hospital</h5><a href="about.html">About us</a><a href="doctors.html">Our doctors</a><a href="departments.html">Departments</a><a href="contact.html">Contact</a></div>
            <div><h5>Patients</h5><a href="${esc(Site.bookUrl())}">Book an appointment</a><a href="login.html">Patient login</a><a href="register.html">Create account</a></div>
            <div><h5>Contact</h5><a href="https://www.google.com/maps?q=Andheri+East+Mumbai" target="_blank" rel="noopener noreferrer">42 Wellness Avenue, Andheri East, Mumbai 400069</a><a href="tel:+912240001000">+91 22 4000 1000</a><a href="mailto:care@meridian-hospital.example">care@meridian-hospital.example</a></div>
          </div>
          <div class="legal"><span>© ${new Date().getFullYear()} Meridian General Hospital. Demonstration project with synthetic data.</span><span>Not a certified medical records system.</span></div>
        </div></footer>`;
    }
  };
})();
