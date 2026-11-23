(async () => {
  const { esc } = UI;
  Site.init('doctors.html');
  const $ = (id) => document.getElementById(id);
  const list = $('list');
  let seq = 0;

  const params = new URLSearchParams(location.search);
  if (params.get('department')) $('department').dataset.pre = params.get('department');

  try {
    const d = await API.get('/departments');
    $('department').innerHTML += d.data.map((x) => `<option value="${x._id}">${esc(x.name)}</option>`).join('');
    if ($('department').dataset.pre) $('department').value = $('department').dataset.pre;
  } catch (e) { /* filters still work without departments */ }

  async function load() {
    const my = ++seq;
    UI.loading(list, 'Finding doctors...');
    try {
      const sort = $('sort').value;
      const r = await API.get('/doctors', { limit: 100, search: $('search').value.trim(), department: $('department').value, day: $('day').value, sort: sort === 'name' ? '' : sort });
      if (my !== seq) return;
      let docs = r.data;
      if (sort === 'name') docs = UI.sortable(docs, 'name', 1);
      $('count').textContent = `${docs.length} doctor${docs.length === 1 ? '' : 's'} found`;
      list.innerHTML = docs.length ? docs.map(Site.doctorCard).join('') : `<div style="grid-column:1/-1">${UI.empty('fa-user-doctor', 'No doctors match your filters', 'Try a different name, department or day.', '<button class="btn btn-outline btn-sm" id="reset">Clear filters</button>')}</div>`;
      Site.bindDoctorCards(list, docs);
      const reset = $('reset');
      if (reset) reset.onclick = () => { $('filters').reset(); load(); };
    } catch (e) { if (my === seq) UI.errorBox(list, e.message, load); }
  }
  $('search').addEventListener('input', UI.debounce(load, 300));
  ['department', 'day', 'sort'].forEach((id) => $(id).addEventListener('change', load));
  load();
})();
