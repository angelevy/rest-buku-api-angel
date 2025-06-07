const express = require("express");
const cors = require("cors");
const multer = require("multer");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Koneksi ke MongoDB
mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

// Schema dan Model Buku
const bookSchema = new mongoose.Schema({
    title: String,
    author: String,
    email: String,
    coverUrl: String,
});

const Book = mongoose.model("Book", bookSchema);

// Middleware
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// GET all books
app.get("/books", async (req, res) => {
    try {
        const email = req.headers['authorization'] || "user@example.com";
        const books = await Book.find({ email });
        res.json(books);
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// GET book by id
app.get("/books/:id", async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (book) {
            res.json(book);
        } else {
            res.status(404).json({ message: "Book not found" });
        }
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// POST new book with image upload
app.post("/books", upload.single("image"), async (req, res) => {
    try {
        const { title, author } = req.body;
        const email = req.headers['authorization'] || "user@example.com";
        const image = req.file;

        if (!title || !author || !image) {
            return res.status(400).json({ error: "Title, author, and image are required" });
        }

        const coverUrl = `data:${image.mimetype};base64,${image.buffer.toString("base64")}`;

        const newBook = new Book({
            title,
            author,
            email,
            coverUrl
        });

        await newBook.save();

        res.json({ status: "success", data: newBook });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// PUT update book
app.put("/books/:id", async (req, res) => {
    try {
        const { title, author, coverUrl, email } = req.body;
        const updatedBook = await Book.findByIdAndUpdate(
            req.params.id,
            { title, author, coverUrl, email },
            { new: true }
        );

        if (updatedBook) {
            res.json(updatedBook);
        } else {
            res.status(404).json({ message: "Book not found" });
        }
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// DELETE book
app.delete("/books/:id", async (req, res) => {
    try {
        const deletedBook = await Book.findByIdAndDelete(req.params.id);
        if (deletedBook) {
            res.json(deletedBook);
        } else {
            res.status(404).json({ message: "Book not found" });
        }
    } catch (err) {
        res.status(500).json({ message: "Server error" });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});