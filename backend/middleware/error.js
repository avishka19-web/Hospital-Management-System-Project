const { httpError } = require('../utils/helpers');

exports.notFound = (req, res, next) => next(httpError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
exports.errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'Server error';
  let errors = err.errors;

  if (err.name === 'ValidationError' && err.errors && !Array.isArray(err.errors)) {
    status = 400;
    errors = Object.values(err.errors).map((e) => e.message);
    message = errors[0];
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier or value supplied.';
  } else if (err.code === 11000) {
    status = 409;
    const k = err.keyPattern || {};
    message = k.slotKey ? 'That time slot was just booked. Please choose another.'
      : k.email ? 'An account with this email already exists.'
      : k.name ? 'That name is already in use.'
      : 'A record with these details already exists.';
  } else if (err.name === 'MulterError') {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 3 MB or smaller.' : err.message;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON in request body.';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    status = 401;
    message = 'Invalid or expired session.';
  }

  if (status >= 500) {
    console.error(err);
    if (process.env.NODE_ENV === 'production') message = 'Something went wrong on the server.';
  }
  res.status(status).json({ success: false, message, errors });
};
