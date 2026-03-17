import mongoose from "mongoose";
import { priorityLabels, workflowStages } from "../config/workflow.js";

const historySchema = new mongoose.Schema(
  {
    stage: { type: String, required: true },
    status: { type: String, enum: ["completed", "current", "ready"], required: true },
    updatedAt: { type: Date, required: true, default: Date.now },
    actor: { type: String, required: true },
    actorRole: { type: String, required: true },
    comment: { type: String, default: "" }
  },
  { _id: false }
);

const documentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["quotation", "po", "invoice", "delivery", "inspection", "other"],
      required: true
    },
    label: { type: String, required: true },
    originalName: { type: String, required: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: String, required: true },
    uploadedByRole: { type: String, required: true },
    uploadedAt: { type: Date, required: true, default: Date.now }
  },
  { _id: true }
);

const purchaseRequestSchema = new mongoose.Schema(
  {
    requestNumber: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    category: { type: String, default: "General Procurement" },
    branch: { type: String, default: "Januarius Holdings" },
    department: { type: String, default: "" },
    requesterName: { type: String, required: true },
    requesterEmail: { type: String, required: true },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "PHP" },
    priority: {
      type: String,
      enum: Object.keys(priorityLabels),
      default: "medium"
    },
    dateNeeded: { type: Date, default: null },
    deliveryAddress: { type: String, default: "" },
    paymentTerms: { type: String, default: "Net 30" },
    supplier: { type: String, default: "Pending selection" },
    poNumber: { type: String, default: "" },
    invoiceNumber: { type: String, default: "" },
    paymentReference: { type: String, default: "" },
    deliveryDate: { type: Date, default: null },
    inspectionStatus: {
      type: String,
      enum: ["pending", "passed", "failed"],
      default: "pending"
    },
    requestedAt: { type: Date, required: true, default: Date.now },
    currentStage: { type: String, enum: workflowStages, required: true },
    status: { type: String, enum: ["open", "completed"], default: "open" },
    notes: { type: String, default: "" },
    history: [historySchema],
    documents: [documentSchema]
  },
  { timestamps: true }
);

export const PurchaseRequest = mongoose.model("PurchaseRequest", purchaseRequestSchema);
