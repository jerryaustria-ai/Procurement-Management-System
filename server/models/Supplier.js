import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    category: {
      type: String,
      enum: ["Product", "Service", "Contractor"],
      default: "Product",
      trim: true
    },
    supplierType: {
      type: String,
      enum: [
        "Manufacturer",
        "Distributor",
        "Reseller",
        "Wholesaler",
        "Retailer",
        "Service Provider",
        "Contractor",
        "Consultant",
        "Other"
      ],
      default: "Manufacturer",
      trim: true
    },
    contactPerson: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    phone: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    createdBy: { type: String, required: true, trim: true }
  },
  { timestamps: true }
);

export const Supplier = mongoose.model("Supplier", supplierSchema);
