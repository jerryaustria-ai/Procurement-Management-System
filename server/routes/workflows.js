import { Router } from "express";
import fs from "fs";
import {
  getAllowedRoles,
  getNextStage,
  getPreviousStage,
  isTerminalStage,
  normalizeWorkflowStageOrder,
  workflowStages
} from "../config/workflow.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { uploadSingleDocument } from "../middleware/upload.js";
import { PurchaseRequest } from "../models/PurchaseRequest.js";
import { Setting } from "../models/Setting.js";
import { User } from "../models/User.js";
import {
  deleteDocumentFromCloudinary,
  isCloudinaryConfigured,
  uploadDocumentToCloudinary
} from "../utils/cloudinary.js";
import {
  sendAccountantRfpApprovedEmail,
  getEmailConfigurationStatus,
  sendApproverApprovalRequiredEmail,
  sendNewRequestCreatedEmail,
  sendTestEmail
} from "../utils/email.js";
import { serializePurchaseRequest } from "../utils/serializers.js";

const router = Router();
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

router.use(requireAuth);

function getRequestWorkflowStages(request) {
  return normalizeWorkflowStageOrder(request?.workflowStages, workflowStages);
}

function getPaidStatusReferenceDate(request) {
  return request?.rfpDraft?.paymentStatusUpdatedAt || request?.updatedAt || null;
}

function isPaidPaymentStatusLockedForAccountant(req, request, nextPaymentStatus) {
  if (req.user.role !== "accountant") {
    return false;
  }

  const currentPaymentStatus = String(request?.rfpDraft?.paymentStatus || "").trim().toLowerCase();
  const normalizedNextPaymentStatus = String(nextPaymentStatus || "").trim().toLowerCase();

  if (currentPaymentStatus !== "paid" || normalizedNextPaymentStatus === currentPaymentStatus) {
    return false;
  }

  const paidReferenceDate = getPaidStatusReferenceDate(request);
  if (!paidReferenceDate) {
    return false;
  }

  return Date.now() - new Date(paidReferenceDate).getTime() > ONE_DAY_MS;
}

async function getConfiguredWorkflowStages() {
  const globalSetting = await Setting.findOne({ key: "global" }).select("workflowStages");

  return normalizeWorkflowStageOrder(globalSetting?.workflowStages, workflowStages);
}

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

function canEditRequest(req, request) {
  if (req.user.role === "admin") {
    return true;
  }

  if (request.requesterEmail !== req.user.email) {
    return false;
  }

  return !request.approvalCompleted && !["completed", "rejected"].includes(request.status);
}

function canDeleteRequest(req, request) {
  if (req.user.role === "admin") {
    return true;
  }

  if (req.user.role !== "requester") {
    return false;
  }

  return (
    request.requesterEmail === req.user.email &&
    ["Purchase Request", "Review"].includes(request.currentStage) &&
    !["completed", "rejected"].includes(request.status)
  );
}

function canManageRequestDrafts(req, request) {
  return (
    req.user.role === "admin" ||
    request.requesterEmail === req.user.email ||
    getAllowedRoles(request.currentStage).includes(req.user.role)
  );
}

function canManageRequestForPaymentDraft(req, request) {
  if (req.user.role === "admin" || req.user.role === "accountant") {
    return true;
  }

  if (request.requesterEmail !== req.user.email) {
    return false;
  }

  const requesterLockedStages = new Set([
    "Prepare PO",
    "Approve PO",
    "Send PO",
    "Delivery",
    "Inspection",
    "Invoice",
    "Matching",
    "Payment",
    "Filing"
  ]);

  return (
    !request.approvalCompleted &&
    !["completed", "rejected"].includes(request.status) &&
    !requesterLockedStages.has(request.currentStage)
  );
}

async function getNextRequestNumber() {
  const currentYear = new Date().getFullYear();
  const prefix = `PR-${currentYear}-`;
  const latestRequest = await PurchaseRequest.findOne({
    requestNumber: { $regex: `^${prefix}` }
  })
    .sort({ requestNumber: -1 })
    .select("requestNumber");

  const latestSequence = latestRequest?.requestNumber
    ? Number(latestRequest.requestNumber.slice(prefix.length))
    : 0;
  const nextSequence = Number.isFinite(latestSequence) ? latestSequence + 1 : 1;

  return `${prefix}${String(nextSequence).padStart(3, "0")}`;
}

router.get("/purchase-requests", async (req, res) => {
  const query = req.user.role === "requester" ? { requesterEmail: req.user.email } : {};
  const configuredWorkflowStages = await getConfiguredWorkflowStages();
  const items = await PurchaseRequest.find(query).sort({ createdAt: -1 });

  res.json({
    stages: configuredWorkflowStages,
    items: items.map(serializePurchaseRequest)
  });
});

router.post("/purchase-requests", async (req, res) => {
  try {
    const {
      requesterEmail,
      title,
      description,
      category,
      branch,
      supplier,
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

    const requestNumber = await getNextRequestNumber();
    const requestWorkflowStages = await getConfiguredWorkflowStages();
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
      requestedPayeeSupplier: supplier?.trim() || "",
      supplier: supplier?.trim() || "Pending selection",
      notes: notes || "",
      workflowStages: requestWorkflowStages,
      currentStage: requestWorkflowStages[0],
      requestForPaymentEnabled: true,
      history: [
        {
          stage: requestWorkflowStages[0],
          status: "current",
          updatedAt: new Date(),
          actor: req.user.name,
          actorRole: req.user.role,
          comment: notes || "Purchase request created."
        }
      ]
    });

    const notificationRecipients = await User.find({
      role: "admin"
    }).select("email");

    const recipientEmails = [
      requester.email,
      ...notificationRecipients.map((user) => user.email)
    ];

    sendNewRequestCreatedEmail({
      request: created,
      requesterName: requester.name,
      requesterEmail: requester.email,
      recipients: recipientEmails
    })
      .then((result) => {
        if (result?.skipped) {
          console.warn("Skipped new request email notification.", result.reason || "Unknown reason.");
        }
      })
      .catch((error) => {
        console.error("Failed to send new request email notification.", error);
    });

    return res.status(201).json(serializePurchaseRequest(created));
  } catch (error) {
    console.error("Failed to create purchase request.", error);

    if (error?.code === 11000) {
      return res.status(409).json({
        message: "A purchase request with the same request number already exists. Please try again."
      });
    }

    return res.status(500).json({ message: "Failed to create purchase request." });
  }
});

router.get("/notifications/email-status", requireRole("admin"), async (_req, res) => {
  const status = getEmailConfigurationStatus();

  return res.json({
    configured: status.configured,
    missingKeys: status.missingKeys
  });
});

router.post("/notifications/test-email", requireRole("admin"), async (req, res) => {
  try {
    const recipientEmail = String(req.body?.recipientEmail || req.user.email || "")
      .trim()
      .toLowerCase();

    if (!recipientEmail) {
      return res.status(400).json({ message: "Recipient email is required." });
    }

    const result = await sendTestEmail({
      recipientEmail,
      requestedByName: req.user.name
    });

    if (result?.skipped) {
      return res.status(400).json({
        message: result.reason || "Test email was skipped."
      });
    }

    return res.json({
      message: `Test email sent to ${recipientEmail}.`
    });
  } catch (error) {
    console.error("Failed to send test email.", error);
    return res.status(500).json({ message: "Failed to send test email." });
  }
});

router.patch("/purchase-requests/:id", async (req, res) => {
  const request = await PurchaseRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: "Purchase request not found." });
  }

  if (!canEditRequest(req, request)) {
    return res.status(403).json({ message: "Only the requester or an admin can edit this request." });
  }

  const editableFields =
    req.user.role === "admin"
      ? [
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
        ]
      : ["title", "description", "branch", "department", "notes"];

  const isCompletedStageSelection =
    req.user.role === "admin" && req.body.currentStage === "Completed";
  const isRejectedStageSelection =
    req.user.role === "admin" && req.body.currentStage === "Rejected";
  const shouldResetRfpStatusForApproval =
    req.user.role === "admin" &&
    typeof req.body.currentStage === "string" &&
    req.body.currentStage === "Approval";

  for (const field of editableFields) {
    if (typeof req.body[field] === "string") {
      if (field === "currentStage" && isCompletedStageSelection) {
        request.currentStage = "Filing";
        continue;
      }
      if (field === "currentStage" && isRejectedStageSelection) {
        continue;
      }
      request[field] = req.body[field];
    }
  }

  if (req.user.role === "admin" && typeof req.body.supplier === "string") {
    request.requestedPayeeSupplier = req.body.supplier.trim();
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

  if (req.user.role === "admin" && typeof req.body.deliveryDate !== "undefined") {
    request.deliveryDate = req.body.deliveryDate || null;
  }

  if (req.user.role === "admin") {
    if (isCompletedStageSelection) {
      request.status = "completed";
      request.filingCompleted = true;
      request.approvalCompleted = true;
    } else if (req.body.status === "open") {
      request.status = "open";
      request.filingCompleted = false;
      if (request.currentStage === "Approval") {
        request.approvalCompleted = false;
      }
    } else if (req.body.status === "rejected") {
      request.status = "rejected";
      request.filingCompleted = false;
      request.approvalCompleted = false;
    }

    if (shouldResetRfpStatusForApproval) {
      request.status = "open";
      request.filingCompleted = false;
      request.approvalCompleted = false;
      request.requestForPaymentEnabled = true;
      request.rfpDraft = {
        ...(request.rfpDraft?.toObject?.() || request.rfpDraft || {}),
        paymentStatus: "Processing",
        paymentStatusUpdatedAt: new Date()
      };
    }
  }

  await request.save();

  return res.json(serializePurchaseRequest(request));
});

router.patch("/purchase-requests/:id/po-draft", async (req, res) => {
  const request = await PurchaseRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: "Purchase request not found." });
  }

  if (!canManageRequestDrafts(req, request)) {
    return res.status(403).json({ message: "Your role cannot update the purchase order draft." });
  }

  const lineItems = Array.isArray(req.body.lineItems)
    ? req.body.lineItems.map((lineItem, index) => ({
        id: String(lineItem.id || `${Date.now()}-${index}`),
        qty: String(lineItem.qty ?? ""),
        unit: String(lineItem.unit ?? ""),
        description: String(lineItem.description ?? ""),
        unitPrice: String(lineItem.unitPrice ?? ""),
        total: String(lineItem.total ?? "")
      }))
    : [];

  request.poDraft = {
    supplier: String(req.body.supplier ?? ""),
    poNumber: String(req.body.poNumber ?? ""),
    notes: String(req.body.notes ?? ""),
    salesTax: String(req.body.salesTax ?? ""),
    shippingHandling: String(req.body.shippingHandling ?? ""),
    other: String(req.body.other ?? ""),
    lineItems
  };

  if (typeof req.body.supplier === "string") {
    request.supplier = req.body.supplier;
  }

  if (typeof req.body.poNumber === "string") {
    request.poNumber = req.body.poNumber;
  }

  if (typeof req.body.notes === "string") {
    request.notes = req.body.notes;
  }

  if (typeof req.body.supplier === "string") {
    const trimmedSupplier = req.body.supplier.trim();
    request.supplier = trimmedSupplier || request.supplier;
    request.requestedPayeeSupplier = trimmedSupplier;
  }

  await request.save();
  return res.json(serializePurchaseRequest(request));
});

router.patch("/purchase-requests/:id/rfp-draft", async (req, res) => {
  const request = await PurchaseRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: "Purchase request not found." });
  }

  if (!canManageRequestForPaymentDraft(req, request)) {
    return res.status(403).json({ message: "Your role cannot update the request for payment draft." });
  }

  const previousPaymentStatus = String(request.rfpDraft?.paymentStatus || "").trim();
  const nextPaymentStatus = String(req.body.paymentStatus ?? "").trim();

  if (isPaidPaymentStatusLockedForAccountant(req, request, nextPaymentStatus)) {
    return res.status(400).json({
      message: "Paid payment status can no longer be changed after one day."
    });
  }

  const paymentStatusChanged =
    nextPaymentStatus &&
    nextPaymentStatus.toLowerCase() !== previousPaymentStatus.toLowerCase();
  const paymentStatusUpdatedAt =
    paymentStatusChanged
      ? new Date()
      : request.rfpDraft?.paymentStatusUpdatedAt ||
        (nextPaymentStatus.toLowerCase() === "paid" ? getPaidStatusReferenceDate(request) : null);

  request.rfpDraft = {
    payee: String(req.body.payee ?? ""),
    tinNumber: String(req.body.tinNumber ?? ""),
    invoiceNumber: String(req.body.invoiceNumber ?? ""),
    paymentStatus: nextPaymentStatus,
    paymentStatusUpdatedAt,
    amountRequested: String(req.body.amountRequested ?? ""),
    dueDate: String(req.body.dueDate ?? ""),
    notes: String(req.body.notes ?? "")
  };

  if (typeof req.body.payee === "string" && req.body.payee.trim()) {
    request.supplier = req.body.payee.trim();
  }

  if (typeof req.body.invoiceNumber === "string") {
    request.invoiceNumber = req.body.invoiceNumber;
  }

  await request.save();
  return res.json(serializePurchaseRequest(request));
});

router.patch("/purchase-requests/:id/rfp-access", async (req, res) => {
  const request = await PurchaseRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: "Purchase request not found." });
  }

  if (!isRequesterAccessingOwnRequest(req, request)) {
    return res.status(403).json({ message: "You can only access your own purchase requests." });
  }

  if (request.currentStage !== "Approval") {
    return res.status(400).json({ message: "RFP access can only be changed during Approval stage." });
  }

  const allowedRoles = getAllowedRoles(request.currentStage);
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Role ${req.user.role} cannot update RFP access during the ${request.currentStage} stage.`
    });
  }

  request.requestForPaymentEnabled = Boolean(req.body.enabled);
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

  if (request.status === "rejected") {
    return res.status(400).json({ message: "Rejected requests can no longer move through the workflow." });
  }

  const allowedRoles = getAllowedRoles(request.currentStage);
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Role ${req.user.role} cannot approve the ${request.currentStage} stage.`
    });
  }

  const requestWorkflowStages = getRequestWorkflowStages(request);
  const nextStage = getNextStage(request.currentStage, requestWorkflowStages);
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

  if (req.body.poDraft && typeof req.body.poDraft === "object") {
    const draft = req.body.poDraft;
    request.poDraft = {
      supplier: String(draft.supplier ?? ""),
      poNumber: String(draft.poNumber ?? ""),
      notes: String(draft.notes ?? ""),
      salesTax: String(draft.salesTax ?? ""),
      shippingHandling: String(draft.shippingHandling ?? ""),
      other: String(draft.other ?? ""),
      lineItems: Array.isArray(draft.lineItems)
        ? draft.lineItems.map((lineItem, index) => ({
            id: String(lineItem.id || `${Date.now()}-${index}`),
            qty: String(lineItem.qty ?? ""),
            unit: String(lineItem.unit ?? ""),
            description: String(lineItem.description ?? ""),
            unitPrice: String(lineItem.unitPrice ?? ""),
            total: String(lineItem.total ?? "")
          }))
        : []
    };
  }

  if (isTerminalStage(request.currentStage, requestWorkflowStages)) {
    request.history = request.history.map((entry) =>
      entry.stage === request.currentStage && entry.status === "current"
        ? {
            ...entry.toObject(),
            status: "completed",
            updatedAt: new Date(),
            actor: req.user.name,
            actorRole: req.user.role,
            comment: req.body.comment || req.body.notes || "Workflow completed."
          }
        : entry
    );

    request.filingCompleted = true;
    request.status = "completed";

    await request.save();
    return res.json(serializePurchaseRequest(request));
  }

  const shouldNotifyApprover = nextStage === "Approval" && Boolean(req.body.notifyApprover);
  let approvalCompletedByAdvance = false;

  if (nextStage !== request.currentStage) {
    const previousStage = request.currentStage;
    request.currentStage = nextStage;
    if (nextStage === "Approval") {
      request.approvalCompleted = false;
    }
    if (previousStage === "Approval") {
      request.approvalCompleted = true;
      request.requestForPaymentEnabled = true;
      approvalCompletedByAdvance = true;
    }
    if (previousStage === "Approve PO") {
      request.requestForPaymentEnabled = true;
    }
    if (nextStage === "Filing") {
      request.filingCompleted = false;
      request.status = "open";
    }
    request.history.push({
      stage: nextStage,
      status: "current",
      updatedAt: new Date(),
      actor: req.user.name,
      actorRole: req.user.role,
      comment: req.body.comment || req.body.notes || `Moved to ${nextStage}`
    });
  }

  await request.save();
  let approverNotification = {
    requested: false
  };
  let accountantNotification = {
    requested: false
  };

  if (shouldNotifyApprover) {
    approverNotification.requested = true;

    try {
      const approverRecipients = await User.find({ role: "approver" }).select("email");
      const notificationResult = await sendApproverApprovalRequiredEmail({
        request,
        actorName: req.user.name,
        requesterName: request.requesterName,
        recipients: approverRecipients.map((user) => user.email)
      });

      approverNotification = {
        ...approverNotification,
        ...notificationResult
      };

      if (notificationResult?.skipped) {
        console.warn(
          "Skipped approver approval notification.",
          notificationResult.reason || "Unknown reason."
        );
      }
    } catch (error) {
      console.error("Failed to send approver approval notification.", error);
      approverNotification = {
        ...approverNotification,
        skipped: true,
        reason: error.message || "Failed to send approver approval notification."
      };
    }
  }

  if (approvalCompletedByAdvance) {
    accountantNotification.requested = true;

    try {
      const accountantRecipients = await User.find({ role: "accountant" }).select("email");
      const notificationResult = await sendAccountantRfpApprovedEmail({
        request,
        approverName: req.user.name,
        recipients: accountantRecipients.map((user) => user.email)
      });

      accountantNotification = {
        ...accountantNotification,
        ...notificationResult
      };

      if (notificationResult?.skipped) {
        console.warn(
          "Skipped accountant RFP approval notification.",
          notificationResult.reason || "Unknown reason."
        );
      }
    } catch (error) {
      console.error("Failed to send accountant RFP approval notification.", error);
      accountantNotification = {
        ...accountantNotification,
        skipped: true,
        reason: error.message || "Failed to send accountant RFP approval notification."
      };
    }
  }

  return res.json({
    ...serializePurchaseRequest(request),
    approverNotification,
    accountantNotification
  });
});

router.patch("/purchase-requests/:id/reject", async (req, res) => {
  const request = await PurchaseRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: "Purchase request not found." });
  }

  if (!isRequesterAccessingOwnRequest(req, request)) {
    return res.status(403).json({ message: "You can only access your own purchase requests." });
  }

  if (!["Review", "Approval"].includes(request.currentStage)) {
    return res.status(400).json({ message: "Only Review or Approval stage can be declined." });
  }

  const allowedRoles = getAllowedRoles(request.currentStage);
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Role ${req.user.role} cannot decline the ${request.currentStage} stage.`
    });
  }

  request.status = "rejected";
  request.approvalCompleted = false;
  request.requestForPaymentEnabled = false;
  request.filingCompleted = false;

  request.history = request.history.map((entry) =>
    entry.stage === request.currentStage && entry.status === "current"
      ? {
          ...entry.toObject(),
          status: "rejected",
          updatedAt: new Date(),
          actor: req.user.name,
          actorRole: req.user.role,
          comment: req.body.comment || req.body.notes || `${request.currentStage} declined.`
        }
      : entry
  );

  if (typeof req.body.notes === "string") {
    request.notes = req.body.notes;
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
  request.requestForPaymentEnabled = true;
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

  const requestWorkflowStages = getRequestWorkflowStages(request);
  const previousStage = getPreviousStage(request.currentStage, requestWorkflowStages);
  if (previousStage === request.currentStage) {
    return res.status(400).json({ message: "This request is already at the first stage." });
  }

  request.history = request.history.map((entry) =>
    entry.stage === request.currentStage && entry.status === "current"
      ? { ...entry.toObject(), status: "reverted" }
      : entry
  );

  const previousStageIndex = requestWorkflowStages.indexOf(previousStage);
  const resetComment = req.body.comment || `Moved back to ${previousStage}`;

  requestWorkflowStages.slice(previousStageIndex + 1).forEach((stage) => {
    request.history.push({
      stage,
      status: "reverted",
      updatedAt: new Date(),
      actor: req.user.name,
      actorRole: req.user.role,
      comment: `Reset after moving back to ${previousStage}`
    });
  });

  request.currentStage = previousStage;
  request.approvalCompleted = false;
  request.requestForPaymentEnabled = true;
  request.filingCompleted = false;
  request.status = "open";
  request.history.push({
    stage: previousStage,
    status: "current",
    updatedAt: new Date(),
    actor: req.user.name,
    actorRole: req.user.role,
    comment: resetComment
  });

  await request.save();
  return res.json(serializePurchaseRequest(request));
});

router.post("/purchase-requests/:id/documents", async (req, res) => {
  const request = await PurchaseRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: "Purchase request not found." });
  }

  const canUpload =
    req.user.role === "admin" ||
    req.user.role === "accountant" ||
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
      return res.status(400).json({ message: "Invalid document type." });
    }

    if (
      documentType === "quotation" &&
      !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(req.file.mimetype)
    ) {
      return res.status(400).json({ message: "Quotation upload only accepts PDF or image files." });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(500).json({
        message:
          "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
      });
    }

    let uploadedFile;

    try {
      uploadedFile = await uploadDocumentToCloudinary({
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
        originalName: req.file.originalname,
        requestNumber: request.requestNumber,
        type: documentType
      });
    } catch (uploadError) {
      return res.status(400).json({ message: uploadError.message });
    }

    const label = req.body.label?.trim() || req.file.originalname;

    request.documents.push({
      type: documentType,
      label,
      originalName: req.file.originalname,
      fileName: uploadedFile.publicId,
      filePath: uploadedFile.fileUrl,
      cloudinaryPublicId: uploadedFile.publicId,
      cloudinaryResourceType: uploadedFile.resourceType,
      mimeType: req.file.mimetype,
      size: uploadedFile.bytes,
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

  const document = request.documents.id(req.params.documentId);
  if (!document) {
    return res.status(404).json({ message: "Document not found." });
  }

  const canAccessInvoiceDocument =
    document.type === "invoice" && canManageRequestForPaymentDraft(req, request);

  if (!isRequesterAccessingOwnRequest(req, request) && !canAccessInvoiceDocument && req.user.role !== "admin") {
    return res.status(403).json({ message: "You can only access your own purchase requests." });
  }

  const canDelete =
    req.user.role === "admin" ||
    document.uploadedBy === req.user.name ||
    getAllowedRoles(request.currentStage).includes(req.user.role) ||
    canAccessInvoiceDocument;

  if (!canDelete) {
    return res.status(403).json({ message: "Your role cannot delete this document." });
  }

  const filePath = document.filePath?.replace("/uploads/", "");
  const cloudinaryPublicId = document.cloudinaryPublicId;
  const cloudinaryResourceType = document.cloudinaryResourceType || "raw";
  document.deleteOne();
  await request.save();

  if (cloudinaryPublicId) {
    void deleteDocumentFromCloudinary(cloudinaryPublicId, cloudinaryResourceType);
  } else if (filePath) {
    fs.unlink(`uploads/${filePath}`, () => {});
  }

  return res.status(204).send();
});

router.delete("/purchase-requests/:id", async (req, res) => {
  const request = await PurchaseRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: "Purchase request not found." });
  }

  if (!canDeleteRequest(req, request)) {
    return res.status(403).json({
      message: "Only admins or the requester can delete a request that is still in Purchase Request."
    });
  }

  const documents = [...(request.documents ?? [])];
  await request.deleteOne();

  documents.forEach((document) => {
    const cloudinaryPublicId = document.cloudinaryPublicId;
    const cloudinaryResourceType = document.cloudinaryResourceType || "raw";
    const filePath = document.filePath?.replace("/uploads/", "");

    if (cloudinaryPublicId) {
      void deleteDocumentFromCloudinary(cloudinaryPublicId, cloudinaryResourceType);
      return;
    }

    if (filePath) {
      fs.unlink(`uploads/${filePath}`, () => {});
    }
  });

  return res.status(204).send();
});

export default router;
