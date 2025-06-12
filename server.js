const express = require('express');
const app = express();
const cors = require('cors');
const booksRoute = require('./routes/books');
const path = require('path');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/books', booksRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server berjalan di http://localhost:${PORT}`));