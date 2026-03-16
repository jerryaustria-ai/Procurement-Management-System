import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDatabase } from "./config/database.js";
import { workflowStages } from "./config/workflow.js";
import { PurchaseRequest } from "./models/PurchaseRequest.js";
import { User } from "./models/User.js";

async function seed() {
  await connectDatabase();

  await Promise.all([User.deleteMany({}), PurchaseRequest.deleteMany({})]);

  const passwordHash = await bcrypt.hash("password123", 10);

  const users = await User.insertMany([
    {
      name: "Januarius Austria",
      email: "requester@januarius.app",
      passwordHash,
      role: "requester",
      department: "Operations"
    },
    {
      name: "Rina Reviewer",
      email: "reviewer@januarius.app",
      passwordHash,
      role: "reviewer",
      department: "Procurement"
    },
    {
      name: "Arman Approver",
      email: "approver@januarius.app",
      passwordHash,
      role: "approver",
      department: "Leadership"
    },
    {
      name: "Paolo Procurement",
      email: "procurement@januarius.app",
      passwordHash,
      role: "procurement",
      department: "Procurement"
    },
    {
      name: "Rico Receiver",
      email: "receiver@januarius.app",
      passwordHash,
      role: "receiver",
      department: "Warehouse"
    },
    {
      name: "Iris Inspector",
      email: "inspector@januarius.app",
      passwordHash,
      role: "inspector",
      department: "Quality Assurance"
    },
    {
      name: "Faye Finance",
      email: "finance@januarius.app",
      passwordHash,
      role: "finance",
      department: "Finance"
    },
    {
      name: "Cato Accountant",
      email: "accountant@januarius.app",
      passwordHash,
      role: "accountant",
      department: "Accounting"
    },
    {
      name: "Troy Treasury",
      email: "treasury@januarius.app",
      passwordHash,
      role: "treasury",
      department: "Finance"
    },
    {
      name: "Fiona Filing",
      email: "filing@januarius.app",
      passwordHash,
      role: "filing",
      department: "Records"
    },
    {
      name: "Ava Admin",
      email: "admin@januarius.app",
      passwordHash,
      role: "admin",
      department: "IT"
    }
  ]);

  await PurchaseRequest.create({
    requestNumber: "PR-2026-001",
    title: "Office laptops for design and operations",
    description: "Six laptops with standard accessories for new hires and device refresh.",
    category: "IT Equipment",
    department: "Operations",
    requesterName: users[0].name,
    requesterEmail: users[0].email,
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
        actor: users[0].name,
        actorRole: users[0].role,
        comment: "Purchase request created."
      },
      {
        stage: workflowStages[1],
        status: "current",
        updatedAt: new Date("2026-03-16T10:30:00.000Z"),
        actor: users[1].name,
        actorRole: users[1].role,
        comment: "Awaiting procurement review."
      }
    ]
  });

  console.log("Seed completed.");
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
