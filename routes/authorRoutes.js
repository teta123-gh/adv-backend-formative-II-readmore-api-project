const router = require('express').Router();
const authors = require('../controllers/authorController');

router.get('/:id/books', authors.getAuthorBooks);
router.get('/:id/stats', authors.getAuthorStats);
router.route('/').post(authors.createAuthor).get(authors.getAuthors);
router.route('/:id').get(authors.getAuthor).put(authors.updateAuthor).delete(authors.deleteAuthor);
module.exports = router;
