const router = require('express').Router();
const c = require('../controllers/appointmentController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/slots', c.slots);
router.post('/', authorize('patient'), c.create);
router.get('/', c.list);
router.get('/:id', c.get);
router.put('/:id', c.update);
router.delete('/:id', authorize('admin'), c.remove);

module.exports = router;
