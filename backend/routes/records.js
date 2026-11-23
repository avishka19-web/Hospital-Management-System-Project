const router = require('express').Router();
const c = require('../controllers/clinicalController');
const { protect } = require('../middleware/auth');

router.get('/', protect, c.listRecords);

module.exports = router;
