export const workflowStages = [
  "Purchase Request",
  "Review",
  "Request for Payment",
  "Approval",
  "Prepare PO",
  "Approve PO",
  "Send PO",
  "Delivery",
  "Inspection",
  "Invoice",
  "Matching",
  "Payment",
  "Filing"
];

export const stageDescriptions = {
  "Purchase Request": "Create and justify the business need.",
  Review: "Validate scope, budget, and completeness of the request.",
  "Request for Payment": "Complete the Request for Payment details before approval.",
  Approval: "Management approves the procurement request.",
  "Prepare PO": "Draft the purchase order details and reference numbers.",
  "Approve PO": "Authorize the prepared purchase order for release.",
  "Send PO": "Transmit the approved purchase order to the supplier.",
  Delivery: "Receive delivered goods or services from the supplier.",
  Inspection: "Inspect delivery for quantity and quality compliance.",
  Invoice: "Collect and log supplier invoice documents.",
  Matching: "Match request, PO, delivery, and invoice records.",
  Payment: "Release payment and record treasury reference.",
  Filing: "Archive the final procurement documents."
};

export const roleLabels = {
  requester: "Requester",
  reviewer: "Reviewer",
  approver: "Approver",
  procurement: "Procurement Officer",
  receiver: "Receiving Officer",
  inspector: "Inspector",
  finance: "Finance Officer",
  accountant: "Accountant",
  treasury: "Treasury Officer",
  filing: "Records Officer",
  admin: "System Admin"
};

export const priorityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical"
};

export const stageRoleMap = {
  "Purchase Request": ["requester", "admin"],
  Review: ["reviewer", "admin"],
  "Request for Payment": ["requester", "admin"],
  Approval: ["approver", "admin"],
  "Prepare PO": ["procurement", "admin"],
  "Approve PO": ["approver", "admin"],
  "Send PO": ["procurement", "admin"],
  Delivery: ["receiver", "admin"],
  Inspection: ["inspector", "admin"],
  Invoice: ["finance", "admin"],
  Matching: ["accountant", "admin"],
  Payment: ["treasury", "admin"],
  Filing: ["filing", "admin"]
};

export function getAllowedRoles(stage) {
  return stageRoleMap[stage] ?? ["admin"];
}

export function normalizeWorkflowStageOrder(input, fallback = workflowStages) {
  const normalized = Array.isArray(input)
    ? input.map((stage) => String(stage || "").trim()).filter(Boolean)
    : [];

  if (!normalized.length) {
    return [...fallback];
  }

  const uniqueKnownStages = normalized.filter(
    (stage, index) => workflowStages.includes(stage) && normalized.indexOf(stage) === index
  );

  const reconciledStages = [...uniqueKnownStages];

  workflowStages.forEach((stage, defaultIndex) => {
    if (reconciledStages.includes(stage)) {
      return;
    }

    let insertAt = reconciledStages.length;

    for (let previousIndex = defaultIndex - 1; previousIndex >= 0; previousIndex -= 1) {
      const previousStage = workflowStages[previousIndex];
      const existingIndex = reconciledStages.indexOf(previousStage);

      if (existingIndex !== -1) {
        insertAt = existingIndex + 1;
        break;
      }
    }

    if (insertAt === reconciledStages.length) {
      for (let nextIndex = defaultIndex + 1; nextIndex < workflowStages.length; nextIndex += 1) {
        const nextStage = workflowStages[nextIndex];
        const existingIndex = reconciledStages.indexOf(nextStage);

        if (existingIndex !== -1) {
          insertAt = existingIndex;
          break;
        }
      }
    }

    reconciledStages.splice(insertAt, 0, stage);
  });

  return reconciledStages;
}

export function getNextStage(stage, stages = workflowStages) {
  const currentIndex = stages.indexOf(stage);
  if (currentIndex === -1) {
    return stages[0];
  }

  return stages[Math.min(currentIndex + 1, stages.length - 1)];
}

export function getPreviousStage(stage, stages = workflowStages) {
  const currentIndex = stages.indexOf(stage);
  if (currentIndex <= 0) {
    return stages[0];
  }

  return stages[currentIndex - 1];
}

export function isTerminalStage(stage, stages = workflowStages) {
  return stage === stages[stages.length - 1];
}
