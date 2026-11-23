(() => {
  const form = document.getElementById('regForm');
  document.querySelectorAll('img[data-img]').forEach((i) => { i.src = IMG[i.dataset.img]; });
  document.getElementById('dateOfBirth').max = UI.addDays(UI.todayStr(), -1);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    UI.formError(form);
    const d = Object.fromEntries(new FormData(form));
    Object.keys(d).forEach((k) => { if (!/assword/.test(k)) d[k] = d[k].trim(); });
    const err =
      d.name.length < 2 ? 'Enter your full name.' :
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email) ? 'Enter a valid email address.' :
      !/^[+]?[0-9\s-]{7,15}$/.test(d.phone) ? 'Enter a valid phone number (7-15 digits).' :
      !d.gender ? 'Select your gender.' :
      !d.dateOfBirth || d.dateOfBirth >= UI.todayStr() ? 'Enter a valid date of birth.' :
      d.address.length < 5 ? 'Enter your address (at least 5 characters).' :
      d.password.length < 8 || !/[A-Za-z]/.test(d.password) || !/\d/.test(d.password) ? 'Password must be at least 8 characters and include a letter and a number.' :
      d.password !== d.confirmPassword ? 'Passwords do not match.' : '';
    if (err) return UI.formError(form, err);

    const btn = form.querySelector('button[type=submit]');
    UI.busy(btn, true, 'Creating account...');
    try {
      const r = await API.post('/auth/register', d);
      Auth.save(r.data.token, r.data.user, false);
      UI.toast('Account created. Welcome to Meridian!');
      setTimeout(() => (location.href = Auth.home('patient')), 700);
    } catch (e2) { UI.formError(form, e2.message); UI.busy(btn, false); }
  });
})();
