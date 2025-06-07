// index.js
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const upload = multer({ dest: 'uploads/' });
const app = express();
const PORT = process.env.PORT || 3000;

let books = require("./data");

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"]
}));
app.use(express.json());


// GET all books
app.get("/books", (req, res) => {
    res.json(books);
});

// GET book by id
app.get("/books/:id", (req, res) => {
    const book = books.find(b => b.id === req.params.id);
    if (book) {
        res.json(book);
    } else {
        res.status(404).json({ message: "Book not found" });
    }
});

// POST new book
app.post('/api/books', upload.single('photo'), (req, res) => {
    const title = req.body.title;
    const author = req.body.author;
    const photo = req.file;  // Ini file foto

    if (!title || !author || !photo) {
        return res.status(400).json({ error: 'Title, author and photo are required' });
    }

    // Simulasi URL image (karena kita belum simpan ke disk atau cloud)
    const coverUrl = `data:image/jpeg;base64,${req.file.buffer.toString("base64")}`;

    const newBook = {
        id: Date.now().toString(),
        title,
        author,
        email: userId,
        coverUrl
    };

    books.push(newBook);

    res.json({ message: 'Book added successfully', data: { title, author, photoPath: photo.path } });
});

// PUT (update) book
app.put("/books/:id", (req, res) => {
    const { id } = req.params;
    const { title, author, coverUrl, email } = req.body;
    const index = books.findIndex(b => b.id === id);

    if (index !== -1) {
        books[index] = { id, title, author, coverUrl, email };
        res.json(books[index]);
    } else {
        res.status(404).json({ message: "Book not found" });
    }
});

// DELETE book
app.delete("/books/:id", (req, res) => {
    const index = books.findIndex(b => b.id === req.params.id);
    if (index !== -1) {
        const deleted = books.splice(index, 1);
        res.json(deleted[0]);
    } else {
        res.status(404).json({ message: "Book not found" });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
