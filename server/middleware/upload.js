import multer from "multer";

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
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: 12 * 1024 * 1024
  }
}).single("document");
