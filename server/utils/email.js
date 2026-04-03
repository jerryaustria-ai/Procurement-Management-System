import nodemailer from "nodemailer";
import { Setting } from "../models/Setting.js";

let transporterPromise = null;

function isEmailConfigured() {
  return Boolean(
    process.env.MAIL_HOST &&
      process.env.MAIL_PORT &&
      process.env.MAIL_USER &&
      process.env.MAIL_PASSWORD &&
      process.env.MAIL_FROM
  );
}

function getTransporter() {
  if (!isEmailConfigured()) {
    return null;
  }

  if (!transporterPromise) {
    transporterPromise = Promise.resolve(
      nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT),
        secure: String(process.env.MAIL_SECURE || "false").toLowerCase() === "true",
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASSWORD
        }
      })
    );
  }

  return transporterPromise;
}

async function getCompanyName() {
  try {
    const setting = await Setting.findOne({ key: "global" }).select("companyName");
    return setting?.companyName || "Januarius Holdings Inc.";
  } catch (_error) {
    return "Januarius Holdings Inc.";
  }
}

export async function sendNewRequestCreatedEmail({
  request,
  requesterName,
  requesterEmail,
  recipients = []
}) {
  const transporter = getTransporter();

  if (!transporter || recipients.length === 0) {
    return { skipped: true };
  }

  const companyName = await getCompanyName();
  const uniqueRecipients = Array.from(
    new Set(
      recipients
        .map((recipient) => String(recipient || "").trim().toLowerCase())
        .filter(Boolean)
    )
  );

  if (uniqueRecipients.length === 0) {
    return { skipped: true };
  }

  const resolvedTransporter = await transporter;
  const requestUrl = process.env.REQUEST_PORTAL_URL || process.env.CLIENT_ORIGIN || "";
  const title = request.title || "Untitled request";
  const description = request.description || "No description provided.";
  const branch = request.branch || "Not set";
  const department = request.department || "Not set";
  const amount = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: request.currency || "PHP"
  }).format(Number(request.amount || 0));

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
      <h2 style="margin-bottom: 8px;">New Purchase Request Submitted</h2>
      <p style="margin-top: 0;">A new procurement request was created in ${companyName}.</p>
      <table style="border-collapse: collapse; width: 100%; max-width: 640px;">
        <tr><td style="padding: 6px 0; font-weight: 700;">Request Number</td><td style="padding: 6px 0;">${request.requestNumber}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 700;">Title</td><td style="padding: 6px 0;">${title}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 700;">Requester</td><td style="padding: 6px 0;">${requesterName} (${requesterEmail})</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 700;">Branch</td><td style="padding: 6px 0;">${branch}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 700;">Department</td><td style="padding: 6px 0;">${department}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 700;">Amount</td><td style="padding: 6px 0;">${amount}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: 700;">Description</td><td style="padding: 6px 0;">${description}</td></tr>
      </table>
      ${
        requestUrl
          ? `<p style="margin-top: 20px;"><a href="${requestUrl}" style="color: #1d4ed8;">Open Procurement System</a></p>`
          : ""
      }
    </div>
  `;

  const text = [
    `New Purchase Request Submitted`,
    ``,
    `Request Number: ${request.requestNumber}`,
    `Title: ${title}`,
    `Requester: ${requesterName} (${requesterEmail})`,
    `Branch: ${branch}`,
    `Department: ${department}`,
    `Amount: ${amount}`,
    `Description: ${description}`,
    requestUrl ? `Open Procurement System: ${requestUrl}` : ""
  ]
    .filter(Boolean)
    .join("\n");

  await resolvedTransporter.sendMail({
    from: process.env.MAIL_FROM,
    to: uniqueRecipients,
    subject: `[${companyName}] New Purchase Request ${request.requestNumber}`,
    text,
    html
  });

  return { skipped: false, recipients: uniqueRecipients };
}
