import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { Setting } from "../models/Setting.js";

const router = Router();

const DEFAULT_SETTINGS = {
  key: "global",
  companyName: "Januarius Holdings Inc.",
  address: "Januarius Holdings Inc., Head Office, Makati City, Metro Manila, Philippines",
  logoUrl: "/JANUARIUS.ico"
};

function serializeSetting(setting) {
  return {
    companyName: setting.companyName,
    address: setting.address,
    logoUrl: setting.logoUrl
  };
}

async function getOrCreateGlobalSetting() {
  let setting = await Setting.findOne({ key: DEFAULT_SETTINGS.key });

  if (!setting) {
    setting = await Setting.create(DEFAULT_SETTINGS);
  }

  return setting;
}

router.get("/", async (_req, res) => {
  const setting = await getOrCreateGlobalSetting();
  res.json(serializeSetting(setting));
});

router.patch("/", requireAuth, requireRole("admin"), async (req, res) => {
  const setting = await getOrCreateGlobalSetting();

  const companyName = String(req.body.companyName || "").trim();
  const address = String(req.body.address || "").trim();
  const logoUrl = String(req.body.logoUrl || "").trim();

  if (!companyName) {
    return res.status(400).json({ message: "Company name is required." });
  }

  if (!address) {
    return res.status(400).json({ message: "Address is required." });
  }

  if (!logoUrl) {
    return res.status(400).json({ message: "Logo is required." });
  }

  setting.companyName = companyName;
  setting.address = address;
  setting.logoUrl = logoUrl;

  await setting.save();
  return res.json(serializeSetting(setting));
});

export default router;
