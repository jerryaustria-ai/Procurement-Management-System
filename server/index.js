import "dotenv/config";
import cors from "cors";
import express from "express";
import { connectDatabase } from "./config/database.js";
import authRoutes from "./routes/auth.js";
import workflowRoutes from "./routes/workflows.js";

const app = express();
const HOST = process.env.HOST || "0.0.0.0";
const PORT = process.env.PORT || 5001;
const allowedOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS."));
    }
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "procurement-workflow-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/workflows", workflowRoutes);

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
