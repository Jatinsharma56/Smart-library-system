const Issue = require('../models/Issue');

// Get fine details for a user
const getFineDetails = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Only allow users to view their own fines, unless admin
    if (req.user._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized to view these fines' });
    }

    const issuesWithFines = await Issue.find({ userId, fine: { $gt: 0 } }).populate('bookId', 'title');
    
    const totalFine = issuesWithFines.reduce((acc, issue) => acc + issue.fine, 0);

    res.status(200).json({
      totalFine,
      details: issuesWithFines
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getFineDetails };
