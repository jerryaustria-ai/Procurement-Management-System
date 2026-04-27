import multer from "multer";

const MAX_DOCUMENT_UPLOAD_BYTES = 10 * 1024 * 1024;

function fileFilter(_req, file, callback) {
  const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "text/plain"
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    callback(null, true);
    return;
  }

  callback(new Error("Unsupported file type. Please upload an image, PDF, Word, Excel, CSV, or text file."));
}

export const uploadSingleDocument = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: MAX_DOCUMENT_UPLOAD_BYTES - 1
  }
}).single("document");
