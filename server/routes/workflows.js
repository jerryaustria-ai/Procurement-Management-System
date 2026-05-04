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
const RFP_PAID_EQUIVALENT_STATUSES = new Set([
  "paid",
  "for liquidation",
  "liquidation submitted",
  "liquidation reviewed",
  "liquidated / closed"
]);

function markRfpStatusApproved(request) {
  const currentRfpDraft = request.rfpDraft?.toObject?.() || request.rfpDraft || {};

  request.rfpDraft = {
    ...currentRfpDraft,
    paymentStatus: "Approved",
    paymentStatusUpdatedAt: new Date()
  };
}

function markRfpStatusForApproval(request) {
  const currentRfpDraft = request.rfpDraft?.toObject?.() || request.rfpDraft || {};

  request.rfpDraft = {
    ...currentRfpDraft,
    paymentStatus: "",
    paymentStatusUpdatedAt: null,
    dateReleased: null
  };
}

router.use(requireAuth);

function getRequestWorkflowStages(request) {
  return normalizeWorkflowStageOrder(request?.workflowStages, workflowStages);
}

function getPaidStatusReferenceDate(request) {
  return request?.rfpDraft?.paymentStatusUpdatedAt || request?.updatedAt || null;
}

function getNormalizedRfpPaymentStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function isPaidEquivalentRfpPaymentStatus(value) {
  return RFP_PAID_EQUIVALENT_STATUSES.has(getNormalizedRfpPaymentStatus(value));
}

function isPaidPaymentStatusLockedForAccountant(req, request, nextPaymentStatus) {
  if (req.user.role !== "accountant") {
    return false;
  }

  const currentPaymentStatus = getNormalizedRfpPaymentStatus(request?.rfpDraft?.paymentStatus);
  const normalizedNextPaymentStatus = getNormalizedRfpPaymentStatus(nextPaymentStatus);

  if (currentPaymentStatus !== "liquidated / closed" || normalizedNextPaymentStatus === currentPaymentStatus) {
    return false;
  }

  const paidReferenceDate = getPaidStatusReferenceDate(request);
  if (!paidReferenceDate) {
    return false;
  }

  return Date.now() - new Date(paidReferenceDate).getTime() > ONE_DAY_MS;
}

function canUsePurchaseOrderNumber(request) {
  return !["Cash Advance", "Reimbursement"].includes(request?.category);
}

function clearPurchaseOrderNumber(request) {
  if (canUsePurchaseOrderNumber(request)) {
    return;
  }

  request.poNumber = "";
  request.poDraft = {
    ...(request.poDraft?.toObject?.() || request.poDraft || {}),
    poNumber: ""
  };
}

async function getConfiguredWorkflowStages() {
  const globalSetting = await Setting.findOne({ key: "global" }).select("workflowStages");

  return normalizeWorkflowStageOrder(globalSetting?.workflowStages, workflowStages);
}

function normalizeSkippedWorkflowStages(input, stages) {
  if (!Array.isArray(input)) {
    return [];
  }

  const skipBlockedStages = new Set(["Purchase Request"]);
  const allowedStages = new Set(stages);

  return input
    .map((stage) => String(stage || "").trim())
    .filter(
      (stage, index, source) =>
        allowedStages.has(stage) &&
        !skipBlockedStages.has(stage) &&
        source.indexOf(stage) === index
    );
}

async function getConfiguredSkippedWorkflowStages(stages) {
  const globalSetting = await Setting.findOne({ key: "global" }).select("skippedWorkflowStages");

  return normalizeSkippedWorkflowStages(globalSetting?.skippedWorkflowStages, stages);
}

function getRequestSkippedWorkflowStages(request, stages) {
  return normalizeSkippedWorkflowStages(request?.skippedWorkflowStages, stages);
}

function resolveNextActiveStage(currentStage, stages, skippedStages) {
  const currentIndex = stages.indexOf(currentStage);
  const skippedStageSet = new Set(skippedStages);
  const skippedStagesBetween = [];

  if (currentIndex === -1) {
    return {
      nextStage: stages[0],
      skippedStagesBetween,
      completesWorkflow: false
    };
  }

  for (let index = currentIndex + 1; index < stages.length; index += 1) {
    const stage = stages[index];

    if (!skippedStageSet.has(stage)) {
      return {
        nextStage: stage,
        skippedStagesBetween,
        completesWorkflow: false
      };
    }

    skippedStagesBetween.push(stage);
  }

  return {
    nextStage:
      skippedStagesBetween[skippedStagesBetween.length - 1] ||
      stages[Math.min(currentIndex + 1, stages.length - 1)],
    skippedStagesBetween,
    completesWorkflow: skippedStagesBetween.length > 0
  };
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

function canViewRequest(req, request) {
  return req.user.role !== "requester" || request.requesterEmail === req.user.email;
}

function isImageMimeType(mimeType) {
  return String(mimeType || "").startsWith("image/");
}

function getSafeFileName(fileName) {
  return String(fileName || "attachment").replaceAll('"', "");
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

function getRequestNumberPrefix(category = "") {
  const normalizedCategory = String(category || "")
    .trim()
    .toLowerCase();

  if (normalizedCategory === "request for payment (rfp)") {
    return "RFP";
  }

  if (normalizedCategory === "cash advance") {
    return "CA";
  }

  if (normalizedCategory === "reimbursement") {
    return "RE";
  }

  return "PR";
}

function getRfpNumberPrefix(year) {
  return `RFP-${year}-`;
}

async function getNextRfpNumber(year = new Date().getFullYear()) {
  const prefix = getRfpNumberPrefix(year);
  const latestRequest = await PurchaseRequest.findOne({
    rfpNumber: { $regex: `^${prefix}` }
  })
    .sort({ rfpNumber: -1 })
    .select("rfpNumber");

  const latestSequence = latestRequest?.rfpNumber
    ? Number(latestRequest.rfpNumber.slice(prefix.length))
    : 0;
  const nextSequence = Number.isFinite(latestSequence) ? latestSequence + 1 : 1;

  return `${prefix}${String(nextSequence).padStart(3, "0")}`;
}

async function ensureRfpNumber(request) {
  if (!request || String(request.rfpNumber || "").trim()) {
    return request?.rfpNumber || "";
  }

  const requestYear = new Date(request.requestedAt || request.createdAt || Date.now()).getFullYear();
  const nextRfpNumber = await getNextRfpNumber(requestYear);
  request.rfpNumber = nextRfpNumber;

  return nextRfpNumber;
}

async function ensureRfpNumbers(requests = []) {
  const records = Array.isArray(requests) ? requests.filter(Boolean) : [];
  const missingRecords = records
    .filter((record) => !String(record.rfpNumber || "").trim())
    .sort((left, right) => {
      const leftTime = new Date(left.requestedAt || left.createdAt || 0).getTime();
      const rightTime = new Date(right.requestedAt || right.createdAt || 0).getTime();

      if (leftTime === rightTime) {
        return String(left._id).localeCompare(String(right._id));
      }

      return leftTime - rightTime;
    });

  if (!missingRecords.length) {
    return records;
  }

  const nextSequenceByYear = new Map();

  for (const record of missingRecords) {
    const requestYear = new Date(record.requestedAt || record.createdAt || Date.now()).getFullYear();

    if (!nextSequenceByYear.has(requestYear)) {
      const prefix = getRfpNumberPrefix(requestYear);
      const latestRequestForYear = await PurchaseRequest.findOne({
        rfpNumber: { $regex: `^${prefix}` }
      })
        .sort({ rfpNumber: -1 })
        .select("rfpNumber");

      const latestSequenceForYear = latestRequestForYear?.rfpNumber
        ? Number(latestRequestForYear.rfpNumber.slice(prefix.length))
        : 0;

      nextSequenceByYear.set(
        requestYear,
        Number.isFinite(latestSequenceForYear) ? latestSequenceForYear : 0
      );
    }

    const nextSequence = nextSequenceByYear.get(requestYear) + 1;
    const nextRfpNumber = `${getRfpNumberPrefix(requestYear)}${String(nextSequence).padStart(3, "0")}`;

    nextSequenceByYear.set(requestYear, nextSequence);
    record.rfpNumber = nextRfpNumber;

    await PurchaseRequest.updateOne(
      { _id: record._id },
      { $set: { rfpNumber: nextRfpNumber } }
    );
  }

  return records;
}

async function getNextRequestNumber(category = "") {
  const currentYear = new Date().getFullYear();
  const prefix = `${getRequestNumberPrefix(category)}-${currentYear}-`;
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
  await ensureRfpNumbers(items);

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
      propertyProject,
      amount,
      currency,
      modeOfRelease,
      bankName,
      accountName,
      accountNumber,
      checkNumber,
      checkDate,
      priority,
      dateNeeded,
      expenseDate,
      deliveryAddress,
      paymentTerms,
      notes
    } = req.body;
    const isReimbursement = category === "Reimbursement";
    const isCashAdvance = category === "Cash Advance";
    const isRequestForPayment = category === "Request for Payment (RFP)";

    if (!category) {
      return res.status(400).json({ message: "Request type is required." });
    }

    if (!title) {
      return res.status(400).json({ message: "Title is required." });
    }

    if (typeof amount === "undefined" || amount === "" || amount === null) {
      return res.status(400).json({ message: "Amount is required." });
    }

    if (isReimbursement && !expenseDate) {
      return res.status(400).json({ message: "Expense date is required." });
    }

    const resolvedDateNeeded = dateNeeded || (isReimbursement ? expenseDate : "");

    if (!resolvedDateNeeded) {
      return res.status(400).json({ message: "Date needed is required." });
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

    const rfpNumber = await getNextRfpNumber(new Date().getFullYear());
    const requestNumber = isRequestForPayment
      ? rfpNumber
      : await getNextRequestNumber(category);
    const requestWorkflowStages = await getConfiguredWorkflowStages();
    const skippedWorkflowStages = await getConfiguredSkippedWorkflowStages(requestWorkflowStages);
    const initialStage = requestWorkflowStages[0];
    const {
      nextStage: initialNextStage,
      skippedStagesBetween: initialSkippedStagesBetween,
      completesWorkflow: initialCompletesWorkflow
    } = resolveNextActiveStage(initialStage, requestWorkflowStages, skippedWorkflowStages);
    const shouldAutoAdvanceFromInitialStage =
      initialNextStage !== initialStage && initialSkippedStagesBetween.length > 0;
    const initialCurrentStage = shouldAutoAdvanceFromInitialStage
      ? initialNextStage
      : initialStage;
    const initialHistory = [
      {
        stage: initialStage,
        status: shouldAutoAdvanceFromInitialStage ? "completed" : "current",
        updatedAt: new Date(),
        actor: req.user.name,
        actorRole: req.user.role,
        comment: notes || "Purchase request created."
      },
      ...initialSkippedStagesBetween.map((skippedStage) => ({
        stage: skippedStage,
        status: "completed",
        updatedAt: new Date(),
        actor: "System",
        actorRole: "admin",
        comment: `${skippedStage} was skipped by workflow settings.`
      }))
    ];

    if (shouldAutoAdvanceFromInitialStage && !initialCompletesWorkflow) {
      initialHistory.push({
        stage: initialCurrentStage,
        status: "current",
        updatedAt: new Date(),
        actor: "System",
        actorRole: "admin",
        comment: `Moved to ${initialCurrentStage}; skipped ${initialSkippedStagesBetween.join(", ")}.`
      });
    }

    const parsedAmount = parseAmountValue(amount);

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: "Amount must be a valid number greater than zero." });
    }

    const created = await PurchaseRequest.create({
      requestNumber,
      rfpNumber,
      title,
      description: description || "",
      category,
      branch: branch || "Januarius Holdings",
      department: department || "",
      propertyProject: propertyProject || "",
      requesterName: requester.name,
      requesterEmail: requester.email,
      amount: parsedAmount,
      currency: currency || "PHP",
      modeOfRelease: isCashAdvance ? "Cash" : modeOfRelease || "",
      bankName: isCashAdvance ? "" : bankName || "",
      accountName: isCashAdvance ? "" : accountName || "",
      accountNumber: isCashAdvance ? "" : accountNumber || "",
      checkNumber: isCashAdvance ? "" : checkNumber || "",
      checkDate: isCashAdvance ? null : checkDate || null,
      priority: priority || "medium",
      dateNeeded: resolvedDateNeeded || null,
      expenseDate: isReimbursement ? expenseDate || null : null,
      deliveryAddress: isCashAdvance || isReimbursement ? "" : deliveryAddress || "",
      paymentTerms: paymentTerms || "Net 30",
      requestedPayeeSupplier: supplier?.trim() || "",
      supplier: supplier?.trim() || "Pending selection",
      notes: notes || "",
      workflowStages: requestWorkflowStages,
      skippedWorkflowStages,
      currentStage: initialCurrentStage,
      requestForPaymentEnabled: true,
      filingCompleted: initialCompletesWorkflow,
      status: initialCompletesWorkflow ? "completed" : "open",
      history: initialHistory
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

    if (initialCurrentStage === "Approval" && initialSkippedStagesBetween.includes("Review")) {
      const approverRecipients = await User.find({ role: "approver" }).select("email");

      sendApproverApprovalRequiredEmail({
        request: created,
        actorName: req.user.name,
        requesterName: requester.name,
        recipients: approverRecipients.map((user) => user.email)
      })
        .then((result) => {
          if (result?.skipped) {
            console.warn(
              "Skipped approver approval notification.",
              result.reason || "Unknown reason."
            );
          }
        })
        .catch((error) => {
          console.error("Failed to send approver approval notification.", error);
        });
    }

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

  const nextTitle =
    typeof req.body.title === "string" ? req.body.title.trim() : request.title;
  const nextDescription =
    typeof req.body.description === "string" ? req.body.description.trim() : request.description;
  const nextCategory =
    typeof req.body.category === "string" ? req.body.category : request.category;
  const nextExpenseDate =
    typeof req.body.expenseDate !== "undefined" ? req.body.expenseDate : request.expenseDate;
  const nextDateNeeded =
    typeof req.body.dateNeeded !== "undefined"
      ? req.body.dateNeeded || (nextCategory === "Reimbursement" ? nextExpenseDate : "")
      : request.dateNeeded || (nextCategory === "Reimbursement" ? nextExpenseDate : "");
  const nextAmount =
    typeof req.body.amount !== "undefined" ? req.body.amount : request.amount;
  const isReimbursement = nextCategory === "Reimbursement";

  if (!nextTitle) {
    return res.status(400).json({ message: "Title is required." });
  }

  if (typeof nextAmount === "undefined" || nextAmount === "" || nextAmount === null) {
    return res.status(400).json({ message: "Amount is required." });
  }

  if (isReimbursement && !nextExpenseDate) {
    return res.status(400).json({ message: "Expense date is required." });
  }

  if (!nextDateNeeded) {
    return res.status(400).json({ message: "Date needed is required." });
  }

  if (!nextDescription) {
    return res.status(400).json({ message: "Description is required." });
  }

  const editableFields =
    req.user.role === "admin"
      ? [
          "title",
          "description",
          "category",
          "branch",
          "department",
          "propertyProject",
          "currency",
          "modeOfRelease",
          "bankName",
          "accountName",
          "accountNumber",
          "priority",
          "dateNeeded",
          "expenseDate",
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
      : [
          "title",
          "description",
          "branch",
          "department",
          "propertyProject",
          "dateNeeded",
          "expenseDate",
          "notes",
          "bankName",
          "accountName",
          "accountNumber"
        ];

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
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: "Amount must be a valid number greater than zero." });
    }
    request.amount = parsedAmount;
  }

  if (typeof req.body.expenseDate !== "undefined") {
    request.expenseDate = req.body.expenseDate || null;
  }

  if (typeof req.body.dateNeeded !== "undefined") {
    const previousDateNeeded = request.dateNeeded
      ? new Date(request.dateNeeded).toISOString().slice(0, 10)
      : "";
    const nextDateNeeded =
      req.body.dateNeeded || (request.category === "Reimbursement" ? request.expenseDate : null);
    request.dateNeeded = nextDateNeeded || null;

    const currentRfpDraft = request.rfpDraft?.toObject?.() || request.rfpDraft || {};
    const currentRfpDueDate = String(currentRfpDraft.dueDate || "").trim();
    const nextDateNeededValue = nextDateNeeded
      ? new Date(nextDateNeeded).toISOString().slice(0, 10)
      : "";

    if (
      request.category === "Reimbursement" ||
      !currentRfpDueDate ||
      currentRfpDueDate === previousDateNeeded
    ) {
      request.rfpDraft = {
        ...currentRfpDraft,
        dueDate: nextDateNeededValue
      };
    }
  }

  if (typeof req.body.checkNumber !== "undefined") {
    request.checkNumber = String(req.body.checkNumber || "");
  }

  if (typeof req.body.checkDate !== "undefined") {
    request.checkDate = req.body.checkDate || null;
  }

  if (request.category !== "Reimbursement") {
    request.expenseDate = null;
  }

  clearPurchaseOrderNumber(request);

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
      markRfpStatusForApproval(request);
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
    poNumber: canUsePurchaseOrderNumber(request) ? String(req.body.poNumber ?? "") : "",
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
    request.poNumber = canUsePurchaseOrderNumber(request) ? req.body.poNumber : "";
  }

  clearPurchaseOrderNumber(request);

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

  await ensureRfpNumber(request);

  const previousPaymentStatus = String(request.rfpDraft?.paymentStatus || "").trim();
  const nextPaymentStatus = String(req.body.paymentStatus ?? "").trim();
  const previousPaymentStatusNormalized = previousPaymentStatus.toLowerCase();
  const nextPaymentStatusNormalized = nextPaymentStatus.toLowerCase();

  if (isPaidPaymentStatusLockedForAccountant(req, request, nextPaymentStatus)) {
    return res.status(400).json({
      message: "This payment status can no longer be changed after one day."
    });
  }

  const paymentStatusChanged =
    nextPaymentStatus &&
    nextPaymentStatusNormalized !== previousPaymentStatusNormalized;
  const hadPaidEquivalentStatus = isPaidEquivalentRfpPaymentStatus(previousPaymentStatus);
  const hasPaidEquivalentStatus = isPaidEquivalentRfpPaymentStatus(nextPaymentStatus);
  const dateReleased =
    nextPaymentStatusNormalized === "released"
      ? previousPaymentStatusNormalized === "released" && request.rfpDraft?.dateReleased
        ? request.rfpDraft.dateReleased
        : new Date()
      : null;
  const paymentStatusUpdatedAt =
    paymentStatusChanged
      ? hadPaidEquivalentStatus &&
        hasPaidEquivalentStatus &&
        request.rfpDraft?.paymentStatusUpdatedAt
        ? request.rfpDraft.paymentStatusUpdatedAt
        : new Date()
      : request.rfpDraft?.paymentStatusUpdatedAt ||
        (hasPaidEquivalentStatus ? getPaidStatusReferenceDate(request) : null);

  request.rfpDraft = {
    payee: String(req.body.payee ?? ""),
    tinNumber: String(req.body.tinNumber ?? ""),
    invoiceNumber: String(req.body.invoiceNumber ?? ""),
    paymentStatus: nextPaymentStatus,
    paymentStatusUpdatedAt,
    dateReleased,
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

  if (typeof req.body.modeOfRelease === "string") {
    request.modeOfRelease = req.body.modeOfRelease;
  }

  if (typeof req.body.bankName === "string") {
    request.bankName = req.body.bankName;
  }

  if (typeof req.body.accountName === "string") {
    request.accountName = req.body.accountName;
  }

  if (typeof req.body.accountNumber === "string") {
    request.accountNumber = req.body.accountNumber;
  }

  if (typeof req.body.checkNumber === "string") {
    request.checkNumber = req.body.checkNumber;
  }

  if (typeof req.body.checkDate !== "undefined") {
    request.checkDate = req.body.checkDate || null;
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
  const skippedWorkflowStages = getRequestSkippedWorkflowStages(request, requestWorkflowStages);
  const {
    nextStage,
    skippedStagesBetween,
    completesWorkflow
  } = resolveNextActiveStage(request.currentStage, requestWorkflowStages, skippedWorkflowStages);
  request.history = request.history.map((entry) =>
    entry.stage === request.currentStage ? { ...entry.toObject(), status: "completed" } : entry
  );

  if (req.body.supplier) {
    request.supplier = req.body.supplier;
  }

  if (typeof req.body.poNumber === "string") {
    request.poNumber = canUsePurchaseOrderNumber(request) ? req.body.poNumber : "";
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
      poNumber: canUsePurchaseOrderNumber(request) ? String(draft.poNumber ?? "") : "",
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

  clearPurchaseOrderNumber(request);

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

  const shouldNotifyApprover =
    nextStage === "Approval" &&
    (Boolean(req.body.notifyApprover) || skippedStagesBetween.includes("Review"));
  let approvalCompletedByAdvance = false;

  if (nextStage !== request.currentStage) {
    const previousStage = request.currentStage;
    const skippedStageSet = new Set(skippedStagesBetween);

    request.currentStage = nextStage;
    if (nextStage === "Approval") {
      request.approvalCompleted = false;
    }
    if (previousStage === "Approval" || skippedStageSet.has("Approval")) {
      request.approvalCompleted = true;
      request.requestForPaymentEnabled = true;
      markRfpStatusApproved(request);
      approvalCompletedByAdvance = true;
    }
    if (previousStage === "Approve PO" || skippedStageSet.has("Approve PO")) {
      request.requestForPaymentEnabled = true;
    }

    skippedStagesBetween.forEach((skippedStage) => {
      request.history.push({
        stage: skippedStage,
        status: "completed",
        updatedAt: new Date(),
        actor: "System",
        actorRole: "admin",
        comment: `${skippedStage} was skipped by workflow settings.`
      });
    });

    if (completesWorkflow) {
      request.filingCompleted = true;
      request.status = "completed";
    } else if (nextStage === "Filing") {
      request.filingCompleted = false;
      request.status = "open";
    }

    if (!completesWorkflow) {
      request.history.push({
        stage: nextStage,
        status: "current",
        updatedAt: new Date(),
        actor: req.user.name,
        actorRole: req.user.role,
        comment: skippedStagesBetween.length
          ? `Moved to ${nextStage}; skipped ${skippedStagesBetween.join(", ")}.`
          : req.body.comment || req.body.notes || `Moved to ${nextStage}`
      });
    }
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
  markRfpStatusApproved(request);
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

  if (previousStage === "Approval") {
    markRfpStatusForApproval(request);
  }

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
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Document file must be less than 10 MB." });
      }

      return res.status(400).json({ message: error.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Document file is required." });
    }

    const documentType = req.body.type || "other";
    const allowedTypes = ["quotation", "po", "invoice", "release", "liquidation", "delivery", "inspection", "other"];

    if (!allowedTypes.includes(documentType)) {
      return res.status(400).json({ message: "Invalid document type." });
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
      fileName: uploadedFile.fileName || uploadedFile.publicId,
      filePath: uploadedFile.fileUrl,
      storageProvider: "cloudinary",
      googleDriveFileId: "",
      googleDriveViewUrl: "",
      cloudinaryPublicId: uploadedFile.publicId || "",
      cloudinaryResourceType: uploadedFile.resourceType || "",
      mimeType: uploadedFile.mimeType || req.file.mimetype,
      size: uploadedFile.bytes,
      uploadedBy: req.user.name,
      uploadedByRole: req.user.role,
      uploadedAt: new Date()
    });

    await request.save();
    return res.status(201).json(serializePurchaseRequest(request));
  });
});

router.get("/purchase-requests/:id/documents/:documentId/view", async (req, res) => {
  const request = await PurchaseRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: "Purchase request not found." });
  }

  if (!canViewRequest(req, request)) {
    return res.status(403).json({ message: "You cannot view documents for this request." });
  }

  const document = request.documents.id(req.params.documentId);

  if (!document) {
    return res.status(404).json({ message: "Document not found." });
  }

  const mimeType = document.mimeType || "application/octet-stream";
  const fileName = document.originalName || document.label || "attachment";

  if (!isImageMimeType(mimeType)) {
    return res.status(415).json({ message: "Only image attachments can be previewed." });
  }

  const candidateUrls = [document.filePath].filter(Boolean);

  if (!/^https?:\/\//i.test(document.filePath || "")) {
    const localFilePath = document.filePath?.replace("/uploads/", "");

    if (!localFilePath) {
      return res.status(404).json({ message: "Document file not found." });
    }

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${fileName.replaceAll('"', "")}"`);
    return fs.createReadStream(`uploads/${localFilePath}`).pipe(res);
  }

  for (const fileUrl of candidateUrls) {
    const response = await fetch(fileUrl).catch(() => null);

    if (!response?.ok || !response.body) {
      continue;
    }

    res.setHeader("Content-Type", response.headers.get("content-type") || mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${fileName.replaceAll('"', "")}"`);
    for await (const chunk of response.body) {
      res.write(chunk);
    }
    return res.end();
  }

  return res.status(502).json({ message: "Unable to load this document preview." });
});

router.get("/purchase-requests/:id/documents/:documentId/download", async (req, res) => {
  const request = await PurchaseRequest.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: "Purchase request not found." });
  }

  if (!canViewRequest(req, request)) {
    return res.status(403).json({ message: "You cannot download documents for this request." });
  }

  const document = request.documents.id(req.params.documentId);

  if (!document) {
    return res.status(404).json({ message: "Document not found." });
  }

  const mimeType = document.mimeType || "application/octet-stream";
  const fileName = document.originalName || document.label || "attachment";
  const safeFileName = getSafeFileName(fileName);

  const candidateUrls = [document.filePath].filter(Boolean);

  if (!/^https?:\/\//i.test(document.filePath || "")) {
    const localFilePath = document.filePath?.replace("/uploads/", "");

    if (!localFilePath) {
      return res.status(404).json({ message: "Document file not found." });
    }

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${safeFileName}"`);
    return fs.createReadStream(`uploads/${localFilePath}`).pipe(res);
  }

  for (const fileUrl of candidateUrls) {
    const response = await fetch(fileUrl).catch(() => null);

    if (!response?.ok || !response.body) {
      continue;
    }

    res.setHeader("Content-Type", response.headers.get("content-type") || mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${safeFileName}"`);
    for await (const chunk of response.body) {
      res.write(chunk);
    }
    return res.end();
  }

  return res.status(502).json({ message: "Unable to download this document." });
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

  const canAccessRequestForPaymentDocument =
    ["invoice", "release", "liquidation"].includes(document.type) &&
    canManageRequestForPaymentDraft(req, request);

  if (!isRequesterAccessingOwnRequest(req, request) && !canAccessRequestForPaymentDocument && req.user.role !== "admin") {
    return res.status(403).json({ message: "You can only access your own purchase requests." });
  }

  const canDelete =
    req.user.role === "admin" ||
    document.uploadedBy === req.user.name ||
    getAllowedRoles(request.currentStage).includes(req.user.role) ||
    canAccessRequestForPaymentDocument;

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
