exports.isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || '').trim());
exports.isPhone = (v) => /^[+]?[0-9\s-]{7,15}$/.test(String(v || '').trim());
exports.strongPassword = (v) => typeof v === 'string' && v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v);
exports.isUrl = (v) => /^https?:\/\/\S+$/i.test(String(v || '').trim());
