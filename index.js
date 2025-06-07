const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

let books = require("./data");

// ======== Setup Multer Disk Storage ========
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, "uploads");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, uniqueSuffix + extension);
    }
});
const upload = multer({ storage });

// ======== Middleware ========
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // serve file statis

// ======== Routes ========

// GET all books
app.get("/books", (req, res) => {
    res.json(books);
});

// GET book by ID
app.get("/books/:id", (req, res) => {
    const book = books.find(b => b.id === req.params.id);
    if (book) {
        res.json(book);
    } else {
        res.status(404).json({ message: "Book not found" });
    }
});

// POST new book with image upload
app.post("/books", upload.single("image"), (req, res) => {
    try {
        const { title, author } = req.body;
        const email = req.headers["authorization"] || "user@example.com";
        const image = req.file;

        if (!title || !author || !image) {
            return res.status(400).json({ error: "Title, author, and image are required" });
        }

        const coverUrl = `${req.protocol}://${req.get("host")}/uploads/${image.filename}`;

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
        console.error("POST /books error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// PUT update book
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

// ======== Start Server ========
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
