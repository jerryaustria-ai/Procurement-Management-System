import { Router } from "express";
import fs from "fs";
import {
  getAllowedRoles,
  getNextStage,
  getPreviousStage,
  isTerminalStage,
  workflowStages
} from "../config/workflow.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { uploadSingleDocument } from "../middleware/upload.js";
import { PurchaseRequest } from "../models/PurchaseRequest.js";
import { User } from "../models/User.js";
import { serializePurchaseRequest } from "../utils/serializers.js";

const router = Router();

router.use(requireAuth);

function parseAmountValue(value) {
  if (value === null || typeof value === "undefined") {
    return 0;
  }

  const normalized = String(value).replaceAll(",", "").trim();
  if (!normalized) {
    return 0;
  }

  return Number(normalized);
}

function isRequesterAccessingOwnRequest(req, request) {
  return req.user.role !== "requester" || request.requesterEmail === req.user.email;
}

router.get("/purchase-requests", async (req, res) => {
  const query = req.user.role === "requester" ? { requesterEmail: req.user.email } : {};
  const items = await PurchaseRequest.find(query).sort({ createdAt: -1 });

  res.json({
    stages: workflowStages,
    items: items.map(serializePurchaseRequest)
  });
});

router.post("/purchase-requests", async (req, res) => {
  const {
    requesterEmail,
    title,
    description,
    category,
    branch,
    department,
    amount,
    currency,
    priority,
    dateNeeded,
    deliveryAddress,
    paymentTerms,
    notes
  } = req.body;

  if (!title) {
    return res.status(400).json({ message: "Title is required." });
  }

  let requester = req.user;

  if (req.user.role === "admin") {
    if (!requesterEmail?.trim()) {
      return res.status(400).json({ message: "Requester must be selected from system users." });
    }

    requester = await User.findOne({ email: requesterEmail.trim().toLowerCase() });
    if (!requester) {
      return res.status(400).json({ message: "Selected requester was not found." });
    }
  }

  const count = await PurchaseRequest.countDocuments();
  const requestNumber = `PR-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;
  const parsedAmount = parseAmountValue(amount);

  if (typeof amount !== "undefined" && amount !== "" && Number.isNaN(parsedAmount)) {
    return res.status(400).json({ message: "Amount must be a valid number." });
  }

  const created = await PurchaseRequest.create({
    requestNumber,
    title,
    description: description || "",
    category: category || "General Procurement",
    branch: branch || "Januarius Holdings",
    department: department || "",
    requesterName: requester.name,
    requesterEmail: requester.email,
    amount: parsedAmount,
    currency: currency || "PHP",
    priority: priority || "medium",
    dateNeeded: dateNeeded || null,
    deliveryAddress: deliveryAddress || "",
    paymentTerms: paymentTerms || "Net 30",
    notes: notes || "",
    currentStage: workflowStages[0],
    history: [
      {
        stage: workflowStages[0],
        status: "current",
        updatedAt: new Date(),
        actor: req.user.name,
        actorRole: req.user.role,
        comment: notes || "Purchase request created."
      }
    ]
  });

  return res.status(201).json(serializePurchaseRequest(created));
});

router.patch("/purchase-requests/:id", requireRole("admin"), async (req, res) => {
  const request = await PurchaseRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: "Purchase request not found." });
  }

  const editableFields = [
    "title",
    "description",
    "category",
    "branch",
    "department",
    "currency",
    "priority",
    "deliveryAddress",
    "paymentTerms",
    "supplier",
    "poNumber",
    "invoiceNumber",
    "paymentReference",
    "notes",
    "currentStage",
    "status",
    "inspectionStatus"
  ];

  for (const field of editableFields) {
    if (typeof req.body[field] === "string") {
      request[field] = req.body[field];
    }
  }

  if (typeof req.body.amount !== "undefined") {
    const parsedAmount = parseAmountValue(req.body.amount);
    if (req.body.amount !== "" && Number.isNaN(parsedAmount)) {
      return res.status(400).json({ message: "Amount must be a valid number." });
    }
    request.amount = parsedAmount;
  }

  if (typeof req.body.dateNeeded !== "undefined") {
    request.dateNeeded = req.body.dateNeeded || null;
  }

  if (typeof req.body.deliveryDate !== "undefined") {
    request.deliveryDate = req.body.deliveryDate || null;
  }

  await request.save();
  return res.json(serializePurchaseRequest(request));
});

router.patch("/purchase-requests/:id/advance", async (req, res) => {
  const request = await PurchaseRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: "Purchase request not found." });
  }

  if (!isRequesterAccessingOwnRequest(req, request)) {
    return res.status(403).json({ message: "You can only access your own purchase requests." });
  }

  const allowedRoles = getAllowedRoles(request.currentStage);
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Role ${req.user.role} cannot approve the ${request.currentStage} stage.`
    });
  }

  if (request.currentStage === "Approval" && !request.approvalCompleted) {
    return res.status(400).json({
      message: "Approval must be completed before moving to Supplier Selection."
    });
  }

  const nextStage = getNextStage(request.currentStage);
  request.history = request.history.map((entry) =>
    entry.stage === request.currentStage ? { ...entry.toObject(), status: "completed" } : entry
  );

  if (req.body.supplier) {
    request.supplier = req.body.supplier;
  }

  if (typeof req.body.poNumber === "string") {
    request.poNumber = req.body.poNumber;
  }

  if (typeof req.body.invoiceNumber === "string") {
    request.invoiceNumber = req.body.invoiceNumber;
  }

  if (typeof req.body.paymentReference === "string") {
    request.paymentReference = req.body.paymentReference;
  }

  if (req.body.deliveryDate) {
    request.deliveryDate = req.body.deliveryDate;
  }

  if (typeof req.body.inspectionStatus === "string") {
    request.inspectionStatus = req.body.inspectionStatus;
  }

  if (typeof req.body.notes === "string") {
    request.notes = req.body.notes;
  }

  if (nextStage !== request.currentStage) {
    request.currentStage = nextStage;
    if (nextStage === "Approval") {
      request.approvalCompleted = false;
    }
    request.history.push({
      stage: nextStage,
      status: isTerminalStage(nextStage) ? "completed" : "current",
      updatedAt: new Date(),
      actor: req.user.name,
      actorRole: req.user.role,
      comment: req.body.comment || req.body.notes || `Moved to ${nextStage}`
    });
  }

  if (isTerminalStage(nextStage)) {
    request.status = "completed";
  }

  await request.save();
  return res.json(serializePurchaseRequest(request));
});

router.patch("/purchase-requests/:id/approve", async (req, res) => {
  const request = await PurchaseRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: "Purchase request not found." });
  }

  if (!isRequesterAccessingOwnRequest(req, request)) {
    return res.status(403).json({ message: "You can only access your own purchase requests." });
  }

  if (request.currentStage !== "Approval") {
    return res.status(400).json({ message: "Only Approval stage can be approved." });
  }

  const allowedRoles = getAllowedRoles(request.currentStage);
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Role ${req.user.role} cannot approve the ${request.currentStage} stage.`
    });
  }

  request.approvalCompleted = true;
  request.history = request.history.map((entry) =>
    entry.stage === "Approval" && entry.status === "current"
      ? {
          ...entry.toObject(),
          status: "completed",
          updatedAt: new Date(),
          actor: req.user.name,
          actorRole: req.user.role,
          comment: req.body.comment || req.body.notes || "Approval completed."
        }
      : entry
  );

  if (typeof req.body.notes === "string") {
    request.notes = req.body.notes;
  }

  await request.save();
  return res.json(serializePurchaseRequest(request));
});

router.patch("/purchase-requests/:id/revert", async (req, res) => {
  const request = await PurchaseRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: "Purchase request not found." });
  }

  if (!isRequesterAccessingOwnRequest(req, request)) {
    return res.status(403).json({ message: "You can only access your own purchase requests." });
  }

  const allowedRoles = getAllowedRoles(request.currentStage);
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Role ${req.user.role} cannot move back the ${request.currentStage} stage.`
    });
  }

  const previousStage = getPreviousStage(request.currentStage);
  if (previousStage === request.currentStage) {
    return res.status(400).json({ message: "This request is already at the first stage." });
  }

  request.history = request.history.map((entry) =>
    entry.stage === request.currentStage && entry.status === "current"
      ? { ...entry.toObject(), status: "reverted" }
      : entry
  );

  request.currentStage = previousStage;
  request.approvalCompleted = false;
  request.status = "open";
  request.history.push({
    stage: previousStage,
    status: "current",
    updatedAt: new Date(),
    actor: req.user.name,
    actorRole: req.user.role,
    comment: req.body.comment || `Moved back to ${previousStage}`
  });

  await request.save();
  return res.json(serializePurchaseRequest(request));
});

router.post("/purchase-requests/:id/documents", async (req, res) => {
  const request = await PurchaseRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: "Purchase request not found." });
  }

  if (!isRequesterAccessingOwnRequest(req, request)) {
    return res.status(403).json({ message: "You can only access your own purchase requests." });
  }

  const canUpload =
    req.user.role === "admin" ||
    req.user.email === request.requesterEmail ||
    getAllowedRoles(request.currentStage).includes(req.user.role);

  if (!canUpload) {
    return res.status(403).json({ message: "Your role cannot upload documents for this request." });
  }

  uploadSingleDocument(req, res, async (error) => {
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Document file is required." });
    }

    const documentType = req.body.type || "other";
    const allowedTypes = ["quotation", "po", "invoice", "delivery", "inspection", "other"];

    if (!allowedTypes.includes(documentType)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: "Invalid document type." });
    }

    if (
      documentType === "quotation" &&
      !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(req.file.mimetype)
    ) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ message: "Quotation upload only accepts PDF or image files." });
    }

    const label = req.body.label?.trim() || req.file.originalname;

    request.documents.push({
      type: documentType,
      label,
      originalName: req.file.originalname,
      fileName: req.file.filename,
      filePath: `/uploads/${req.file.filename}`,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user.name,
      uploadedByRole: req.user.role,
      uploadedAt: new Date()
    });

    await request.save();
    return res.status(201).json(serializePurchaseRequest(request));
  });
});

router.delete("/purchase-requests/:id/documents/:documentId", async (req, res) => {
  const request = await PurchaseRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: "Purchase request not found." });
  }

  if (!isRequesterAccessingOwnRequest(req, request)) {
    return res.status(403).json({ message: "You can only access your own purchase requests." });
  }

  const document = request.documents.id(req.params.documentId);
  if (!document) {
    return res.status(404).json({ message: "Document not found." });
  }

  const canDelete =
    req.user.role === "admin" ||
    document.uploadedBy === req.user.name ||
    getAllowedRoles(request.currentStage).includes(req.user.role);

  if (!canDelete) {
    return res.status(403).json({ message: "Your role cannot delete this document." });
  }

  const filePath = document.filePath?.replace("/uploads/", "");
  document.deleteOne();
  await request.save();

  if (filePath) {
    fs.unlink(`uploads/${filePath}`, () => {});
  }

  return res.status(204).send();
});

router.delete("/purchase-requests/:id", requireRole("admin"), async (req, res) => {
  const request = await PurchaseRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: "Purchase request not found." });
  }

  await request.deleteOne();
  return res.status(204).send();
});

export default router;
