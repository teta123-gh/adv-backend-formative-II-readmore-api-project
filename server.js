require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const authorRoutes = require('./routes/authorRoutes');
const bookRoutes = require('./routes/bookRoutes');

const app = express();
app.use(express.json());
app.get('/', (_req, res) => res.json({ message: 'ReadMore API is running' }));
app.use('/authors', authorRoutes);
app.use('/books', bookRoutes);
app.use((req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: 'An unexpected server error occurred' });
});

const port = process.env.PORT || 3000;
if (require.main === module) {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required. Copy .env.example to .env and configure it.');
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => app.listen(port, () => console.log(`ReadMore API listening on port ${port}`)))
    .catch((error) => { console.error('MongoDB connection failed:', error.message); process.exit(1); });
}
module.exports = app;
