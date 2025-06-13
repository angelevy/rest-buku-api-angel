// File: routes/books.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const booksFilePath = path.join(__dirname, '../data/books.json');

// ... (konfigurasi multer dan fungsi read/write tetap sama) ...
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

function readBooks() {
    // Pastikan file ada, jika tidak, kembalikan array kosong
    if (!fs.existsSync(booksFilePath)) {
        return [];
    }
    const fileContent = fs.readFileSync(booksFilePath, 'utf-8');
    return JSON.parse(fileContent);
}
function writeBooks(data) {
    fs.writeFileSync(booksFilePath, JSON.stringify(data, null, 2));
}


// --- PERUBAHAN UTAMA DI SINI ---
// GET Semua Buku (dengan filter email)
router.get('/', (req, res) => {
    // Ambil email dari header Authorization, sama seperti saat POST/PUT/DELETE
    const userEmail = req.headers.authorization;
    const allBooks = readBooks();

    let booksForUser;

    if (userEmail) {
        // Jika pengguna sudah login (ada email)
        // Tampilkan buku publik (tanpa email) DAN buku milik pengguna itu sendiri
        booksForUser = allBooks.filter(book => !book.email || book.email === userEmail);
        
        // Tandai buku mana yang milik pengguna
        booksForUser = booksForUser.map(book => ({
            ...book,
            mine: book.email === userEmail
        }));
    } else {
        // Jika pengguna belum login
        // Hanya tampilkan buku publik (yang tidak punya properti email)
        booksForUser = allBooks.filter(book => !book.email).map(book => ({
            ...book,
            mine: false // Tidak ada yang menjadi miliknya
        }));
    }

    res.json(booksForUser);
});

// GET Buku by ID (Tidak perlu diubah, karena sudah spesifik)
router.get('/:id', (req, res) => {
    const { id } = req.params;
    const books = readBooks();
    const book = books.find(b => b.id === id);
    if (!book) {
        return res.status(404).json({ message: 'Buku tidak ditemukan' });
    }
    res.json(book);
});


// POST Tambah Buku (Sudah benar, email pemilik sudah disimpan)
router.post('/', upload.single('image'), (req, res) => {
    const { title, author } = req.body;
    const file = req.file;
    const email = req.headers.authorization;
    
    if (!title || !author || !file || !email) {
        return res.status(400).json({ status: "error", message: 'Judul, penulis, email, dan gambar wajib diisi' });
    }

    const imageUrl = `/uploads/${file.filename}`;
    
    // Properti `mine` tidak perlu disimpan di JSON, karena kita menentukannya secara dinamis di endpoint GET
    const newBook = {
        id: uuidv4(),
        title,
        author,
        image: imageUrl,
        email, // Penting! Simpan email pemilik buku
    };

    const books = readBooks();
    books.push(newBook);
    writeBooks(books);

    // Saat mengembalikan data, kita bisa tambahkan properti `mine: true`
    res.status(201).json({ 
        status: "success", 
        message: "Buku berhasil ditambahkan", 
        data: { ...newBook, mine: true } 
    });
});

// PUT dan DELETE (Sudah benar, karena sudah memeriksa email pemilik sebelum operasi)
// Tidak ada perubahan yang diperlukan di sini.
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
        const oldImagePath = path.join(__dirname, '..', books[index].image);
        if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
        }
        books[index].image = `/uploads/${file.filename}`;
    }

    books[index].title = title || books[index].title;
    books[index].author = author || books[index].author;

    writeBooks(books);
    res.json({ status: "success", message: 'Buku berhasil diperbarui', data: {...books[index], mine: true} });
});

router.delete('/:id', (req, res) => {
    const { id } = req.params;
    const email = req.headers.authorization;

    const books = readBooks();
    const index = books.findIndex(b => b.id === id && b.email === email);
    if (index === -1) {
        return res.status(404).json({ status: "error", message: 'Buku tidak ditemukan atau bukan milik Anda' });
    }
    
    const imagePath = path.join(__dirname, '..', books[index].image);
    if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
    }

    const deleted = books.splice(index, 1);
    writeBooks(books);

    res.json({ status: "success", message: 'Buku berhasil dihapus', data: {...deleted[0], mine: true} });
});

module.exports = router;