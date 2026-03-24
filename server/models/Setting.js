import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    logoUrl: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

export const Setting = mongoose.model("Setting", settingSchema);
