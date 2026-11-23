const ContactMessage = require('../models/ContactMessage');
const { asyncHandler, httpError, str, isId, escapeRegex, paginate, pageMeta } = require('../utils/helpers');
const { isEmail, isPhone } = require('../utils/validators');

exports.create = asyncHandler(async (req, res) => {
  const b = req.body || {};
  const data = { name: str(b.name).trim(), email: str(b.email).trim().toLowerCase(), phone: str(b.phone).trim(), subject: str(b.subject).trim(), message: str(b.message).trim() };
  if (data.name.length < 2) throw httpError(400, 'Please enter your name.');
  if (!isEmail(data.email)) throw httpError(400, 'Enter a valid email address.');
  if (data.phone && !isPhone(data.phone)) throw httpError(400, 'Enter a valid phone number or leave it blank.');
  if (data.subject.length < 3) throw httpError(400, 'Please add a subject.');
  if (data.message.length < 10) throw httpError(400, 'Your message must be at least 10 characters.');
  await ContactMessage.create(data);
  res.status(201).json({ success: true, message: 'Thank you. Your message has been sent and our team will reply soon.' });
});

exports.list = asyncHandler(async (req, res) => {
  const p = paginate(req, 10, 50);
  const q = {};
  if (['new', 'read', 'replied'].includes(req.query.status)) q.status = req.query.status;
  const search = str(req.query.search).trim();
  if (search) { const rx = new RegExp(escapeRegex(search), 'i'); q.$or = [{ name: rx }, { email: rx }, { subject: rx }]; }
  const [total, data] = await Promise.all([ContactMessage.countDocuments(q), ContactMessage.find(q).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit)]);
  res.json({ success: true, data, pagination: pageMeta(p, total) });
});

exports.update = asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Message not found.');
  if (!['new', 'read', 'replied'].includes((req.body || {}).status)) throw httpError(400, 'Invalid status.');
  const m = await ContactMessage.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!m) throw httpError(404, 'Message not found.');
  res.json({ success: true, message: 'Message updated.', data: m });
});

exports.remove = asyncHandler(async (req, res) => {
  if (!isId(req.params.id)) throw httpError(404, 'Message not found.');
  const m = await ContactMessage.findByIdAndDelete(req.params.id);
  if (!m) throw httpError(404, 'Message not found.');
  res.json({ success: true, message: 'Message deleted.' });
});
