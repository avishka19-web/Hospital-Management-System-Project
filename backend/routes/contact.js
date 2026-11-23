const router = require('express').Router();
const c = require('../controllers/contactController');
const { protect, authorize } = require('../middleware/auth');
const limiter = require('../middleware/rateLimit');

router.post('/', limiter({ max: 10 }), c.create);
router.get('/', protect, authorize('admin'), c.list);
router.put('/:id', protect, authorize('admin'), c.update);
router.delete('/:id', protect, authorize('admin'), c.remove);

module.exports = router;
