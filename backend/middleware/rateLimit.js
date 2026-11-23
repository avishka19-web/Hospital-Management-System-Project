// Tiny in-memory limiter (per route, per IP) to slow down password guessing and form spam.
module.exports = ({ windowMs = 15 * 60 * 1000, max = 20 } = {}) => {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const current = hits.get(req.ip);
    const entry = current && current.reset > now ? current : { count: 0, reset: now + windowMs };
    entry.count += 1;
    hits.set(req.ip, entry);
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    if (entry.count > max) return res.status(429).json({ success: false, message: 'Too many attempts. Please wait a few minutes and try again.' });
    next();
  };
};
