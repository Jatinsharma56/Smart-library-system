const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title']
  },
  author: {
    type: String,
    required: [true, 'Please add an author']
  },
  available: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Adding text index for search
bookSchema.index({ title: 'text', author: 'text' });

module.exports = mongoose.model('Book', bookSchema);
