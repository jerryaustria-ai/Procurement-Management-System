import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDatabase } from "./config/database.js";
import { workflowStages } from "./config/workflow.js";
import { PurchaseRequest } from "./models/PurchaseRequest.js";
import { User } from "./models/User.js";

const DEMO_PASSWORD = "password123";

const demoUsers = [
  {
    name: "Januarius Austria",
    email: "requester@januarius.app",
    role: "requester",
    department: "Operations"
  },
  {
    name: "Rina Reviewer",
    email: "reviewer@januarius.app",
    role: "reviewer",
    department: "Procurement"
  },
  {
    name: "Arman Approver",
    email: "approver@januarius.app",
    role: "approver",
    department: "Leadership"
  },
  {
    name: "Paolo Procurement",
    email: "procurement@januarius.app",
    role: "procurement",
    department: "Procurement"
  },
  {
    name: "Rico Receiver",
    email: "receiver@januarius.app",
    role: "receiver",
    department: "Warehouse"
  },
  {
    name: "Iris Inspector",
    email: "inspector@januarius.app",
    role: "inspector",
    department: "Quality Assurance"
  },
  {
    name: "Faye Finance",
    email: "finance@januarius.app",
    role: "finance",
    department: "Finance"
  },
  {
    name: "Cato Accountant",
    email: "accountant@januarius.app",
    role: "accountant",
    department: "Accounting"
  },
  {
    name: "Troy Treasury",
    email: "treasury@januarius.app",
    role: "treasury",
    department: "Finance"
  },
  {
    name: "Fiona Filing",
    email: "filing@januarius.app",
    role: "filing",
    department: "Records"
  },
  {
    name: "Ava Admin",
    email: "admin@januarius.app",
    role: "admin",
    department: "IT"
  }
];

async function upsertDemoUsers(passwordHash) {
  let created = 0;
  let updated = 0;

  for (const user of demoUsers) {
    const existingUser = await User.findOne({ email: user.email });

    if (!existingUser) {
      await User.create({
        ...user,
        passwordHash
      });
      created += 1;
      continue;
    }

    let hasChanges = false;

    for (const field of ["name", "role", "department"]) {
      if (existingUser[field] !== user[field]) {
        existingUser[field] = user[field];
        hasChanges = true;
      }
    }

    if (!existingUser.passwordHash) {
      existingUser.passwordHash = passwordHash;
      hasChanges = true;
    }

    if (hasChanges) {
      await existingUser.save();
      updated += 1;
    }
  }

  return { created, updated };
}

async function ensureSamplePurchaseRequest() {
  const existingRequest = await PurchaseRequest.findOne({ requestNumber: "PR-2026-001" });
  if (existingRequest) {
    return { created: false };
  }

  const requester = await User.findOne({ email: "requester@januarius.app" });
  const reviewer = await User.findOne({ email: "reviewer@januarius.app" });

  if (!requester || !reviewer) {
    throw new Error("Demo requester/reviewer accounts are required before seeding requests.");
  }

  await PurchaseRequest.create({
    requestNumber: "PR-2026-001",
    title: "Office laptops for design and operations",
    description: "Six laptops with standard accessories for new hires and device refresh.",
    category: "IT Equipment",
    department: "Operations",
    requesterName: requester.name,
    requesterEmail: requester.email,
    amount: 285000,
    currency: "PHP",
    priority: "high",
    dateNeeded: new Date("2026-03-31T00:00:00.000Z"),
    deliveryAddress: "Januarius HQ, Makati City",
    paymentTerms: "Net 30",
    supplier: "Pending selection",
    poNumber: "",
    invoiceNumber: "",
    paymentReference: "",
    deliveryDate: null,
    inspectionStatus: "pending",
    requestedAt: new Date("2026-03-16T09:00:00.000Z"),
    currentStage: workflowStages[1],
    notes: "Urgent replacement for aging devices before Q2 rollout.",
    history: [
      {
        stage: workflowStages[0],
        status: "completed",
        updatedAt: new Date("2026-03-16T09:00:00.000Z"),
        actor: requester.name,
        actorRole: requester.role,
        comment: "Purchase request created."
      },
      {
        stage: workflowStages[1],
        status: "current",
        updatedAt: new Date("2026-03-16T10:30:00.000Z"),
        actor: reviewer.name,
        actorRole: reviewer.role,
        comment: "Awaiting procurement review."
      }
    ]
  });

  return { created: true };
}

async function seed() {
  await connectDatabase();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const userResult = await upsertDemoUsers(passwordHash);
  const requestResult = await ensureSamplePurchaseRequest();

  console.log("Seed completed without deleting existing data.");
  console.log(
    `Users created: ${userResult.created}, users updated: ${userResult.updated}, sample request created: ${requestResult.created ? "yes" : "no"}`
  );

  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
