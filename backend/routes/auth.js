const router = require('express').Router();
const c = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const limiter = require('../middleware/rateLimit');

router.post('/register', limiter({ max: 30 }), c.register);
router.post('/login', limiter({ max: 20 }), c.login);
router.post('/forgot-password', limiter({ max: 10 }), c.forgotPassword);
router.get('/me', protect, c.me);
router.put('/me', protect, c.updateMe);
router.put('/me/password', protect, c.changePassword);

module.exports = router;
