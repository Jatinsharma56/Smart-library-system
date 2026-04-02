const Issue = require('../models/Issue');
const Book = require('../models/Book');

// Issue a book
const issueBook = async (req, res) => {
  try {
    const { bookId } = req.body;
    
    // Check if book exists and is available
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }
    if (!book.available) {
      return res.status(400).json({ message: 'Book is not available for issue' });
    }

    // Create issue record
    const issue = await Issue.create({
      userId: req.user._id,
      bookId
    });

    // Update book status
    book.available = false;
    await book.save();

    res.status(201).json(issue);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Return a book
const returnBook = async (req, res) => {
  try {
    const { bookId } = req.body;

    // Find active issue
    const issue = await Issue.findOne({ userId: req.user._id, bookId, returnDate: { $exists: false } });
    if (!issue) {
      return res.status(404).json({ message: 'Active issue not found for this book' });
    }

    // Calculate fine: 10 rupees per extra day after 7 days
    const issueDate = new Date(issue.issueDate);
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate - issueDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let fine = 0;
    if (diffDays > 7) {
      fine = (diffDays - 7) * 10;
    }

    issue.returnDate = currentDate;
    issue.fine = fine;
    await issue.save();

    // Update book status
    const book = await Book.findById(bookId);
    if (book) {
      book.available = true;
      await book.save();
    }

    res.status(200).json({ message: 'Book returned successfully', issue, fine });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { issueBook, returnBook };
