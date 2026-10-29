import assert from "node:assert/strict";
import test from "node:test";
import {
  isApprovedOrProcessedRfp,
  serializeRfpIntegrationRecord
} from "./rfpIntegration.js";

function buildRequest(overrides = {}) {
  return {
    _id: { toString: () => "request-id" },
    requestNumber: "PR-2026-001",
    rfpNumber: "RFP-2026-001",
    title: "Office supplies",
    description: "Payment request",
    category: "Purchase Request",
    branch: "Januarius Holdings Inc.",
    department: "Operations",
    propertyProject: "Office",
    requesterName: "Test User",
    requesterEmail: "test@example.com",
    amount: 1000,
    currency: "PHP",
    currentStage: "Request for Payment",
    status: "open",
    workflowStages: ["Request for Payment", "Approval", "Filing"],
    skippedWorkflowStages: [],
    rfpDraft: {
      payee: "Supplier",
      paymentStatus: "Approved",
      paymentStatusUpdatedAt: new Date("2026-10-29T06:30:00.000Z"),
      amountRequested: "1000"
    },
    documents: [],
    history: [],
    updatedAt: new Date("2026-10-29T06:30:00.000Z"),
    ...overrides
  };
}

test("matches only approved and processed RFP payment statuses", () => {
  assert.equal(isApprovedOrProcessedRfp(buildRequest()), true);
  assert.equal(
    isApprovedOrProcessedRfp(
      buildRequest({ rfpDraft: { paymentStatus: " processed " } })
    ),
    true
  );
  assert.equal(
    isApprovedOrProcessedRfp(
      buildRequest({ rfpDraft: { paymentStatus: "For Payment" } })
    ),
    false
  );
});

test("serializes complete form data and attachment URLs without workflow history", () => {
  const request = buildRequest({
    documents: [
      {
        _id: { toString: () => "document-id" },
        type: "invoice",
        label: "Invoice",
        originalName: "invoice.pdf",
        fileName: "invoice.pdf",
        filePath: "/uploads/invoice.pdf",
        storageProvider: "local",
        googleDriveFileId: "",
        googleDriveViewUrl: "",
        cloudinaryPublicId: "",
        cloudinaryResourceType: "",
        mimeType: "application/pdf",
        size: 125000,
        uploadedBy: "Accountant",
        uploadedByRole: "accountant",
        uploadedAt: new Date("2026-10-29T06:35:00.000Z")
      }
    ],
    history: [
      {
        toObject: () => ({ stage: "Approval", status: "completed" }),
        actorRole: "approver",
        updatedAt: new Date("2026-10-29T06:00:00.000Z")
      }
    ]
  });
  const req = {
    headers: {},
    protocol: "https",
    get: (header) => (header === "host" ? "api.example.com" : "")
  };

  const result = serializeRfpIntegrationRecord(request, req);

  assert.equal(result.formData.title, "Office supplies");
  assert.equal(result.formData.rfpDraft.paymentStatus, "Approved");
  assert.equal("history" in result.formData, false);
  assert.equal("documents" in result.formData, false);
  assert.equal(result.attachments.length, 1);
  assert.equal(
    result.attachments[0].downloadUrl,
    "https://api.example.com/uploads/invoice.pdf"
  );
});
