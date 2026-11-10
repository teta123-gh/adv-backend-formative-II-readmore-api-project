const router = require('express').Router();
const books = require('../controllers/bookController');

router.route('/').post(books.createBook).get(books.getBooks);
router.route('/:id').get(books.getBook).put(books.updateBook).delete(books.deleteBook);
module.exports = router;
