import mongoose from "mongoose";

const historySchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    recordedBy: { type: String, default: "" },
    recordedAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const contractHistorySchema = new mongoose.Schema(
  {
    contractNumber: { type: String, required: true, trim: true },
    contractStartDate: { type: Date, required: true },
    contractEndDate: { type: Date, default: null },
    renewalDate: { type: Date, required: true },
    planName: { type: String, default: "" },
    monthlyPlanAmount: { type: Number, default: 0, min: 0 },
    cashoutAmount: { type: Number, default: 0, min: 0 },
    handsetIssued: { type: String, default: "" },
    handsetSerialNumber: { type: String, default: "" },
    imeiNumber: { type: String, default: "" },
    remarks: { type: String, default: "" },
    isCurrent: { type: Boolean, default: false },
    createdBy: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

function createInventoryModel(name, collection) {
  const schema = new mongoose.Schema(
    {
      recordCode: { type: String, required: true, trim: true },
      name: { type: String, required: true, trim: true },
      status: { type: String, required: true, trim: true },
      company: { type: String, default: "" },
      accountableTo: { type: String, default: "" },
      repairPreviousStatus: { type: String, default: '' },
      movementHistory: { type: [new mongoose.Schema({
        action: String, movementDate: String, before: mongoose.Schema.Types.Mixed, after: mongoose.Schema.Types.Mixed,
        handledBy: String, receivedBy: String, repairProvider: String, transferDetails: String, remarks: String,
        recordedAt: { type: Date, default: Date.now }, recordedBy: String,
      })], default: [] },
      renewalDate: { type: Date, default: null },
      value: { type: Number, default: 0, min: 0 },
      data: { type: mongoose.Schema.Types.Mixed, default: {} },
      history: { type: [historySchema], default: [] },
      accountabilityHistory: { type: [new mongoose.Schema({
        employeeName: String, department: String, issueDate: String, returnDate: { type: String, default: '' },
        conditionUponIssue: String, conditionUponReturn: String, issuedBy: String, receivedBy: String,
        returnReceivedBy: String, transferDetails: String, remarks: String,
        recordedAt: { type: Date, default: Date.now }, recordedBy: String,
        returnRemarks: String, returnTransferDetails: String, returnRecordedAt: Date, returnRecordedBy: String,
      })], default: [] },
      attachments: { type: [new mongoose.Schema({
        kind: { type: String, enum: ['photo', 'document'] }, name: String, url: String,
        mimeType: String, size: Number, uploadedBy: String, uploadedAt: { type: Date, default: Date.now },
      })], default: [] },
      contractHistory: { type: [contractHistorySchema], default: [] },
      nextContractSequence: { type: Number, default: 1, min: 1 },
      archived: { type: Boolean, default: false },
      createdBy: { type: String, default: "" },
      updatedBy: { type: String, default: "" }
    },
    { timestamps: true, collection, optimisticConcurrency: name === 'OfficeEquipment' }
  );

  schema.index({ recordCode: 1 }, { unique: true });
  schema.index({ name: "text", recordCode: "text", accountableTo: "text", company: "text" });
  return mongoose.model(name, schema);
}

export const PostpaidAccount = createInventoryModel("PostpaidAccount", "inventory_postpaid_accounts");
export const IspAccount = createInventoryModel("IspAccount", "inventory_isp_accounts");
export const OfficeEquipment = createInventoryModel("OfficeEquipment", "inventory_office_equipment");
export const InventoryEmployee = createInventoryModel("InventoryEmployee", "inventory_employees");
export const InventoryCompany = createInventoryModel("InventoryCompany", "inventory_companies");

const auditLogSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true },
    userName: { type: String, default: "" },
    action: { type: String, required: true },
    module: { type: String, required: true },
    recordId: { type: String, default: "" },
    recordCode: { type: String, default: "" },
    previousValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
    ipAddress: { type: String, default: "" }
  },
  { timestamps: true, collection: "inventory_audit_logs" }
);

export const InventoryAuditLog = mongoose.model("InventoryAuditLog", auditLogSchema);
