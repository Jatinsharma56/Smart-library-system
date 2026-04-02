const express = require('express');
const router = express.Router();
const { getBooks, searchBooks, addBook, updateBook, deleteBook } = require('../controllers/bookController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .get(getBooks)
  .post(protect, admin, addBook);

router.route('/search')
  .get(searchBooks);

router.route('/:id')
  .put(protect, admin, updateBook)
  .delete(protect, admin, deleteBook);

module.exports = router;
