import multer from "multer";

const MAX_DOCUMENT_UPLOAD_BYTES = 10 * 1024 * 1024;

function fileFilter(_req, file, callback) {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    callback(null, true);
    return;
  }

  callback(new Error("Only image uploads are allowed. Please upload JPG, PNG, or WEBP files."));
}

export const uploadSingleDocument = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: MAX_DOCUMENT_UPLOAD_BYTES - 1
  }
}).single("document");
