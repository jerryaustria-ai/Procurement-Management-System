import fs from "fs";
import path from "path";
import multer from "multer";

const uploadsDir = path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function sanitizeFileName(value) {
  return value.replace(/[^a-zA-Z0-9.-]/g, "_");
}

const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    callback(null, uploadsDir);
  },
  filename(_req, file, callback) {
    const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `${uniquePrefix}-${sanitizeFileName(file.originalname)}`);
  }
});

function fileFilter(_req, file, callback) {
  const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword"
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    callback(null, true);
    return;
  }

  callback(new Error("Only PDF, image, and Word document uploads are allowed."));
}

export const uploadSingleDocument = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
}).single("document");
