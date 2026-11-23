// Appointment dates are stored as local "YYYY-MM-DD" strings and times as "HH:MM",
// which avoids timezone shifts between browser, server and database.
const pad = (n) => String(n).padStart(2, '0');
const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => toDateStr(new Date());

const parseDate = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof s === 'string' ? s : '');
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return d.getMonth() === +m[2] - 1 ? d : null;
};

// Date of birth is stored at UTC midnight so it round-trips as the same calendar day.
const dateOnlyUTC = (s) => new Date(`${s}T00:00:00.000Z`);

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fromMin = (n) => `${pad(Math.floor(n / 60))}:${pad(n % 60)}`;

const generateSlots = (a) => {
  const step = a.slotMinutes || 30;
  const out = [];
  for (let t = toMin(a.startTime); t + step <= toMin(a.endTime); t += step) out.push(fromMin(t));
  return out;
};

const appointmentDateTime = (date, time) => {
  const d = parseDate(date);
  const [h, m] = time.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
};

const addDays = (dateStr, n) => { const d = parseDate(dateStr); d.setDate(d.getDate() + n); return toDateStr(d); };

const monthKeys = (n) => {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }
  return out;
};

module.exports = { toDateStr, today, parseDate, dateOnlyUTC, TIME, toMin, fromMin, generateSlots, appointmentDateTime, addDays, monthKeys };
