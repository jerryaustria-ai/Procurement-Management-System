import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { Supplier } from "../models/Supplier.js";

const router = Router();

router.use(requireAuth);

function serializeSupplier(supplier) {
  return {
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
  };
}

router.get("/", async (_req, res) => {
  const items = await Supplier.find().sort({ name: 1 });
  res.json({
    items: items.map(serializeSupplier)
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

  return res.status(201).json(serializeSupplier(created));
});

router.patch("/:id", requireRole("admin"), async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);

  if (!supplier) {
    return res.status(404).json({ message: "Supplier not found." });
  }

  if (!req.body.name?.trim()) {
    return res.status(400).json({ message: "Supplier name is required." });
  }

  const normalizedName = req.body.name.trim();
  const existingSupplier = await Supplier.findOne({
    name: normalizedName,
    _id: { $ne: supplier._id }
  });

  if (existingSupplier) {
    return res.status(409).json({ message: "Supplier already exists." });
  }

  supplier.name = normalizedName;
  supplier.category = req.body.category || "Product";
  supplier.supplierType = req.body.supplierType || "Manufacturer";
  supplier.contactPerson = req.body.contactPerson || "";
  supplier.email = req.body.email || "";
  supplier.phone = req.body.phone || "";
  supplier.address = req.body.address || "";
  supplier.notes = req.body.notes || "";

  await supplier.save();
  return res.json(serializeSupplier(supplier));
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);

  if (!supplier) {
    return res.status(404).json({ message: "Supplier not found." });
  }

  await supplier.deleteOne();
  return res.status(204).send();
});

export default router;
