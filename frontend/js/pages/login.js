(() => {
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  if (params.get('expired')) $('expired').classList.remove('hidden');
  document.querySelectorAll('img[data-img]').forEach((i) => { i.src = IMG[i.dataset.img]; });

  const cached = Auth.token() && Auth.user();
  if (cached && !params.get('expired')) location.replace(Auth.home(cached.role));

  $('togglePw').onclick = () => {
    const p = $('password'); const show = p.type === 'password';
    p.type = show ? 'text' : 'password';
    $('togglePw').innerHTML = `<i class="fa-regular ${show ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
  };
  document.querySelectorAll('[data-demo]').forEach((b) => (b.onclick = () => {
    const [e, p] = b.dataset.demo.split('|');
    $('email').value = e; $('password').value = p; $('password').focus();
  }));

  $('forgot').onclick = (ev) => {
    ev.preventDefault();
    const m = UI.modal({
      title: 'Reset your password', size: 'sm',
      body: `<form id="fpForm" novalidate><p class="muted">Enter your account email. We will send reset instructions if the account exists.</p><div class="field"><label for="fpEmail">Email</label><input class="input" id="fpEmail" type="email" placeholder="you@example.com"></div></form>`,
      footer: `<button class="btn btn-outline" data-x>Cancel</button><button class="btn btn-primary" data-send>Send instructions</button>`
    });
    const send = async () => {
      const btn = m.el.querySelector('[data-send]');
      UI.busy(btn, true, 'Sending...');
      try { const r = await API.post('/auth/forgot-password', { email: m.el.querySelector('#fpEmail').value.trim() }); UI.toast(r.message, 'info'); m.close(); }
      catch (e) { UI.toast(e.message, 'error'); UI.busy(btn, false); }
    };
    m.el.querySelector('[data-x]').onclick = m.close;
    m.el.querySelector('[data-send]').onclick = send;
    m.el.querySelector('#fpForm').onsubmit = (e) => { e.preventDefault(); send(); };
  };

  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    UI.formError(form);
    const email = $('email').value.trim(), password = $('password').value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return UI.formError(form, 'Enter a valid email address.');
    if (!password) return UI.formError(form, 'Enter your password.');
    const btn = form.querySelector('button[type=submit]');
    UI.busy(btn, true, 'Logging in...');
    try {
      const r = await API.post('/auth/login', { email, password, remember: $('remember').checked });
      Auth.save(r.data.token, r.data.user, $('remember').checked);
      const role = r.data.user.role;
      const redirect = params.get('redirect');
      const safe = redirect && /^\/[\w\-./%]+\.html(\?[\w=&%-]*)?$/.test(redirect) && redirect.includes('/' + role + '/');
      location.href = safe ? redirect : Auth.home(role);
    } catch (err) { UI.formError(form, err.message); UI.busy(btn, false); }
  });
})();
