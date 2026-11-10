const mongoose = require('mongoose');
const Author = require('../models/Author');
const Book = require('../models/Book');

const validId = (id) => mongoose.isValidObjectId(id);
const badId = (res) => res.status(400).json({ message: 'Invalid book id' });
const validateBusinessRules = (data) => {
  const year = new Date().getFullYear();
  if (data.price !== undefined && (!Number.isFinite(Number(data.price)) || Number(data.price) <= 0)) return 'Price must be greater than zero.';
  if (data.publishedYear !== undefined && (!Number.isInteger(Number(data.publishedYear)) || Number(data.publishedYear) < 1450 || Number(data.publishedYear) > year)) return `Published year must be between 1450 and ${year}.`;
  return null;
};
const duplicateTitle = (title) => new RegExp(`^${String(title).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

exports.createBook = async (req, res, next) => {
  try {
    const error = validateBusinessRules(req.body);
    if (error) return res.status(422).json({ message: error });
    if (!validId(req.body.author) || !(await Author.exists({ _id: req.body.author }))) return res.status(400).json({ message: 'A valid existing author is required.' });
    if (await Book.exists({ author: req.body.author, title: duplicateTitle(req.body.title || '') })) return res.status(409).json({ message: 'This author already has a book with that title.' });
    const book = await Book.create(req.body);
    res.status(201).json(await book.populate('author'));
  } catch (err) { if (err.name === 'ValidationError') return res.status(422).json({ message: err.message }); next(err); }
};
exports.getBooks = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.genre) filter.genre = req.query.genre;
    if (req.query.author) {
      if (!validId(req.query.author)) return res.status(400).json({ message: 'Invalid author id filter' });
      filter.author = req.query.author;
    }
    if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
      const price = {};
      for (const key of ['minPrice', 'maxPrice']) {
        if (req.query[key] !== undefined) {
          const value = Number(req.query[key]);
          if (!Number.isFinite(value)) return res.status(400).json({ message: `${key} must be a number` });
          price[key === 'minPrice' ? '$gte' : '$lte'] = value;
        }
      }
      filter.price = price;
    }
    if (req.query.search) filter.title = { $regex: String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    const sortFields = { price: 'price', title: 'title', publishedYear: 'publishedYear' };
    const sort = {};
    if (req.query.sort) {
      if (!sortFields[req.query.sort]) return res.status(400).json({ message: 'sort must be price, title, or publishedYear' });
      const order = (req.query.order || 'asc').toLowerCase();
      if (!['asc', 'desc'].includes(order)) return res.status(400).json({ message: 'order must be asc or desc' });
      sort[sortFields[req.query.sort]] = order === 'asc' ? 1 : -1;
    }
    const paginating = req.query.page !== undefined || req.query.limit !== undefined;
    if (!paginating) return res.json(await Book.find(filter).sort(sort).populate('author'));
    const page = Number(req.query.page || 1), limit = Number(req.query.limit || 10);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 100) return res.status(400).json({ message: 'page must be positive and limit must be between 1 and 100' });
    const total = await Book.countDocuments(filter);
    const results = await Book.find(filter).sort(sort).skip((page - 1) * limit).limit(limit).populate('author');
    res.json({ page, limit, total, results });
  } catch (err) { next(err); }
};
exports.getBook = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return badId(res);
    const book = await Book.findById(req.params.id).populate('author');
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.json(book);
  } catch (err) { next(err); }
};
exports.updateBook = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return badId(res);
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });
    const candidate = { ...book.toObject(), ...req.body };
    const error = validateBusinessRules(candidate);
    if (error) return res.status(422).json({ message: error });
    if (req.body.author !== undefined && (!validId(req.body.author) || !(await Author.exists({ _id: req.body.author })))) return res.status(400).json({ message: 'A valid existing author is required.' });
    if (req.body.title !== undefined || req.body.author !== undefined) {
      const authorId = req.body.author || book.author;
      const title = req.body.title || book.title;
      if (await Book.exists({ _id: { $ne: book._id }, author: authorId, title: duplicateTitle(title) })) return res.status(409).json({ message: 'This author already has a book with that title.' });
    }
    Object.assign(book, req.body);
    await book.save();
    res.json(await book.populate('author'));
  } catch (err) { if (err.name === 'ValidationError') return res.status(422).json({ message: err.message }); next(err); }
};
exports.deleteBook = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return badId(res);
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.json({ message: 'Book deleted' });
  } catch (err) { next(err); }
};
