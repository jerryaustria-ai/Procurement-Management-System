import crypto from "crypto";

function readApiKey(req) {
  const headerApiKey = String(req.headers["x-api-key"] || "").trim();
  if (headerApiKey) {
    return headerApiKey;
  }

  const authorization = String(req.headers.authorization || "");
  return authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
}

function keysMatch(receivedKey, configuredKey) {
  const receivedBuffer = Buffer.from(receivedKey);
  const configuredBuffer = Buffer.from(configuredKey);

  return (
    receivedBuffer.length === configuredBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, configuredBuffer)
  );
}

export function requireRfpIntegrationApiKey(req, res, next) {
  const configuredKey = String(process.env.RFP_INTEGRATION_API_KEY || "").trim();

  if (!configuredKey) {
    return res.status(503).json({
      message: "RFP integration API is not configured."
    });
  }

  const receivedKey = readApiKey(req);
  if (!receivedKey || !keysMatch(receivedKey, configuredKey)) {
    return res.status(401).json({ message: "Invalid API key." });
  }

  return next();
}
