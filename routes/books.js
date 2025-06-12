const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const booksFilePath = path.join(__dirname, '../data/books.json');

// Konfigurasi multer untuk upload gambar
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Fungsi bantu baca & tulis file
function readBooks() {
  return JSON.parse(fs.readFileSync(booksFilePath, 'utf-8'));
}
function writeBooks(data) {
  fs.writeFileSync(booksFilePath, JSON.stringify(data, null, 2));
}

// ========== GET Semua Buku ==========
router.get('/', (req, res) => {
  const books = readBooks();
  res.json(books);
});

// ========== GET Buku by ID ==========
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const books = readBooks();
  const book = books.find(b => b.id === id);

  if (!book) {
    return res.status(404).json({ message: 'Buku tidak ditemukan' });
  }

  res.json(book);
});

// ========== POST Tambah Buku ==========
router.post('/', upload.single('image'), (req, res) => {
  const { title, author } = req.body;
  const file = req.file;

  if (!title || !author || !file) {
    return res.status(400).json({ message: 'Judul, penulis, dan gambar wajib diisi' });
  }

  const newBook = {
    id: uuidv4(),
    title,
    author,
    image: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`,
    mine: true
  };

  const books = readBooks();
  books.push(newBook);
  writeBooks(books);

  res.status(201).json(newBook);
});

// ========== PUT Update Buku ==========
router.put('/:id', upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { title, author } = req.body;
  const file = req.file;

  const books = readBooks();
  const index = books.findIndex(b => b.id === id);

  if (index === -1 || books[index].mine !== true) {
    return res.status(404).json({ message: 'Buku tidak ditemukan atau tidak bisa diedit' });
  }

  // Hapus gambar lama jika ada dan upload baru
  if (file && books[index].image) {
    const oldImagePath = books[index].image.replace(`${req.protocol}://${req.get('host')}/`, '');
    if (fs.existsSync(oldImagePath)) fs.unlinkSync(oldImagePath);

    books[index].image = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
  }

  books[index].title = title || books[index].title;
  books[index].author = author || books[index].author;

  writeBooks(books);
  res.json({ message: 'Buku berhasil diperbarui', data: books[index] });
});

// ========== DELETE Buku ==========
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const books = readBooks();
  const index = books.findIndex(b => b.id === id && b.mine === true);

  if (index === -1) {
    return res.status(404).json({ message: 'Buku tidak ditemukan atau tidak bisa dihapus' });
  }

  // Hapus file gambar jika ada
  const imagePath = books[index].image.replace(`${req.protocol}://${req.get('host')}/`, '');
  if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

  const deleted = books.splice(index, 1);
  writeBooks(books);

  res.json({ message: 'Buku berhasil dihapus', data: deleted[0] });
});

module.exports = router;
