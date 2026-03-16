import { Router } from "express";
import { getAllowedRoles, getNextStage, isTerminalStage, workflowStages } from "../config/workflow.js";
import { requireAuth } from "../middleware/auth.js";
import { PurchaseRequest } from "../models/PurchaseRequest.js";
import { serializePurchaseRequest } from "../utils/serializers.js";

const router = Router();

router.use(requireAuth);

router.get("/purchase-requests", async (_req, res) => {
  const items = await PurchaseRequest.find().sort({ createdAt: -1 });

  res.json({
    stages: workflowStages,
    items: items.map(serializePurchaseRequest)
  });
});

router.post("/purchase-requests", async (req, res) => {
  const {
    title,
    description,
    category,
    department,
    amount,
    currency,
    priority,
    dateNeeded,
    deliveryAddress,
    paymentTerms,
    notes
  } = req.body;

  if (!title || !department || !amount) {
    return res.status(400).json({ message: "Title, department, and amount are required." });
  }

  const count = await PurchaseRequest.countDocuments();
  const requestNumber = `PR-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

  const created = await PurchaseRequest.create({
    requestNumber,
    title,
    description: description || "",
    category: category || "General Procurement",
    department,
    requesterName: req.user.name,
    requesterEmail: req.user.email,
    amount: Number(amount),
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

router.patch("/purchase-requests/:id/advance", async (req, res) => {
  const request = await PurchaseRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: "Purchase request not found." });
  }

  const allowedRoles = getAllowedRoles(request.currentStage);
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Role ${req.user.role} cannot approve the ${request.currentStage} stage.`
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

export default router;
