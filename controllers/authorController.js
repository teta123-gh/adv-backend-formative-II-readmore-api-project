const mongoose = require('mongoose');
const Author = require('../models/Author');
const Book = require('../models/Book');

const validId = (id) => mongoose.isValidObjectId(id);
const badId = (res) => res.status(400).json({ message: 'Invalid author id' });

exports.createAuthor = async (req, res, next) => {
  try { const author = await Author.create(req.body); res.status(201).json(author); }
  catch (err) { if (err.name === 'ValidationError') return res.status(422).json({ message: err.message }); next(err); }
};
exports.getAuthors = async (_req, res, next) => {
  try { res.json(await Author.find()); } catch (err) { next(err); }
};
exports.getAuthor = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return badId(res);
    const author = await Author.findById(req.params.id);
    if (!author) return res.status(404).json({ message: 'Author not found' });
    res.json(author);
  } catch (err) { next(err); }
};
exports.updateAuthor = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return badId(res);
    const author = await Author.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!author) return res.status(404).json({ message: 'Author not found' });
    res.json(author);
  } catch (err) { if (err.name === 'ValidationError') return res.status(422).json({ message: err.message }); next(err); }
};
// Delete policy: block while books exist so catalog records are preserved. The author can be deleted after their books are removed.
exports.deleteAuthor = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return badId(res);
    const author = await Author.findById(req.params.id);
    if (!author) return res.status(404).json({ message: 'Author not found' });
    if (await Book.exists({ author: author._id })) return res.status(409).json({ message: 'Cannot delete an author who still has books. Delete or reassign the books first.' });
    await author.deleteOne();
    res.json({ message: 'Author deleted' });
  } catch (err) { next(err); }
};
exports.getAuthorBooks = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return badId(res);
    if (!(await Author.exists({ _id: req.params.id }))) return res.status(404).json({ message: 'Author not found' });
    res.json(await Book.find({ author: req.params.id }).populate('author'));
  } catch (err) { next(err); }
};
exports.getAuthorStats = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return badId(res);
    const author = await Author.findById(req.params.id);
    if (!author) return res.status(404).json({ message: 'Author not found' });
    const [stats] = await Book.aggregate([
      { $match: { author: author._id } },
      { $group: { _id: null, bookCount: { $sum: 1 }, averagePrice: { $avg: '$price' }, cheapest: { $min: '$price' }, mostExpensive: { $max: '$price' } } }
    ]);
    const cheapestBook = stats ? await Book.findOne({ author: author._id, price: stats.cheapest }).select('title -_id') : null;
    const mostExpensiveBook = stats ? await Book.findOne({ author: author._id, price: stats.mostExpensive }).select('title -_id') : null;
    res.json({ author: author.name, bookCount: stats?.bookCount || 0, averagePrice: stats ? Number(stats.averagePrice.toFixed(2)) : 0, cheapestBook: cheapestBook?.title ?? null, mostExpensiveBook: mostExpensiveBook?.title ?? null });
  } catch (err) { next(err); }
};
