(() => {
  Site.init('contact.html');
  const form = document.getElementById('contactForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    UI.formError(form);
    const data = Object.fromEntries(new FormData(form));
    if (!data.name.trim() || !data.email.trim() || !data.subject.trim() || data.message.trim().length < 10) return UI.formError(form, 'Please fill in your name, email, subject and a message of at least 10 characters.');
    const btn = form.querySelector('button[type=submit]');
    UI.busy(btn, true, 'Sending...');
    try {
      const r = await API.post('/contact', data);
      UI.toast(r.message);
      form.reset();
    } catch (err) { UI.formError(form, err.message); }
    finally { UI.busy(btn, false); }
  });
})();
