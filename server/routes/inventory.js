import { Router } from "express";
import { randomUUID } from "node:crypto";
import { validateEquipment, issueEntry, applyEquipmentMovement } from '../utils/equipment.js';
import { uploadSingleDocument } from '../middleware/upload.js';
import { isCloudinaryConfigured, uploadDocumentToCloudinary } from '../utils/cloudinary.js';
import { calculateRenewalDate as resolveRenewalDate } from "../utils/renewal.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { requireInventoryEditor } from '../middleware/inventoryPermissions.js';
import { User } from '../models/User.js';
import { serializeInventoryEmployee } from '../utils/inventoryEmployee.js';
import { ownershipQuery, personalSummary } from '../utils/inventoryOwnership.js';
import {
  InventoryAuditLog,
  InventoryCompany,
  IspAccount,
  OfficeEquipment,
  PostpaidAccount
} from "../models/Inventory.js";

const router = Router();
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
router.use(requireAuth);

router.get('/my-summary', asyncRoute(async (req, res) => {
  // Legacy name-only assignments are safe only when the directory name is unique.
  const name = req.user.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matches = await User.countDocuments({ name: { $regex: `^\\s*${name}\\s*$`, $options: 'i' } });
  const query = ownershipQuery(req.user, matches === 1);
  const records = await Promise.all([PostpaidAccount, IspAccount, OfficeEquipment].map((Model) =>
    Model.find(query).sort({ createdAt: -1 }).lean()));
  res.json(Object.fromEntries(['postpaid', 'isp', 'equipment'].map((key, index) => [key, records[index].map(personalSummary)])));
}));

// Regular users have one personal page; all shared directories and records are private.
router.use(requireRole('admin', 'super_admin'));

const modelMap = {
  postpaid: PostpaidAccount,
  isp: IspAccount,
  equipment: OfficeEquipment,
  companies: InventoryCompany
};

const initialCompanies = [
  "Januarius Holdings, Inc.",
  "Januarius Realty Development Corporation",
  "Januarius Industries, Inc.",
  "Januarius Food Corporation",
  "WeAreStatsPH Inc.",
  "Ampersand Capital Inc."
];

let initialCompaniesReady;
function ensureInitialCompanies() {
  if (!initialCompaniesReady) {
    initialCompaniesReady = InventoryCompany.bulkWrite(initialCompanies.map((name, index) => {
      const recordCode = `COMP-${String(index + 1).padStart(3, '0')}`;
      return { updateOne: { filter: { $or: [{ recordCode }, { name }] }, update: { $setOnInsert: { recordCode, name, status: 'Active', archived: false, createdBy: 'system', createdAt: new Date(), updatedAt: new Date() } }, upsert: true, timestamps: false } };
    }), { ordered: false }).catch((error) => {
      // Another server may initialize the same unique company codes concurrently.
      if (error.writeErrors?.length && error.writeErrors.every((entry) => entry.code === 11000)) return;
      initialCompaniesReady = null;
      throw error;
    });
  }
  return initialCompaniesReady;
}

async function validateCompanySelection(payload, previousCompany = null) {
  if (!payload.company || payload.company === previousCompany) return;
  const exists = await InventoryCompany.exists({ name: payload.company, status: 'Active', archived: false });
  if (!exists) { const error = new Error('Select an active company from the company list.'); error.status = 400; throw error; }
}

async function resolveAccountableUser(payload) {
  if (!/^[a-f\d]{24}$/i.test(String(payload.accountableUserId || ''))) {
    const error = new Error('Select a valid Procurement user for accountability.'); error.status = 400; throw error;
  }
  const user = await User.findById(payload.accountableUserId).select('_id name');
  if (!user) { const error = new Error('Selected Procurement user no longer exists. Select another user.'); error.status = 400; throw error; }
  payload.accountableTo = user.name;
}

function serialize(item) {
  return { id: item._id.toString(), ...item.toObject(), _id: undefined, __v: undefined };
}

function getModel(moduleName) {
  return modelMap[String(moduleName || "").toLowerCase()] || null;
}

function validatePayload(payload) {
  const data = payload?.data || {};
  const dates = [payload?.renewalDate, data.renewalDate, data.contractStartDate, data.contractEndDate,
    data.purchaseDate, data.warrantyExpirationDate, data.issueDate];
  if (dates.some((value) => value != null && value !== "" && !Number.isFinite(new Date(value).getTime()))) {
    return "Enter a valid date.";
  }
  if (data.contractStartDate && data.contractEndDate && new Date(data.contractEndDate) < new Date(data.contractStartDate)) {
    return "Contract End Date cannot be earlier than Contract Start Date.";
  }
  if (data.imei && !/^\d{15}$/.test(String(data.imei))) {
    return "IMEI must contain exactly 15 digits.";
  }
  if (data.mobileNumber && !/^(?:\+63|0)?9\d{9}$/.test(String(data.mobileNumber).replace(/[\s-]/g, ""))) {
    return "Enter a valid Philippine mobile number.";
  }
  if (data.accountNumber && !/^[A-Za-z0-9-]+$/.test(String(data.accountNumber))) {
    return "Account Number may contain only letters, numbers, and hyphens.";
  }
  const values = [payload?.value, data.monthlyAmount, data.monthlyPlanAmount, data.monthlyFee, data.purchasePrice, data.cashoutAmount];
  if (values.some((value) => value !== "" && value != null && (!Number.isFinite(Number(value)) || Number(value) < 0))) {
    return "Amounts and prices must be valid non-negative numbers.";
  }
  return "";
}

async function findDuplicatePostpaid(data, excludeId = null) {
  const checks = [
    ["data.mobileNumber", data?.mobileNumber],
    ["data.handsetSerialNumber", data?.handsetSerialNumber],
    ["data.imei", data?.imei || data?.imeiNumber]
  ].filter(([, value]) => String(value || "").trim());
  for (const [field, value] of checks) {
    const query = { [field]: String(value).trim(), archived: false };
    if (excludeId) query._id = { $ne: excludeId };
    const duplicate = await PostpaidAccount.findOne(query).select("recordCode");
    if (duplicate) return `${field.split(".").pop()} is already used by ${duplicate.recordCode}.`;
  }
  return "";
}

function calculateRenewalDate(startDate, endDate, manualDate) {
  const value = resolveRenewalDate(startDate, endDate, manualDate);
  return value ? new Date(value) : null;
}

function buildContractEntry(payload, userEmail) {
  const data = payload.data || payload;
  if (!data.contractNumber || !data.contractStartDate) return null;
  return {
    contractNumber: data.contractNumber,
    contractStartDate: data.contractStartDate,
    contractEndDate: data.contractEndDate || null,
    renewalDate: calculateRenewalDate(data.contractStartDate, data.contractEndDate, payload.renewalDate || data.renewalDate),
    planName: data.planName || "",
    monthlyPlanAmount: Number(data.monthlyAmount || data.monthlyPlanAmount || 0),
    cashoutAmount: Number(data.cashoutAmount || 0),
    handsetIssued: [data.handsetBrand, data.handsetModel].filter(Boolean).join(" "),
    handsetSerialNumber: data.handsetSerialNumber || "",
    imeiNumber: data.imei || data.imeiNumber || "",
    remarks: data.remarks || "",
    isCurrent: true,
    createdBy: userEmail
  };
}

function getNextContractSequence(item) {
  const generatedSequences = item.contractHistory
    .map((entry) => String(entry.contractNumber || "").match(/^Contract\s+(\d+)$/i))
    .filter(Boolean)
    .map((match) => Number(match[1]));
  const inferredSequence = Math.max(item.contractHistory.length, ...generatedSequences, 0) + 1;
  const sequence = Math.max(Number(item.nextContractSequence || 1), inferredSequence);
  return {
    sequence,
    contractNumber: `Contract ${String(sequence).padStart(3, "0")}`
  };
}

function syncPostpaidFromCurrentContract(item) {
  const current = item.contractHistory.find((entry) => entry.isCurrent);
  if (!current) {
    item.renewalDate = null;
    item.data = {
      ...item.data,
      contractNumber: "",
      contractStartDate: null,
      contractEndDate: null,
      planName: "",
      monthlyAmount: 0,
      cashoutAmount: 0,
      handsetSerialNumber: "",
      imei: "",
      remarks: ""
    };
    return;
  }
  item.renewalDate = current.renewalDate;
  item.data = {
    ...item.data,
    contractNumber: current.contractNumber,
    contractStartDate: current.contractStartDate,
    contractEndDate: current.contractEndDate,
    planName: current.planName,
    monthlyAmount: current.monthlyPlanAmount,
    cashoutAmount: current.cashoutAmount,
    handsetSerialNumber: current.handsetSerialNumber,
    imei: current.imeiNumber,
    remarks: current.remarks
  };
}

async function getNextPostpaidCode() {
  const year = new Date().getFullYear();
  const prefix = `PPL-${year}-`;
  const latest = await PostpaidAccount.findOne({ recordCode: new RegExp(`^${prefix}\\d+$`) })
    .sort({ recordCode: -1 })
    .select("recordCode");
  const nextNumber = Number(String(latest?.recordCode || "").split("-").pop() || 0) + 1;
  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
}

async function getNextEquipmentCode() {
  const latest = await OfficeEquipment.findOne({ recordCode: /^JHI-\d{5}$/i })
    .sort({ recordCode: -1 }).select('recordCode').lean();
  const current = Number(String(latest?.recordCode || '').match(/(\d{5})$/)?.[1] || 0);
  return `JHI-${String(current + 1).padStart(5, '0')}`;
}

async function writeAudit(req, action, moduleName, item, previousValue = null) {
  await InventoryAuditLog.create({
    userEmail: req.user.email,
    userName: req.user.name,
    action,
    module: moduleName,
    recordId: item?._id?.toString() || "",
    recordCode: item?.recordCode || "",
    previousValue,
    newValue: item?.toObject?.() || item || null,
    ipAddress: req.ip || ""
  });
}

router.get("/dashboard", asyncRoute(async (_req, res) => {
  const [postpaid, isp, equipment] = await Promise.all([
    PostpaidAccount.find({ archived: false }),
    IspAccount.find({ archived: false }),
    OfficeEquipment.find({ archived: false })
  ]);
  const now = new Date();
  const in90Days = new Date(now.getTime() + 90 * 86400000);
  const due = (items) => items.filter((item) => item.renewalDate && item.renewalDate <= in90Days);
  res.json({
    totals: {
      activePostpaid: postpaid.filter((item) => item.status === "Active").length,
      postpaidRenewals: due(postpaid).length,
      activeIsp: isp.filter((item) => item.status === "Active").length,
      equipment: equipment.length,
      issued: equipment.filter((item) => item.status === "Issued").length,
      available: equipment.filter((item) => item.status === "Available").length,
      underRepair: equipment.filter((item) => item.status === "Under Repair").length,
      retired: equipment.filter((item) => ["Retired", "Disposed"].includes(item.status)).length
    },
    alerts: [...due(postpaid).map(serialize), ...due(isp).map(serialize)]
      .sort((a, b) => new Date(a.renewalDate) - new Date(b.renewalDate))
      .slice(0, 12)
  });
}));

router.get("/audit", requireRole("admin", "super_admin"), asyncRoute(async (_req, res) => {
  const items = await InventoryAuditLog.find().sort({ createdAt: -1 }).limit(250);
  res.json({ items: items.map(serialize) });
}));

router.post("/postpaid/:id/contracts", requireRole("admin", "super_admin"), asyncRoute(async (req, res) => {
  const item = await PostpaidAccount.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Postpaid account not found." });
  const nextContract = getNextContractSequence(item);
  const contractPayload = { ...req.body, contractNumber: nextContract.contractNumber };
  const validationError = validatePayload({ data: contractPayload });
  if (validationError) return res.status(400).json({ message: validationError });
  const duplicateError = await findDuplicatePostpaid(contractPayload, item._id);
  if (duplicateError) return res.status(409).json({ message: duplicateError });
  const contract = buildContractEntry({ data: contractPayload, renewalDate: contractPayload.renewalDate }, req.user.email);
  if (!contract) return res.status(400).json({ message: "Contract Start Date is required." });
  item.contractHistory.forEach((entry) => { entry.isCurrent = false; });
  item.contractHistory.push(contract);
  item.nextContractSequence = nextContract.sequence + 1;
  item.renewalDate = contract.renewalDate;
  item.status = contractPayload.status || "Renewed";
  item.data = { ...item.data, ...contractPayload, planName: contract.planName, monthlyAmount: contract.monthlyPlanAmount, cashoutAmount: contract.cashoutAmount, handsetSerialNumber: contract.handsetSerialNumber, imei: contract.imeiNumber };
  item.updatedBy = req.user.email;
  item.history.push({ action: "Contract renewed", details: contract, recordedBy: req.user.email });
  await item.save();
  await writeAudit(req, "RENEW_CONTRACT", "postpaid", item);
  res.status(201).json(serialize(item));
}));

router.patch("/postpaid/:id/contracts/:contractId", requireRole("admin", "super_admin"), asyncRoute(async (req, res) => {
  const item = await PostpaidAccount.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Postpaid account not found." });
  const contract = item.contractHistory.id(req.params.contractId);
  if (!contract) return res.status(404).json({ message: "Contract history record not found." });
  const contractPayload = { ...req.body, contractNumber: contract.contractNumber };
  const validationError = validatePayload({ data: contractPayload });
  if (validationError) return res.status(400).json({ message: validationError });
  const duplicateError = await findDuplicatePostpaid(contractPayload, item._id);
  if (duplicateError) return res.status(409).json({ message: duplicateError });
  const previousValue = contract.toObject();
  const updated = buildContractEntry({ data: contractPayload, renewalDate: contractPayload.renewalDate }, contract.createdBy || req.user.email);
  if (!updated) return res.status(400).json({ message: "Contract Start Date is required." });
  Object.assign(contract, updated, {
    isCurrent: contract.isCurrent,
    createdBy: contract.createdBy,
    createdAt: contract.createdAt
  });
  if (contract.isCurrent) syncPostpaidFromCurrentContract(item);
  item.updatedBy = req.user.email;
  item.history.push({ action: "Contract history edited", details: { previousValue, newValue: contract.toObject() }, recordedBy: req.user.email });
  await item.save();
  await writeAudit(req, "EDIT_CONTRACT", "postpaid", item, previousValue);
  res.json(serialize(item));
}));

router.delete("/postpaid/:id/contracts/:contractId", requireRole("admin", "super_admin"), asyncRoute(async (req, res) => {
  const item = await PostpaidAccount.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Postpaid account not found." });
  const contract = item.contractHistory.id(req.params.contractId);
  if (!contract) return res.status(404).json({ message: "Contract history record not found." });
  const previousValue = contract.toObject();
  const wasCurrent = contract.isCurrent;
  item.contractHistory.pull(contract._id);
  if (wasCurrent && item.contractHistory.length) {
    item.contractHistory.forEach((entry) => { entry.isCurrent = false; });
    item.contractHistory[item.contractHistory.length - 1].isCurrent = true;
  }
  syncPostpaidFromCurrentContract(item);
  item.updatedBy = req.user.email;
  item.history.push({ action: "Contract history deleted", details: previousValue, recordedBy: req.user.email });
  await item.save();
  await writeAudit(req, "DELETE_CONTRACT", "postpaid", item, previousValue);
  res.json(serialize(item));
}));

router.post('/equipment/:id/accountability', requireRole('admin', 'super_admin'), asyncRoute(async (req, res) => {
  const item = await OfficeEquipment.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Equipment not found.' });
  const previous = item.toObject();
  applyEquipmentMovement(item, req.body, req.user);
  item.updatedBy = req.user.email;
  item.history.push({ action: `Equipment ${req.body.action}`, details: req.body, recordedBy: req.user.email });
  await item.save();
  await writeAudit(req, 'EQUIPMENT_ACCOUNTABILITY', 'equipment', item, previous);
  res.json(serialize(item));
}));

router.post('/equipment/:id/attachments', requireRole('admin', 'super_admin'), (req, res, next) => {
  uploadSingleDocument(req, res, (error) => error ? res.status(400).json({ message: error.message }) : next());
}, asyncRoute(async (req, res) => {
  const item = await OfficeEquipment.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Equipment not found.' });
  if (!req.file || !['photo', 'document'].includes(req.body.kind)) return res.status(400).json({ message: 'Select an attachment and attachment type.' });
  if (!isCloudinaryConfigured()) return res.status(503).json({ message: 'Attachment storage is not configured. Contact your administrator.' });
  const uploaded = await uploadDocumentToCloudinary({ buffer: req.file.buffer, mimeType: req.file.mimetype, originalName: req.file.originalname, requestNumber: item.recordCode, type: 'equipment' });
  item.attachments.push({ kind: req.body.kind, name: req.file.originalname, url: uploaded.fileUrl, mimeType: req.file.mimetype, size: uploaded.bytes, uploadedBy: req.user.email });
  item.history.push({ action: 'Attachment added', details: { name: req.file.originalname, kind: req.body.kind }, recordedBy: req.user.email });
  item.updatedBy = req.user.email;
  await item.save();
  await writeAudit(req, 'ADD_ATTACHMENT', 'equipment', item);
  res.status(201).json(serialize(item));
}));

router.get('/equipment/:id', asyncRoute(async (req, res) => {
  const item = await OfficeEquipment.findById(req.params.id);
  if (!item) return res.status(404).json({ message: 'Equipment not found.' });
  res.json(serialize(item));
}));

router.get('/employees', asyncRoute(async (_req, res) => {
  const users = await User.find().select('_id name email department role').sort({ name: 1 });
  res.json({ items: users.map(serializeInventoryEmployee) });
}));

router.get("/:module", asyncRoute(async (req, res) => {
  const Model = getModel(req.params.module);
  if (!Model) return res.status(404).json({ message: "Inventory module not found." });

  if (req.params.module === "companies") {
    await ensureInitialCompanies();
  }

  const archiveFilter = req.query.archived;
  const query = archiveFilter === "only" ? { archived: true } : archiveFilter === "true" ? {} : { archived: false };
  const items = await Model.find(query).sort({ createdAt: -1 });
  res.json({ items: items.map(serialize) });
}));

router.post("/:module", requireInventoryEditor, asyncRoute(async (req, res) => {
  const Model = getModel(req.params.module);
  if (!Model) return res.status(404).json({ message: "Inventory module not found." });
  const payload = req.body || {};
  if (req.params.module === 'companies') {
    payload.recordCode = `COMP-${randomUUID()}`;
    payload.name = String(payload.name || '').trim();
    if (!['Active', 'Inactive'].includes(payload.status)) return res.status(400).json({ message: 'Select Active or Inactive company status.' });
    if (await InventoryCompany.exists({ name: { $regex: `^${payload.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } })) return res.status(409).json({ message: 'A company with this name already exists.' });
  } else await validateCompanySelection(payload);
  if (req.params.module === 'isp') {
    payload.recordCode = payload.recordCode?.trim() || `ISP-${randomUUID()}`;
    payload.name = [payload.name, payload.data?.planName, payload.data?.provider, payload.data?.accountNumber, payload.recordCode]
      .map((value) => String(value || '').trim()).find(Boolean);
    payload.status = payload.status?.trim() || 'Active';
  }
  if (req.params.module === 'equipment') {
    payload.recordCode = payload.recordCode?.trim() || await getNextEquipmentCode();
    payload.name = payload.name?.trim() || payload.data?.name || payload.data?.category || payload.recordCode;
  }
  if (req.params.module === "postpaid") {
    payload.recordCode = payload.recordCode?.trim() || await getNextPostpaidCode();
    await resolveAccountableUser(payload);
    payload.name = payload.name?.trim() || payload.data?.mobileNumber || payload.data?.accountNumber || payload.recordCode;
  }
  if (!payload.recordCode?.trim() || !payload.name?.trim() || !payload.status?.trim()) {
    const missingFields = [['recordCode', 'Record code'], ['name', 'Name'], ['status', 'Status']]
      .filter(([key]) => !payload[key]?.trim()).map(([, label]) => label);
    return res.status(400).json({ message: `Missing required fields: ${missingFields.join(', ')}.` });
  }
  const validationError = validatePayload(payload);
  if (validationError) return res.status(400).json({ message: validationError });
  if (req.params.module === "postpaid") {
    const duplicateError = await findDuplicatePostpaid(payload.data);
    if (duplicateError) return res.status(409).json({ message: duplicateError });
  }
  let accountabilityHistory = [];
  if (req.params.module === 'equipment') {
    validateEquipment(payload);
    if (payload.accountableTo?.trim()) {
      if (!['Issued', 'Borrowed'].includes(payload.status)) return res.status(400).json({ message: 'Assigned equipment must have Issued or Borrowed status.' });
      accountabilityHistory = [issueEntry({ ...payload.initialAccountability, employeeName: payload.accountableTo, department: payload.data?.department, issueDate: payload.data?.issueDate, conditionUponIssue: payload.data?.condition }, req.user)];
    } else if (['Issued', 'Borrowed'].includes(payload.status)) {
      return res.status(400).json({ message: 'Issued To is required for issued or borrowed equipment.' });
    }
  }
  const item = await Model.create({
    ...payload,
    accountabilityHistory,
    movementHistory: [],
    repairPreviousStatus: '',
    attachments: [],
    renewalDate: calculateRenewalDate(payload.data?.contractStartDate, payload.data?.contractEndDate, payload.renewalDate),
    recordCode: payload.recordCode.trim(),
    name: payload.name.trim(),
    createdBy: req.user.email,
    updatedBy: req.user.email,
    history: [{ action: "Record created", details: payload.data || {}, recordedBy: req.user.email }]
  });
  if (req.params.module === "postpaid") {
    const initialContract = buildContractEntry(payload, req.user.email);
    if (initialContract) {
      item.contractHistory = [initialContract];
      item.renewalDate = initialContract.renewalDate;
      await item.save();
    }
  }
  await writeAudit(req, "CREATE", req.params.module, item);
  res.status(201).json(serialize(item));
}));

router.post('/equipment/import', requireRole('admin', 'super_admin'), asyncRoute(async (req, res) => {
  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (!rows.length || rows.length > 500) return res.status(400).json({ message: 'Import must contain between 1 and 500 equipment rows.' });
  const created = [];
  for (const source of rows) {
    const payload = { recordCode: source.recordCode || '', name: source.name || source.item || '', status: source.status || 'Available', company: source.company || '', accountableTo: source.accountableTo || source.issuedTo || '', value: Number(source.purchasePrice || 0), data: { ...source, category: source.category || source.type || '', location: source.location || '' } };
    payload.recordCode = payload.recordCode.trim() || await getNextEquipmentCode();
    payload.name = payload.name.trim() || payload.data.category || payload.recordCode;
    validateEquipment(payload);
    await validateCompanySelection(payload);
    if (!payload.recordCode || !payload.name) throw Object.assign(new Error('Each row needs a Code or Item.'), { status: 400 });
    const item = await OfficeEquipment.create({ ...payload, history: [{ action: 'Imported from Excel', details: source, recordedBy: req.user.email }], createdBy: req.user.email, updatedBy: req.user.email });
    created.push(serialize(item));
  }
  res.status(201).json({ items: created, count: created.length });
}));

router.patch("/:module/:id", requireInventoryEditor, asyncRoute(async (req, res) => {
  const Model = getModel(req.params.module);
  if (!Model) return res.status(404).json({ message: "Inventory module not found." });
  const item = await Model.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Inventory record not found." });
  const previousValue = item.toObject();
  const payload = req.body || {};
  if (req.params.module === 'postpaid') {
    if (payload.accountableUserId) await resolveAccountableUser(payload);
    else if ('accountableTo' in payload && payload.accountableTo !== item.accountableTo) payload.accountableUserId = null;
  }
  if (req.params.module === 'companies') {
    delete payload.recordCode;
    if (payload.name !== undefined) {
      payload.name = String(payload.name).trim();
      if (!payload.name) return res.status(400).json({ message: 'Company Name is required.' });
      if (await InventoryCompany.exists({ _id: { $ne: item._id }, name: { $regex: `^${payload.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } })) return res.status(409).json({ message: 'A company with this name already exists.' });
    }
    if (payload.status !== undefined && !['Active', 'Inactive'].includes(payload.status)) return res.status(400).json({ message: 'Select Active or Inactive company status.' });
  } else await validateCompanySelection(payload, item.company);
  const validationError = validatePayload(payload);
  if (validationError) return res.status(400).json({ message: validationError });
  if (req.params.module === "postpaid" && payload.data) {
    const duplicateError = await findDuplicatePostpaid(payload.data, item._id);
    if (duplicateError) return res.status(409).json({ message: duplicateError });
  }
  const mergedData = { ...item.data, ...payload.data };
  if (req.params.module === 'equipment') {
    validateEquipment({ ...item.toObject(), ...payload, data: mergedData });
    const assignmentChanged = ('accountableTo' in payload && payload.accountableTo !== item.accountableTo) ||
      ['department', 'issueDate'].some((key) => String(mergedData[key] || '') !== String(item.data?.[key] || ''));
    const custodyStatusChanged = payload.status && payload.status !== item.status;
    if (assignmentChanged || custodyStatusChanged) return res.status(400).json({ message: 'Use equipment movement actions in the details to change accountability or status.' });
  }
  const datesChanged = ['contractStartDate', 'contractEndDate'].some((key) =>
    payload.data && key in payload.data && String(payload.data[key] || '').slice(0, 10) !== String(item.data?.[key] || '').slice(0, 10));
  const manualDate = 'renewalDate' in payload ? payload.renewalDate : datesChanged ? null : item.renewalDate?.toISOString();
  // Only editable fields may be assigned; history and contract ownership stay server-managed.
  for (const key of ['recordCode', 'name', 'status', 'company', 'accountableTo', 'accountableUserId', 'value', 'archived']) {
    if (key in payload) item[key] = payload[key];
  }
  item.data = mergedData;
  item.renewalDate = calculateRenewalDate(mergedData.contractStartDate, mergedData.contractEndDate, manualDate);
  const currentContract = item.contractHistory.find((entry) => entry.isCurrent);
  if (req.params.module === 'postpaid' && currentContract) {
    currentContract.renewalDate = item.renewalDate;
    if (mergedData.contractStartDate) currentContract.contractStartDate = mergedData.contractStartDate;
    currentContract.contractEndDate = mergedData.contractEndDate || null;
  }
  item.updatedBy = req.user.email;
  item.history.push({
    action: payload.historyAction || "Record updated",
    details: payload.historyDetails || payload.data || {},
    recordedBy: req.user.email
  });
  await item.save();
  const auditAction = payload.archived === true ? "ARCHIVE" : payload.archived === false ? "UNARCHIVE" : "UPDATE";
  await writeAudit(req, auditAction, req.params.module, item, previousValue);
  res.json(serialize(item));
}));

router.use((error, _req, res, next) => {
  if (error.status === 400) return res.status(400).json({ message: error.message });
  if (error.name === 'VersionError') return res.status(409).json({ message: 'This equipment was updated by another user. Reload the record and try again.' });
  if (error.code === 11000) {
    return res.status(409).json({ message: "Record code already exists. Use a different code and try again." });
  }
  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ message: "Invalid inventory record. Check the required fields, dates, and amounts." });
  }
  return next(error);
});

export default router;
