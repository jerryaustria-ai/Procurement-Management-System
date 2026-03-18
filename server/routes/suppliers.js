import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { Supplier } from "../models/Supplier.js";

const router = Router();

router.use(requireAuth);

router.get("/", async (_req, res) => {
  const items = await Supplier.find().sort({ name: 1 });
  res.json({
    items: items.map((supplier) => ({
      id: supplier._id.toString(),
      name: supplier.name,
      category: supplier.category,
      supplierType: supplier.supplierType,
      contactPerson: supplier.contactPerson,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      notes: supplier.notes,
      createdBy: supplier.createdBy
    }))
  });
});

router.post("/", requireRole("admin"), async (req, res) => {
  const { name, category, supplierType, contactPerson, email, phone, address, notes } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ message: "Supplier name is required." });
  }

  const normalizedName = name.trim();
  const existingSupplier = await Supplier.findOne({ name: normalizedName });
  if (existingSupplier) {
    return res.status(409).json({ message: "Supplier already exists." });
  }

  const created = await Supplier.create({
    name: normalizedName,
    category: category || "Product",
    supplierType: supplierType || "Manufacturer",
    contactPerson: contactPerson || "",
    email: email || "",
    phone: phone || "",
    address: address || "",
    notes: notes || "",
    createdBy: req.user.email
  });

  return res.status(201).json({
    id: created._id.toString(),
    name: created.name,
    category: created.category,
    supplierType: created.supplierType,
    contactPerson: created.contactPerson,
    email: created.email,
    phone: created.phone,
    address: created.address,
    notes: created.notes,
    createdBy: created.createdBy
  });
});

export default router;
