(async () => {
  const { esc } = UI;
  const { user, main } = await Shell.mount({ role: 'patient', active: 'profile', title: 'My profile' });
  const p = user.patient || {}, ec = p.emergencyContact || {};
  main.innerHTML = `
    <div class="page-head"><div><h2>My profile</h2><p>Keep your details up to date so the care team can reach you.</p></div></div>
    <div class="card"><div class="card-head"><h3>Personal information</h3></div><form class="card-pad" id="pf" novalidate><div class="form-grid">
      <div class="field"><label for="name">Full name</label><input class="input" id="name" value="${esc(user.name)}" required></div>
      <div class="field"><label for="email">Email</label><input class="input" id="email" value="${esc(user.email)}" disabled><div class="hint">Email is your login and cannot be changed here.</div></div>
      <div class="field"><label for="phone">Phone</label><input class="input" id="phone" type="tel" value="${esc(user.phone || '')}" required></div>
      <div class="field"><label for="gender">Gender</label><select class="input" id="gender">${['female', 'male', 'other'].map((g) => `<option value="${g}" ${user.gender === g ? 'selected' : ''}>${UI.cap(g)}</option>`).join('')}</select></div>
      <div class="field"><label for="dob">Date of birth</label><input class="input" id="dob" type="date" max="${UI.addDays(UI.todayStr(), -1)}" value="${user.dateOfBirth ? String(user.dateOfBirth).slice(0, 10) : ''}"></div>
      <div class="field"><label for="blood">Blood group</label><select class="input" id="blood"><option value="">Not known</option>${['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => `<option ${p.bloodGroup === b ? 'selected' : ''}>${b}</option>`).join('')}</select></div>
      <div class="field full"><label for="address">Address</label><textarea class="input" id="address" rows="2" required>${esc(user.address || '')}</textarea></div>
      <div class="field full"><label for="allergies">Known allergies</label><input class="input" id="allergies" maxlength="300" value="${esc(p.allergies || '')}" placeholder="e.g. Penicillin"></div>
      <div class="field"><label for="ecn">Emergency contact name</label><input class="input" id="ecn" maxlength="80" value="${esc(ec.name || '')}"></div>
      <div class="field"><label for="ecp">Emergency contact phone</label><input class="input" id="ecp" type="tel" value="${esc(ec.phone || '')}"></div></div>
      <button class="btn btn-primary" type="submit">Save changes</button></form></div>
    <div class="card" id="pw"></div>`;
  Shell.passwordCard(main.querySelector('#pw'));
  const f = main.querySelector('#pf');
  f.onsubmit = async (e) => {
    e.preventDefault(); UI.formError(f);
    const g = (id) => f.querySelector('#' + id).value.trim();
    if (g('name').length < 2) return UI.formError(f, 'Enter your full name.');
    if (!/^[+]?[0-9\s-]{7,15}$/.test(g('phone'))) return UI.formError(f, 'Enter a valid phone number.');
    if (g('address').length < 5) return UI.formError(f, 'Enter your address.');
    const btn = f.querySelector('button[type=submit]'); UI.busy(btn, true, 'Saving...');
    try {
      const r = await API.put('/auth/me', { name: g('name'), phone: g('phone'), gender: g('gender'), dateOfBirth: g('dob'), address: g('address'), bloodGroup: g('blood'), allergies: g('allergies'), emergencyContact: { name: g('ecn'), phone: g('ecp') } });
      Auth.updateUser(r.data); UI.toast('Profile updated.');
      document.querySelector('.side-user b').textContent = r.data.name;
    } catch (err) { UI.formError(f, err.message); }
    UI.busy(btn, false);
  };
})();
