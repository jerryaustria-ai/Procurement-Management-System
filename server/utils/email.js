import nodemailer from "nodemailer";
import { Setting } from "../models/Setting.js";

const REQUIRED_EMAIL_ENV_KEYS = [
  "MAIL_HOST",
  "MAIL_PORT",
  "MAIL_SECURE",
  "MAIL_USER",
  "MAIL_PASSWORD",
  "MAIL_FROM"
];

export function getEmailConfigurationStatus() {
  const missingKeys = REQUIRED_EMAIL_ENV_KEYS.filter(
    (key) => !String(process.env[key] || "").trim()
  );

  return {
    configured: missingKeys.length === 0,
    provider: "smtp",
    missingKeys
  };
}

async function getCompanyName() {
  try {
    const setting = await Setting.findOne({ key: "global" }).select("companyName");
    return setting?.companyName || "Januarius Holdings Inc.";
  } catch (_error) {
    return "Januarius Holdings Inc.";
  }
}

function createTransport() {
  const port = Number(process.env.MAIL_PORT || 0);
  const secure = String(process.env.MAIL_SECURE || "").trim().toLowerCase() === "true";

  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port,
    secure,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD
    }
  });
}

async function sendMail({ to, subject, text, html }) {
  const configurationStatus = getEmailConfigurationStatus();

  if (!configurationStatus.configured) {
    return {
      skipped: true,
      reason: `Missing email configuration: ${configurationStatus.missingKeys.join(", ")}`
    };
  }

  const recipients = (Array.isArray(to) ? to : [to])
    .map((recipient) => String(recipient || "").trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    return {
      skipped: true,
      reason: "Recipient list is empty."
    };
  }

  try {
    const transport = createTransport();

    await transport.sendMail({
      from: process.env.MAIL_FROM,
      to: recipients.join(", "),
      subject,
      text,
      html
    });

    return {
      skipped: false,
      provider: "smtp"
    };
  } catch (error) {
    return {
      skipped: true,
      reason: `SMTP send failed: ${error.message}`
    };
  }
}

export async function sendNewRequestCreatedEmail({
  request,
  requesterName,
  requesterEmail,
  recipients = []
}) {
  if (recipients.length === 0) {
    return { skipped: true, reason: "No recipients were provided." };
  }

  const uniqueRecipients = Array.from(
    new Set(
      recipients
        .map((recipient) => String(recipient || "").trim().toLowerCase())
        .filter(Boolean)
    )
  );

  if (uniqueRecipients.length === 0) {
    return { skipped: true, reason: "Recipient list is empty after normalization." };
  }

  const companyName = await getCompanyName();
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
    "New Purchase Request Submitted",
    "",
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

  const result = await sendMail({
    to: uniqueRecipients,
    subject: `[${companyName}] New Purchase Request ${request.requestNumber}`,
    text,
    html
  });

  return result.skipped
    ? result
    : {
        skipped: false,
        provider: "smtp",
        recipients: uniqueRecipients
      };
}

export async function sendTestEmail({ recipientEmail, requestedByName = "System Admin" }) {
  const companyName = await getCompanyName();
  const requestUrl = process.env.REQUEST_PORTAL_URL || process.env.CLIENT_ORIGIN || "";

  const result = await sendMail({
    to: recipientEmail,
    subject: `[${companyName}] Test Email`,
    text: [
      "This is a test email from the Januarius Procurement System.",
      `Requested by: ${requestedByName}`,
      requestUrl ? `Portal: ${requestUrl}` : ""
    ]
      .filter(Boolean)
      .join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2 style="margin-bottom: 8px;">Procurement System Test Email</h2>
        <p style="margin-top: 0;">This confirms that your SMTP configuration is working.</p>
        <p><strong>Requested by:</strong> ${requestedByName}</p>
        ${requestUrl ? `<p><a href="${requestUrl}" style="color: #1d4ed8;">Open Procurement System</a></p>` : ""}
      </div>
    `
  });

  return result.skipped
    ? result
    : {
        skipped: false,
        provider: "smtp",
        recipient: recipientEmail
      };
}
