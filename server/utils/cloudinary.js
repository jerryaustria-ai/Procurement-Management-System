import crypto from "crypto";

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
  const apiKey = process.env.CLOUDINARY_API_KEY || "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "";
  const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || "januarius-procurement";

  return {
    cloudName,
    apiKey,
    apiSecret,
    folder
  };
}

export function isCloudinaryConfigured() {
  const config = getCloudinaryConfig();
  return Boolean(config.cloudName && config.apiKey && config.apiSecret);
}

function sanitizePublicIdSegment(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-_./]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

function getDocumentTypeFolderName(type) {
  const labels = {
    quotation: "Quotation",
    po: "PO",
    invoice: "Invoice",
    delivery: "Delivery",
    inspection: "Inspection",
    other: "Other"
  };

  return labels[type] || "Other";
}

function createSignature(params, apiSecret) {
  const signatureBase = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return crypto
    .createHash("sha1")
    .update(`${signatureBase}${apiSecret}`)
    .digest("hex");
}

export async function uploadDocumentToCloudinary({
  buffer,
  mimeType,
  originalName,
  requestNumber = "request",
  type = "other"
}) {
  const config = getCloudinaryConfig();

  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const typeFolder = `${config.folder}/${getDocumentTypeFolderName(type)}`;
  const publicId = `${typeFolder}/${sanitizePublicIdSegment(requestNumber)}/${type}-${timestamp}-${sanitizePublicIdSegment(
    originalName.replace(/\.[^.]+$/, "")
  )}`;
  const paramsToSign = {
    folder: typeFolder,
    public_id: publicId,
    timestamp
  };
  const signature = createSignature(paramsToSign, config.apiSecret);
  const formData = new FormData();

  formData.append("file", new Blob([buffer], { type: mimeType }), originalName);
  formData.append("api_key", config.apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("folder", typeFolder);
  formData.append("public_id", publicId);
  formData.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/auto/upload`, {
    method: "POST",
    body: formData
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error?.message || "Failed to upload file to Cloudinary.");
  }

  return {
    publicId: data.public_id,
    resourceType: data.resource_type || "raw",
    fileUrl: data.secure_url,
    bytes: data.bytes || buffer.length
  };
}

export async function deleteDocumentFromCloudinary(publicId, resourceType = "raw") {
  const config = getCloudinaryConfig();

  if (!publicId || !isCloudinaryConfigured()) {
    return;
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    invalidate: true,
    public_id: publicId,
    timestamp
  };
  const signature = createSignature(paramsToSign, config.apiSecret);
  const formData = new FormData();

  formData.append("public_id", publicId);
  formData.append("invalidate", "true");
  formData.append("api_key", config.apiKey);
  formData.append("timestamp", String(timestamp));
  formData.append("signature", signature);

  await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/destroy`, {
    method: "POST",
    body: formData
  });
}
