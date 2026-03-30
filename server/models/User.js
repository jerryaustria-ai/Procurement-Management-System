import mongoose from "mongoose";
import { roleLabels } from "../config/workflow.js";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: Object.keys(roleLabels),
      required: true
    },
    department: { type: String, default: "" },
    notifyOnRequestChanges: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
