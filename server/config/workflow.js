export const workflowStages = [
  "Purchase Request",
  "Review",
  "Approval",
  "Supplier Selection",
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
  Approval: "Management approves the procurement request.",
  "Supplier Selection": "Compare vendors and pick the preferred supplier.",
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
  Approval: ["approver", "admin"],
  "Supplier Selection": ["procurement", "admin"],
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

export function getNextStage(stage) {
  const currentIndex = workflowStages.indexOf(stage);
  if (currentIndex === -1) {
    return workflowStages[0];
  }

  return workflowStages[Math.min(currentIndex + 1, workflowStages.length - 1)];
}

export function isTerminalStage(stage) {
  return stage === workflowStages[workflowStages.length - 1];
}
