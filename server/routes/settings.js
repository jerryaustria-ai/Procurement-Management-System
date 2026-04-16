import { Router } from "express";
import { randomUUID } from "crypto";
import {
  normalizeWorkflowStageOrder,
  workflowStages as defaultWorkflowStages
} from "../config/workflow.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { Setting } from "../models/Setting.js";

const router = Router();

const DEFAULT_SETTINGS = {
  key: "global",
  scope: "global",
  branchName: "",
  companyName: "Januarius Holdings Inc.",
  address: "Januarius Holdings Inc., Head Office, Makati City, Metro Manila, Philippines",
  logoUrl: "/JANUARIUS.ico",
  generalAccountantName: "",
  chiefInvestmentOfficerName: "",
  workflowStages: [...defaultWorkflowStages]
};

function normalizeWorkflowStages(input) {
  if (!Array.isArray(input)) {
    return null;
  }

  const normalized = normalizeWorkflowStageOrder(input);

  if (normalized.length !== defaultWorkflowStages.length) {
    return null;
  }

  const hasAllStages = defaultWorkflowStages.every((stage) => normalized.includes(stage));
  const hasUniqueStages = new Set(normalized).size === defaultWorkflowStages.length;

  if (!hasAllStages || !hasUniqueStages) {
    return null;
  }

  return normalized;
}

function serializeSetting(setting) {
  const normalizedWorkflowStages = normalizeWorkflowStageOrder(setting.workflowStages);

  return {
    id: setting.id,
    scope: setting.scope,
    branchName: setting.branchName,
    companyName: setting.companyName,
    address: setting.address,
    logoUrl: setting.logoUrl,
    generalAccountantName: setting.generalAccountantName,
    chiefInvestmentOfficerName: setting.chiefInvestmentOfficerName,
    workflowStages: normalizedWorkflowStages
  };
}

async function getOrCreateGlobalSetting() {
  let setting = await Setting.findOne({ key: DEFAULT_SETTINGS.key });

  if (!setting) {
    setting = await Setting.create(DEFAULT_SETTINGS);
  }

  return setting;
}

async function getEntitySettings() {
  return Setting.find({ scope: "entity" }).sort({ branchName: 1, companyName: 1 });
}

router.get("/", async (_req, res) => {
  const setting = await getOrCreateGlobalSetting();
  const identities = await getEntitySettings();
  res.json({
    ...serializeSetting(setting),
    identities: identities.map(serializeSetting)
  });
});

router.patch("/", requireAuth, requireRole("admin"), async (req, res) => {
  const setting = await getOrCreateGlobalSetting();

  const companyName = String(req.body.companyName || "").trim();
  const address = String(req.body.address || "").trim();
  const logoUrl = String(req.body.logoUrl || "").trim();
  const generalAccountantName = String(req.body.generalAccountantName || "").trim();
  const chiefInvestmentOfficerName = String(req.body.chiefInvestmentOfficerName || "").trim();
  const normalizedWorkflowStages =
    typeof req.body.workflowStages === "undefined"
      ? serializeSetting(setting).workflowStages
      : normalizeWorkflowStages(req.body.workflowStages);

  if (!companyName) {
    return res.status(400).json({ message: "Company name is required." });
  }

  if (!address) {
    return res.status(400).json({ message: "Address is required." });
  }

  if (!logoUrl) {
    return res.status(400).json({ message: "Logo is required." });
  }

  if (!normalizedWorkflowStages) {
    return res.status(400).json({
      message: "Workflow order must contain each stage exactly once."
    });
  }

  setting.companyName = companyName;
  setting.address = address;
  setting.logoUrl = logoUrl;
  setting.generalAccountantName = generalAccountantName;
  setting.chiefInvestmentOfficerName = chiefInvestmentOfficerName;
  setting.workflowStages = normalizedWorkflowStages;

  await setting.save();
  const identities = await getEntitySettings();
  return res.json({
    ...serializeSetting(setting),
    identities: identities.map(serializeSetting)
  });
});

router.get("/identities", async (_req, res) => {
  const identities = await getEntitySettings();
  return res.json(identities.map(serializeSetting));
});

router.post("/identities", requireAuth, requireRole("admin"), async (req, res) => {
  const branchName = String(req.body.branchName || "").trim();
  const companyName = String(req.body.companyName || "").trim() || branchName;
  const address = String(req.body.address || "").trim();
  const logoUrl = String(req.body.logoUrl || "").trim();

  if (!branchName) {
    return res.status(400).json({ message: "Branch or subsidiary name is required." });
  }

  if (!address) {
    return res.status(400).json({ message: "Address is required." });
  }

  if (!logoUrl) {
    return res.status(400).json({ message: "Logo is required." });
  }

  const existingIdentity = await Setting.findOne({
    scope: "entity",
    branchName: { $regex: new RegExp(`^${branchName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }
  });

  if (existingIdentity) {
    return res.status(409).json({ message: "An identity for this branch already exists." });
  }

  const identity = await Setting.create({
    key: `entity:${randomUUID()}`,
    scope: "entity",
    branchName,
    companyName,
    address,
    logoUrl
  });

  return res.status(201).json(serializeSetting(identity));
});

router.patch("/identities/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const identity = await Setting.findOne({ _id: req.params.id, scope: "entity" });

  if (!identity) {
    return res.status(404).json({ message: "Company identity not found." });
  }

  const branchName = String(req.body.branchName || "").trim();
  const companyName = String(req.body.companyName || "").trim() || branchName;
  const address = String(req.body.address || "").trim();
  const logoUrl = String(req.body.logoUrl || "").trim();

  if (!branchName) {
    return res.status(400).json({ message: "Branch or subsidiary name is required." });
  }

  if (!address) {
    return res.status(400).json({ message: "Address is required." });
  }

  if (!logoUrl) {
    return res.status(400).json({ message: "Logo is required." });
  }

  const conflictingIdentity = await Setting.findOne({
    _id: { $ne: identity.id },
    scope: "entity",
    branchName: { $regex: new RegExp(`^${branchName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }
  });

  if (conflictingIdentity) {
    return res.status(409).json({ message: "Another identity already uses this branch name." });
  }

  identity.branchName = branchName;
  identity.companyName = companyName;
  identity.address = address;
  identity.logoUrl = logoUrl;

  await identity.save();
  return res.json(serializeSetting(identity));
});

router.delete("/identities/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const identity = await Setting.findOneAndDelete({ _id: req.params.id, scope: "entity" });

  if (!identity) {
    return res.status(404).json({ message: "Company identity not found." });
  }

  return res.status(204).send();
});

export default router;
