import crypto from "crypto";

function getGoogleDriveConfig() {
  return {
    clientEmail: process.env.GOOGLE_DRIVE_CLIENT_EMAIL || "",
    privateKey: String(process.env.GOOGLE_DRIVE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || ""
  };
}

export function isGoogleDriveConfigured() {
  const config = getGoogleDriveConfig();
  return Boolean(config.clientEmail && config.privateKey);
}

function toBase64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createJwtAssertion(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT"
  };
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.createSign("RSA-SHA256").update(unsignedToken).sign(privateKey, "base64");
  const encodedSignature = signature
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  return `${unsignedToken}.${encodedSignature}`;
}

async function getGoogleDriveAccessToken() {
  const config = getGoogleDriveConfig();

  if (!isGoogleDriveConfigured()) {
    throw new Error(
      "Google Drive is not configured. Set GOOGLE_DRIVE_CLIENT_EMAIL and GOOGLE_DRIVE_PRIVATE_KEY."
    );
  }

  const assertion = createJwtAssertion(config.clientEmail, config.privateKey);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "Failed to get Google Drive access token.");
  }

  return data.access_token;
}

function sanitizeFileNameSegment(value) {
  return String(value || "")
    .replace(/[^\w.\- ]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function buildGoogleDriveFileName({ requestNumber, type, originalName }) {
  const timestamp = Date.now();
  const safeOriginalName = sanitizeFileNameSegment(originalName || "attachment");
  return `${requestNumber || "request"}-${type || "other"}-${timestamp}-${safeOriginalName}`;
}

function buildGoogleDriveDownloadUrl(fileId) {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

function buildGoogleDriveViewUrl(fileId) {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

async function makeFilePublic(fileId, accessToken) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        role: "reader",
        type: "anyone"
      })
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error?.message || "Failed to set Google Drive file permission.");
  }
}

export async function uploadDocumentToGoogleDrive({
  buffer,
  mimeType,
  originalName,
  requestNumber = "request",
  type = "other"
}) {
  const config = getGoogleDriveConfig();
  const accessToken = await getGoogleDriveAccessToken();
  const boundary = `drive-upload-${crypto.randomUUID()}`;
  const metadata = {
    name: buildGoogleDriveFileName({ requestNumber, type, originalName }),
    ...(config.folderId ? { parents: [config.folderId] } : {})
  };

  const metadataPart = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`
  );
  const fileHeaderPart = Buffer.from(
    `--${boundary}\r\nContent-Type: ${mimeType}\r\nContent-Transfer-Encoding: binary\r\n\r\n`
  );
  const fileFooterPart = Buffer.from(`\r\n--${boundary}--`);
  const multipartBody = Buffer.concat([metadataPart, fileHeaderPart, Buffer.from(buffer), fileFooterPart]);

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,size,mimeType&supportsAllDrives=true",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    }
  );
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.id) {
    throw new Error(data.error?.message || "Failed to upload file to Google Drive.");
  }

  await makeFilePublic(data.id, accessToken);

  return {
    fileId: data.id,
    fileName: data.name || metadata.name,
    fileUrl: buildGoogleDriveDownloadUrl(data.id),
    viewUrl: buildGoogleDriveViewUrl(data.id),
    bytes: Number(data.size) || buffer.length,
    mimeType: data.mimeType || mimeType
  };
}

export async function downloadDocumentFromGoogleDrive(fileId) {
  if (!fileId) {
    throw new Error("Google Drive file ID is required.");
  }

  const accessToken = await getGoogleDriveAccessToken();
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error?.message || "Failed to download file from Google Drive.");
  }

  return response;
}

export async function deleteDocumentFromGoogleDrive(fileId) {
  if (!fileId || !isGoogleDriveConfigured()) {
    return;
  }

  const accessToken = await getGoogleDriveAccessToken();
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  );

  if (!response.ok && response.status !== 404) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error?.message || "Failed to delete file from Google Drive.");
  }
}
