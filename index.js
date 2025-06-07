// index.js
const express = require("express");
const cors = require("cors");
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });
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
app.post('/books', upload.single('image'), (req, res) => {
    try {
        const title = req.body.title;
        const author = req.body.author;
        const email = req.headers['authorization'] || "user@example.com";
        const image = req.file;

        if (!title || !author || !image) {
            return res.status(400).json({ error: 'Title, author and image are required' });
        }

        const coverUrl = `data:${image.mimetype};base64,${image.buffer.toString("base64")}`;

        const newBook = {
            id: Date.now().toString(),
            title,
            author,
            email,
            coverUrl
        };

        books.push(newBook);

        res.json({ status: "success", data: newBook });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
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
