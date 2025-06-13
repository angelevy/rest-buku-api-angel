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

// GET Semua Buku
router.get('/', (req, res) => {
    const books = readBooks();
    res.json(books);
});

// GET Buku by ID
router.get('/:id', (req, res) => {
    const { id } = req.params;
    const books = readBooks();
    const book = books.find(b => b.id === id);
    if (!book) {
        return res.status(404).json({ message: 'Buku tidak ditemukan' });
    }
    res.json(book);
});

// POST Tambah Buku
router.post('/', upload.single('image'), (req, res) => {
    const { title, author } = req.body;
    const file = req.file;
    // Di API Anda, email dikirim via header authorization. Ini sudah benar.
    const email = req.headers.authorization;
    
    if (!title || !author || !file || !email) {
        return res.status(400).json({ status: "error", message: 'Judul, penulis, email, dan gambar wajib diisi' });
    }

    // Path gambar sudah benar, karena client (Android) akan menambahkan base URL
    const imageUrl = `/uploads/${file.filename}`;

    const newBook = {
        id: uuidv4(),
        title,
        author,
        image: imageUrl,
        email, // Simpan email pemilik buku
        mine: true // Properti 'mine' sebaiknya ditentukan di client
    };

    const books = readBooks();
    books.push(newBook);
    writeBooks(books);

    res.status(201).json({ status: "success", message: "Buku berhasil ditambahkan", data: newBook });
});

// PUT Update Buku
router.put('/:id', upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { title, author } = req.body;
    const file = req.file;
    const email = req.headers.authorization;

    const books = readBooks();
    const index = books.findIndex(b => b.id === id && b.email === email);
    if (index === -1) {
        return res.status(404).json({ status: "error", message: 'Buku tidak ditemukan atau bukan milik Anda' });
    }

    if (file) {
        // Hapus gambar lama jika ada gambar baru yang di-upload
        const oldImagePath = path.join(__dirname, '..', books[index].image);
        if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
        }
        // --- PERUBAHAN DI SINI ---
        // Simpan path relatif saja, sama seperti saat POST
        books[index].image = `/uploads/${file.filename}`;
    }

    // Update title dan author jika ada di body request
    books[index].title = title || books[index].title;
    books[index].author = author || books[index].author;

    writeBooks(books);
    res.json({ status: "success", message: 'Buku berhasil diperbarui', data: books[index] });
});

// DELETE Buku
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const email = req.headers.authorization;

    const books = readBooks();
    const index = books.findIndex(b => b.id === id && b.email === email);
    if (index === -1) {
        return res.status(404).json({ status: "error", message: 'Buku tidak ditemukan atau bukan milik Anda' });
    }
    
    // Hapus file gambar terkait
    const imagePath = path.join(__dirname, '..', books[index].image);
    if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
    }

    const deleted = books.splice(index, 1);
    writeBooks(books);

    res.json({ status: "success", message: 'Buku berhasil dihapus', data: deleted[0] });
});

module.exports = router;