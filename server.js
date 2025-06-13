require('dotenv').config();

const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');
const booksRoute = require('./routes/books');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- PERUBAHAN DI SINI ---
// Sajikan file dari folder 'uploads' di bawah rute '/uploads'
// Contoh: Request ke /uploads/image.jpg akan mengambil file dari folder_proyek/uploads/image.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/books', booksRoute);

// Port & Base URL
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Server start
app.listen(PORT, () => {
    console.log(`✅ Server berjalan di ${BASE_URL}`);
});