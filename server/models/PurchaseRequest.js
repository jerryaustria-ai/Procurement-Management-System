import mongoose from "mongoose";
import { priorityLabels, workflowStages } from "../config/workflow.js";

const historySchema = new mongoose.Schema(
  {
    stage: { type: String, required: true },
    status: {
      type: String,
      enum: ["completed", "current", "ready", "reverted", "rejected"],
      required: true
    },
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
      enum: ["quotation", "po", "invoice", "release", "liquidation", "delivery", "inspection", "other"],
      required: true
    },
    label: { type: String, required: true },
    originalName: { type: String, required: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    storageProvider: { type: String, enum: ["cloudinary", "google-drive", "local"], default: "cloudinary" },
    googleDriveFileId: { type: String, default: "" },
    googleDriveViewUrl: { type: String, default: "" },
    cloudinaryPublicId: { type: String, default: "" },
    cloudinaryResourceType: { type: String, default: "" },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: String, required: true },
    uploadedByRole: { type: String, required: true },
    uploadedAt: { type: Date, required: true, default: Date.now }
  },
  { _id: true }
);

const purchaseOrderLineItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    qty: { type: String, default: "1" },
    unit: { type: String, default: "" },
    description: { type: String, default: "" },
    unitPrice: { type: String, default: "" },
    total: { type: String, default: "" }
  },
  { _id: false }
);

const purchaseOrderDraftSchema = new mongoose.Schema(
  {
    supplier: { type: String, default: "" },
    poNumber: { type: String, default: "" },
    notes: { type: String, default: "" },
    salesTax: { type: String, default: "" },
    shippingHandling: { type: String, default: "" },
    other: { type: String, default: "" },
    lineItems: { type: [purchaseOrderLineItemSchema], default: [] }
  },
  { _id: false }
);

const requestForPaymentDraftSchema = new mongoose.Schema(
  {
    payee: { type: String, default: "" },
    tinNumber: { type: String, default: "" },
    invoiceNumber: { type: String, default: "" },
    paymentStatus: { type: String, default: "" },
    paymentStatusUpdatedAt: { type: Date, default: null },
    dateReleased: { type: Date, default: null },
    amountRequested: { type: String, default: "" },
    dueDate: { type: String, default: "" },
    notes: { type: String, default: "" }
  },
  { _id: false }
);

const purchaseRequestSchema = new mongoose.Schema(
  {
    requestNumber: { type: String, required: true, unique: true },
    rfpNumber: { type: String, unique: true, sparse: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    category: { type: String, default: "General Procurement" },
    branch: { type: String, default: "Januarius Holdings" },
    department: { type: String, default: "" },
    propertyProject: { type: String, default: "" },
    requesterName: { type: String, required: true },
    requesterEmail: { type: String, required: true },
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "PHP" },
    modeOfRelease: { type: String, default: "" },
    bankName: { type: String, default: "" },
    accountName: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    checkNumber: { type: String, default: "" },
    checkDate: { type: Date, default: null },
    priority: {
      type: String,
      enum: Object.keys(priorityLabels),
      default: "medium"
    },
    dateNeeded: { type: Date, default: null },
    expenseDate: { type: Date, default: null },
    deliveryAddress: { type: String, default: "" },
    paymentTerms: { type: String, default: "Net 30" },
    requestedPayeeSupplier: { type: String, default: "" },
    supplier: { type: String, default: "Pending selection" },
    poNumber: { type: String, default: "" },
    invoiceNumber: { type: String, default: "" },
    paymentReference: { type: String, default: "" },
    deliveryDate: { type: Date, default: null },
    workflowStages: { type: [String], default: () => [...workflowStages] },
    skippedWorkflowStages: { type: [String], default: () => [] },
    inspectionStatus: {
      type: String,
      enum: ["pending", "passed", "failed"],
      default: "pending"
    },
    requestedAt: { type: Date, required: true, default: Date.now },
    currentStage: { type: String, enum: workflowStages, required: true },
    approvalCompleted: { type: Boolean, default: false },
    requestForPaymentEnabled: { type: Boolean, default: true },
    filingCompleted: { type: Boolean, default: false },
    status: { type: String, enum: ["open", "completed", "rejected"], default: "open" },
    notes: { type: String, default: "" },
    poDraft: { type: purchaseOrderDraftSchema, default: () => ({}) },
    rfpDraft: { type: requestForPaymentDraftSchema, default: () => ({}) },
    history: [historySchema],
    documents: [documentSchema]
  },
  { timestamps: true }
);

export const PurchaseRequest = mongoose.model("PurchaseRequest", purchaseRequestSchema);
