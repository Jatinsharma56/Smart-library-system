const express = require('express');
const router = express.Router();
const { getFineDetails } = require('../controllers/fineController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:userId', protect, getFineDetails);

module.exports = router;
