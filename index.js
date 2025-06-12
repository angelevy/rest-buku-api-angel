import fsSync from "fs";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "data.json");
const UPLOADS_DIR = path.join(__dirname, "uploads");

const app = express();
const express = require('express');
const path = require('path');

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const validateBukuData = (req, res, next) => {
  const { title, author} = req.body;
  const errors = [];
  if (!title?.trim()) errors.push("Title harus diisi");
  if (!author?.trim()) errors.push("author harus diisi");
 
  if (errors.length) {
    return res
      .status(400)
      .json({ error: "Validation failed", details: errors });
  }
  next();
};

const ensureDirectoryExists = async (dir) => {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
};

class BukuService {
  static async readData() {
    try {
      const data = await fs.readFile(DATA_FILE, "utf8");
      return JSON.parse(data);
    } catch (err) {
      if (err.code === "ENOENT") return [];
      throw err;
    }
  }
  static async writeData(data) {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  }
  static async findById(id) {
    const arr = await this.readData();
    return arr.find((x) => x.id === id);
  }
  static async create(dataObj) {
    const arr = await this.readData();
    const item = {
      id: uuidv4(),
      ...dataObj,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    arr.push(item);
    await this.writeData(arr);
    return item;
  }
  static async update(id, dataObj) {
    const arr = await this.readData();
    const idx = arr.findIndex((x) => x.id === id);
    if (idx === -1) return null;
    const updated = {
      ...arr[idx],
      ...dataObj,
      updatedAt: new Date().toISOString(),
    };
    arr[idx] = updated;
    await this.writeData(arr);
    return updated;
  }
  static async delete(id) {
    const arr = await this.readData();
    const idx = arr.findIndex((x) => x.id === id);
    if (idx === -1) return null;
    const [removed] = arr.splice(idx, 1);
    await this.writeData(arr);
    return removed;
  }
}


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fsSync.existsSync(UPLOADS_DIR)) {
      fsSync.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const fileName = `buku-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, fileName);
  }
});
const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/gif"];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else
    cb(new Error("Invalid file type. Only JPEG, PNG, and GIF allowed."), false);
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const deleteOldImage = async (imageUrl) => {
  if (!imageUrl) return;
  try {
    const filename = path.basename(imageUrl);
    await fs.unlink(path.join(UPLOADS_DIR, filename));
  } catch (err) {
    console.warn("Gagal hapus gambar:", err.message);
  }
};

// ---- API Endpoints ----
// Route default
app.get(
  "/",
  asyncHandler(async (req, res) => {
    const buku = await BukuService.readData(); // ✅ fix: ganti readAllBukus()
    res.json({
      message: "Welcome to the Books API",
      data: buku,
    });
  })
);

app.get(
  "/buku",
  asyncHandler(async (req, res) => {
    const buku = await BukuService.readData();
    res.json(buku);
  })
);

app.get(
  "/buku/:id",
  asyncHandler(async (req, res) => {
    const art = await BukuService.findById(req.params.id);
    if (!art) return res.status(404).json({ error: "Buku not found" });
    res.json(art);
  })
);

app.post(
  "/buku",
  upload.single("image"),
  validateBukuData,
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "Image is required" });
    const { title, author} = req.body;
    const image = `${req.protocol}://${req.get("host")}/uploads/${
      req.file.filename
    }`;
    const item = await BukuService.create({
      title: title.trim(),
      author: author.trim(),
      image,
    });
    res.status(201).json({
        status: "success",
        message: "Buku created successfully",
        data: item
    })
  })
);

app.put(
  "/buku/:id",
  upload.single("image"),
  validateBukuData,
  asyncHandler(async (req, res) => {
    const existing = await BukuService.findById(req.params.id);
    if (!existing) {
      if (req.file) await deleteOldImage(`/uploads/${req.file.filename}`);
      return res.status(404).json({ error: "Buku not found" });
    }
    const { title, author } = req.body;
    let image = existing.image;
    if (req.file) {
      await deleteOldImage(existing.image);
      image = `${req.protocol}://${req.get("host")}/uploads/${
        req.file.filename
      }`;
    }
    const updated = await BukuService.update(req.params.id, {
      title: title.trim(),
      author: author.trim(),
      image,
    });
    res.json(updated);
  })
);

app.delete(
  "/buku/:id",
  asyncHandler(async (req, res) => {
    const removed = await BukuService.delete(req.params.id);
    if (!removed) return res.status(404).json({ error: "Buku not found" });
    await deleteOldImage(removed.image);
    res.json({ message: "Deleted successfully", removed });
  })
);

// Error handling

app.use((err, req, res, next) => {
  console.error("Error:", err);
  if (err instanceof multer.MulterError) {
    const msg =
      err.code === "LIMIT_FILE_SIZE" ? "File too large (max 5MB)" : err.message;
    return res.status(400).json({ error: "Upload error", message: msg });
  }
  if (err.message?.includes("Invalid file type")) {
    return res
      .status(400)
      .json({ error: "Invalid file type", message: err.message });
  }
  res.status(500).json({ error: "Internal server error" });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Start

const startServer = async () => {
  await ensureDirectoryExists(UPLOADS_DIR);
  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
  });
};

startServer();
