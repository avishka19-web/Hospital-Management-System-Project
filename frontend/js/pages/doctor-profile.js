(async () => {
  const { esc } = UI;
  const { user, main } = await Shell.mount({ role: 'doctor', active: 'profile', title: 'Profile & availability' });
  const d = user.doctor;
  if (!d) return UI.errorBox(main, 'Your doctor profile could not be found. Contact the administrator.');
  const a = d.availability;

  main.innerHTML = `
    <div class="page-head"><div><h2>Profile & availability</h2><p>Patients can only book the days and hours you set here.</p></div></div>
    <div class="two-col" style="grid-template-columns:minmax(0,1fr) minmax(0,1.3fr)">
      <div class="card card-pad center">${UI.avatar(user.name, d.photo, 'avatar-xl').replace('class="avatar', 'style="margin:0 auto 14px" class="avatar')}<h3 style="margin-bottom:2px">${esc(user.name)}</h3><div style="color:var(--teal-dark);font-weight:600">${esc(d.specialization)}</div><div class="muted small" style="margin-bottom:14px">${esc(d.department ? d.department.name : '')}</div>
        <dl class="dl" style="text-align:left"><dt>Email</dt><dd>${esc(user.email)}</dd><dt>Qualification</dt><dd>${esc(d.qualification || '-')}</dd><dt>Experience</dt><dd>${d.experience} years</dd><dt>Fee</dt><dd>${UI.money(d.fee)}</dd></dl>
        <p class="hint" style="margin-top:12px">Name, specialization, fee and photo are managed by the hospital administrator.</p></div>
      <div class="card"><div class="card-head"><h3>Availability & bio</h3></div><form class="card-pad" id="af" novalidate>
        <div class="field"><div class="label">Working days</div><div class="check-row">${[1, 2, 3, 4, 5, 6, 0].map((n) => `<label class="check-pill"><input type="checkbox" name="day" value="${n}" ${a.days.includes(n) ? 'checked' : ''}><span>${UI.DAYS[n]}</span></label>`).join('')}</div></div>
        <div class="form-grid"><div class="field"><label for="st">Start time</label><input class="input" id="st" type="time" value="${a.startTime}" required></div><div class="field"><label for="en">End time</label><input class="input" id="en" type="time" value="${a.endTime}" required></div>
        <div class="field"><label for="sl">Appointment length</label><select class="input" id="sl">${[10, 15, 20, 30, 45, 60].map((n) => `<option value="${n}" ${a.slotMinutes === n ? 'selected' : ''}>${n} minutes</option>`).join('')}</select></div>
        <div class="field"><label for="ph">Phone</label><input class="input" id="ph" type="tel" value="${esc(user.phone || '')}"></div>
        <div class="field full"><label for="bio">Public bio</label><textarea class="input" id="bio" rows="4" maxlength="1000">${esc(d.bio || '')}</textarea></div></div>
        <div class="notice" style="margin-bottom:14px">Changes apply to new bookings. Existing appointments are not moved automatically.</div>
        <button class="btn btn-primary" type="submit">Save changes</button></form></div></div>
    <div class="card" id="pw"></div>`;
  Shell.passwordCard(main.querySelector('#pw'));

  const f = main.querySelector('#af');
  f.onsubmit = async (e) => {
    e.preventDefault(); UI.formError(f);
    const days = [...f.querySelectorAll('[name=day]:checked')].map((x) => x.value);
    if (!days.length) return UI.formError(f, 'Select at least one working day.');
    const btn = f.querySelector('button[type=submit]'); UI.busy(btn, true, 'Saving...');
    try {
      await API.put('/doctors/' + d._id, { days, startTime: f.st.value, endTime: f.en.value, slotMinutes: f.sl.value, bio: f.bio.value, phone: f.ph.value });
      UI.toast('Availability and profile saved.');
    } catch (err) { UI.formError(f, err.message); }
    UI.busy(btn, false);
  };
})();
