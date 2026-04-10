import "dotenv/config";
import cors from "cors";
import express from "express";
import path from "path";
import { connectDatabase } from "./config/database.js";
import authRoutes from "./routes/auth.js";
import settingsRoutes from "./routes/settings.js";
import supplierRoutes from "./routes/suppliers.js";
import userRoutes from "./routes/users.js";
import workflowRoutes from "./routes/workflows.js";

const app = express();
const HOST = process.env.HOST || "0.0.0.0";
const PORT = process.env.PORT || 5001;
function normalizeOrigin(origin) {
  return String(origin || "").trim().replace(/\/+$/, "");
}

const allowedOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

function matchesWildcardOrigin(origin, allowedPattern) {
  if (!allowedPattern.includes("*")) {
    return false;
  }

  try {
    const originUrl = new URL(origin);
    const patternUrl = new URL(allowedPattern.replace("*.", ""));
    const protocolMatches = originUrl.protocol === patternUrl.protocol;
    const wildcardHost = allowedPattern.replace(`${patternUrl.protocol}//*.`, "");
    const hostMatches =
      originUrl.hostname === wildcardHost || originUrl.hostname.endsWith(`.${wildcardHost}`);

    return protocolMatches && hostMatches;
  } catch (_error) {
    return false;
  }
}

function isAllowedOrigin(origin) {
  const normalizedOrigin = normalizeOrigin(origin);

  if (
    !normalizedOrigin ||
    allowedOrigins.length === 0 ||
    allowedOrigins.includes(normalizedOrigin)
  ) {
    return true;
  }

  // Allow local Vite/React dev servers without needing to update env on every port change.
  if (
    /^https?:\/\/localhost:\d+$/.test(normalizedOrigin) ||
    /^https?:\/\/127\.0\.0\.1:\d+$/.test(normalizedOrigin)
  ) {
    return true;
  }

  if (
    allowedOrigins.some((allowedOrigin) =>
      matchesWildcardOrigin(normalizedOrigin, allowedOrigin),
    )
  ) {
    return true;
  }

  return false;
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      const error = new Error(
        `Origin not allowed by CORS. Received: ${origin || "unknown"}. Allowed: ${
          allowedOrigins.join(", ") || "(none configured)"
        }`
      );
      return callback(error);
    }
  })
);
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "procurement-workflow-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/users", userRoutes);
app.use("/api/workflows", workflowRoutes);

app.use((error, _req, res, next) => {
  if (!error) {
    return next();
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({ message: "Uploaded data is too large." });
  }

  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ message: "Invalid JSON payload." });
  }

  console.error("Unhandled server error.", error);
  return res.status(500).json({ message: "Internal server error." });
});

connectDatabase()
  .then(() => {
    app.listen(PORT, HOST, () => {
      console.log(`Procurement workflow API listening on http://${HOST}:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB.", error.message);
    process.exit(1);
  });
