import { Router } from "express";
import bcrypt from "bcryptjs";
import { roleLabels } from "../config/workflow.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { serializeUser } from "../utils/serializers.js";

const router = Router();

router.use(requireAuth);

router.get("/me", async (req, res) => {
  return res.json({ user: serializeUser(req.user) });
});

router.patch("/me", async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const { currentPassword, newPassword, notifyOnRequestChanges } = req.body;

  if (typeof notifyOnRequestChanges !== "undefined") {
    user.notifyOnRequestChanges = Boolean(notifyOnRequestChanges);
  }

  if (typeof newPassword === "string" && newPassword.trim()) {
    if (!currentPassword?.trim()) {
      return res.status(400).json({ message: "Current password is required to change your password." });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Current password is incorrect." });
    }

    user.passwordHash = await bcrypt.hash(newPassword.trim(), 10);
  }

  await user.save();
  return res.json({ user: serializeUser(user) });
});

router.use(requireRole("admin"));

router.get("/", async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  return res.json({ items: users.map(serializeUser) });
});

router.post("/", async (req, res) => {
  const { name, email, role, department, password } = req.body;

  if (!name || !email || !role || !password) {
    return res
      .status(400)
      .json({ message: "Name, email, role, and password are required." });
  }

  if (!roleLabels[role]) {
    return res.status(400).json({ message: "Invalid role." });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(409).json({ message: "User email already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const createdUser = await User.create({
    name,
    email: normalizedEmail,
    role,
    department: department || "",
    passwordHash
  });

  return res.status(201).json(serializeUser(createdUser));
});

router.patch("/:id", async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  const { name, email, role, department, password } = req.body;

  if (typeof role === "string" && !roleLabels[role]) {
    return res.status(400).json({ message: "Invalid role." });
  }

  if (typeof email === "string") {
    const normalizedEmail = email.toLowerCase().trim();
    const emailOwner = await User.findOne({ email: normalizedEmail });
    if (emailOwner && emailOwner._id.toString() !== user._id.toString()) {
      return res.status(409).json({ message: "User email already exists." });
    }
    user.email = normalizedEmail;
  }

  if (typeof name === "string") {
    user.name = name;
  }

  if (typeof role === "string") {
    user.role = role;
  }

  if (typeof department === "string") {
    user.department = department;
  }

  if (typeof password === "string" && password.trim()) {
    user.passwordHash = await bcrypt.hash(password, 10);
  }

  await user.save();
  return res.json(serializeUser(user));
});

router.delete("/:id", async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({ message: "You cannot delete your own admin account." });
  }

  await user.deleteOne();
  return res.status(204).send();
});

export default router;
