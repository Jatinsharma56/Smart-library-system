const express = require('express');
const router = express.Router();
const { issueBook, returnBook } = require('../controllers/issueController');
const { protect } = require('../middleware/authMiddleware');

router.post('/issue', protect, issueBook);
router.post('/return', protect, returnBook);

module.exports = router;
