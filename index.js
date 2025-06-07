require('dotenv').config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require('uuid');

// Konfigurasi Multer untuk file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'public/uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file JPEG/PNG yang diperbolehkan'), false);
    }
  }
});

const app = express();
const PORT = process.env.PORT || 3000;

let books = require("./data");

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use('/uploads', express.static('public/uploads'));

// Helper Functions
const validateBookInput = (title, author, file) => {
  if (!title || title.trim().length < 2) {
    throw new Error('Judul harus minimal 2 karakter');
  }
  if (!author || author.trim().length < 2) {
    throw new Error('Penulis harus minimal 2 karakter');
  }
  if (!file) {
    throw new Error('Gambar cover diperlukan');
  }
};

// Routes
app.get("/books", (req, res) => {
  const userId = req.headers['authorization'];
  if (userId) {
    const userBooks = books.filter(b => b.email === userId);
    return res.json(userBooks);
  }
  res.json(books);
});

app.get("/books/:id", (req, res) => {
  const book = books.find(b => b.id === req.params.id);
  book ? res.json(book) : res.status(404).json({ error: 'Buku tidak ditemukan' });
});

app.post('/books', upload.single('coverUrl'), (req, res) => {
  try {
    const { title, author } = req.body;
    const email = req.headers['authorization'];
    
    validateBookInput(title, author, req.file);

    const newBook = {
      id: uuidv4(),
      title: title.trim(),
      author: author.trim(),
      email,
      coverUrl: `/uploads/${req.file.filename}`
    };

    books.push(newBook);
    res.status(201).json({ 
      status: "success",
      data: newBook
    });
  } catch (error) {
    res.status(400).json({ 
      error: error.message 
    });
  }
});

app.put("/books/:id", upload.single('coverUrl'), (req, res) => {
  try {
    const { id } = req.params;
    const { title, author } = req.body;
    const email = req.headers['authorization'];
    const index = books.findIndex(b => b.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Buku tidak ditemukan' });
    }

    if (books[index].email !== email) {
      return res.status(403).json({ error: 'Anda tidak memiliki akses' });
    }

    validateBookInput(title, author, req.file || books[index].coverUrl);

    // Hapus file lama jika ada file baru
    if (req.file) {
      const oldFile = books[index].coverUrl.replace('/uploads/', '');
      fs.unlinkSync(path.join('public/uploads', oldFile));
    }

    books[index] = {
      ...books[index],
      title: title.trim(),
      author: author.trim(),
      coverUrl: req.file ? `/uploads/${req.file.filename}` : books[index].coverUrl
    };

    res.json(books[index]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete("/books/:id", (req, res) => {
  try {
    const { id } = req.params;
    const email = req.headers['authorization'];
    const index = books.findIndex(b => b.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Buku tidak ditemukan' });
    }

    if (books[index].email !== email) {
      return res.status(403).json({ error: 'Anda tidak memiliki akses' });
    }

    // Hapus file gambar
    const filePath = books[index].coverUrl.replace('/uploads/', '');
    fs.unlinkSync(path.join('public/uploads', filePath));

    const deletedBook = books.splice(index, 1)[0];
    res.json({ 
      status: "success",
      data: deletedBook
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Terjadi kesalahan server' });
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
  console.log(`Endpoint upload: http://localhost:${PORT}/uploads`);
});