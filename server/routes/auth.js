import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { roleLabels } from "../config/workflow.js";
import { User } from "../models/User.js";
import { sendPasswordResetEmail } from "../utils/email.js";
import { serializeUser } from "../utils/serializers.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password, rememberMe } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    return res.status(401).json({ message: "Invalid credentials." });
  }

  const token = jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      email: user.email
    },
    process.env.JWT_SECRET,
    { expiresIn: rememberMe ? "5d" : "8h" }
  );

  return res.json({
    token,
    user: {
      ...serializeUser(user),
      roleLabel: roleLabels[user.role]
    }
  });
});

router.get("/me", async (req, res) => {
  return res.status(405).json({ message: "Use /login to authenticate." });
});

router.post("/forgot-password", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({ message: "No user found with that email." });
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  user.resetPasswordTokenHash = tokenHash;
  user.resetPasswordExpiresAt = expiresAt;
  await user.save();

  const baseUrl = process.env.REQUEST_PORTAL_URL || process.env.CLIENT_ORIGIN || "";
  let resetUrl = "";

  try {
    const url = new URL(baseUrl);
    url.searchParams.set("auth", "reset-password");
    url.searchParams.set("resetToken", rawToken);
    resetUrl = url.toString();
  } catch (_error) {
    resetUrl = "";
  }

  const emailResult = await sendPasswordResetEmail({
    recipientEmail: user.email,
    recipientName: user.name,
    resetUrl
  });

  if (emailResult.skipped) {
    user.resetPasswordTokenHash = "";
    user.resetPasswordExpiresAt = null;
    await user.save();

    return res.status(502).json({
      message: emailResult.reason || "Unable to send the reset email."
    });
  }

  return res.json({
    message: "If the email exists, a password reset link has been sent."
  });
});

router.post("/reset-password", async (req, res) => {
  const token = String(req.body?.token || "").trim();
  const password = String(req.body?.password || "");

  if (!token || !password) {
    return res.status(400).json({ message: "Token and new password are required." });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters long." });
  }

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpiresAt: { $gt: new Date() }
  });

  if (!user) {
    return res.status(400).json({ message: "The reset link is invalid or has expired." });
  }

  user.passwordHash = await bcrypt.hash(password, 10);
  user.resetPasswordTokenHash = "";
  user.resetPasswordExpiresAt = null;
  await user.save();

  return res.json({ message: "Password updated successfully. You may now sign in." });
});

export default router;
