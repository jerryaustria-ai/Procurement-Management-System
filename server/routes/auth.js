import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { roleLabels } from "../config/workflow.js";
import { User } from "../models/User.js";
import { serializeUser } from "../utils/serializers.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

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
    { expiresIn: "8h" }
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

export default router;
