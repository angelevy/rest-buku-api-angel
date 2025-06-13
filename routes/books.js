// File: routes/books.js

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
    // Pastikan file ada, jika tidak, kembalikan array kosong
    if (!fs.existsSync(booksFilePath)) {
        return [];
    }
    const fileContent = fs.readFileSync(booksFilePath, 'utf-8');
    // Tambahkan penanganan error jika JSON tidak valid
    try {
        return JSON.parse(fileContent);
    } catch (e) {
        console.error("Error parsing books.json:", e);
        return [];
    }
}
function writeBooks(data) {
    fs.writeFileSync(booksFilePath, JSON.stringify(data, null, 2));
}


// --- PERUBAHAN UTAMA ADA DI BAGIAN INI ---
// GET Semua Buku (dengan data default)
router.get('/', (req, res) => {
    // Data default yang akan selalu ditampilkan untuk semua pengguna
    const defaultBooks = [
      {
        "id": "1",
        "title": "Atomic Habits",
        "author": "James Clear",
        "image": "https://covers.openlibrary.org/b/id/15090937-L.jpg"
        // Properti email sengaja dihilangkan agar tidak terikat pada user tertentu
      },
      {
        "id": "2",
        "title": "Rich Dad Poor Dad",
        "author": "Robert Kiyosaki",
        "image": "https://covers.openlibrary.org/b/id/11270106-L.jpg"
      }
    ];

    const userEmail = req.headers.authorization;
    const userGeneratedBooks = readBooks(); // Buku yang ditambahkan oleh semua pengguna dari file books.json

    let booksForUser = [];

    if (userEmail) {
        // Jika pengguna login, filter buku yang ia buat dari books.json
        const privateBooks = userGeneratedBooks.filter(book => book.email === userEmail);
        
        // Gabungkan buku default dengan buku pribadi pengguna
        const combinedBooks = [...defaultBooks, ...privateBooks];

        // Set properti 'mine' secara dinamis. Buku default tidak akan pernah 'mine',
        // karena tidak memiliki properti email.
        booksForUser = combinedBooks.map(book => ({
            ...book,
            mine: book.email === userEmail
        }));
    } else {
        // Jika pengguna tidak login, hanya tampilkan buku default
        // Set properti 'mine' menjadi false untuk semua buku default
        booksForUser = defaultBooks.map(book => ({
            ...book,
            mine: false
        }));
    }

    res.json(booksForUser);
});

// GET Buku by ID (Tidak perlu diubah)
router.get('/:id', (req, res) => {
    const { id } = req.params;
    const books = readBooks();
    const book = books.find(b => b.id === id);
    if (!book) {
        // Cek juga di buku default jika tidak ketemu
        const defaultBook = defaultBooks.find(b => b.id === id);
        if (!defaultBook) {
            return res.status(404).json({ message: 'Buku tidak ditemukan' });
        }
        return res.json({...defaultBook, mine: false});
    }
    res.json(book);
});


// POST Tambah Buku (Tidak perlu diubah)
router.post('/', upload.single('image'), (req, res) => {
    const { title, author } = req.body;
    const file = req.file;
    const email = req.headers.authorization;
    
    if (!title || !author || !file || !email) {
        return res.status(400).json({ status: "error", message: 'Judul, penulis, email, dan gambar wajib diisi' });
    }

    const imageUrl = `/uploads/${file.filename}`;
    
    const newBook = {
        id: uuidv4(),
        title,
        author,
        image: imageUrl,
        email,
    };

    const books = readBooks();
    books.push(newBook);
    writeBooks(books);

    res.status(201).json({ 
        status: "success", 
        message: "Buku berhasil ditambahkan", 
        data: { ...newBook, mine: true } 
    });
});

// PUT Update Buku (Tidak perlu diubah)
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

// DELETE Buku (Tidak perlu diubah)
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