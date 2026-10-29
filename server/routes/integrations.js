import { Router } from "express";
import { requireRfpIntegrationApiKey } from "../middleware/integrationApiKey.js";
import { PurchaseRequest } from "../models/PurchaseRequest.js";
import {
  RFP_INTEGRATION_STATUSES,
  serializeRfpIntegrationRecord
} from "../utils/rfpIntegration.js";

const router = Router();

router.use(requireRfpIntegrationApiKey);

router.get("/rfp-approved-processed", async (req, res) => {
  const records = await PurchaseRequest.find({
    "rfpDraft.paymentStatus": {
      $in: [/^approved$/i, /^processed$/i]
    }
  }).sort({ "rfpDraft.paymentStatusUpdatedAt": -1, updatedAt: -1 });

  res.set("Cache-Control", "no-store");
  return res.json({
    apiVersion: "1.0",
    module: "Request for Payment",
    paymentStatuses: RFP_INTEGRATION_STATUSES,
    count: records.length,
    fetchedAt: new Date().toISOString(),
    forms: records.map((record) => serializeRfpIntegrationRecord(record, req))
  });
});

export default router;
