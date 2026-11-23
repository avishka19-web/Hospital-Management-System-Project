const router = require('express').Router();
const c = require('../controllers/serviceController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', c.list);
router.get('/all', protect, authorize('admin'), c.listAll);
router.post('/', protect, authorize('admin'), c.create);
router.put('/:id', protect, authorize('admin'), c.update);
router.delete('/:id', protect, authorize('admin'), c.remove);

module.exports = router;
