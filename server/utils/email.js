import { Setting } from "../models/Setting.js";

const REQUIRED_EMAIL_ENV_KEYS = ["BREVO_API_KEY", "MAIL_FROM"];
const BREVO_SEND_EMAIL_URL = "https://api.brevo.com/v3/smtp/email";

export function getEmailConfigurationStatus() {
  const missingKeys = REQUIRED_EMAIL_ENV_KEYS.filter(
    (key) => !String(process.env[key] || "").trim()
  );

  return {
    configured: missingKeys.length === 0,
    provider: "brevo-api",
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

function parseSender(rawFrom) {
  const value = String(rawFrom || "").trim();
  const match = value.match(/^(.*)<([^>]+)>$/);

  if (!match) {
    return {
      email: value,
      name: undefined
    };
  }

  const name = match[1].trim().replace(/^"|"$/g, "");
  const email = match[2].trim();

  return {
    email,
    name: name || undefined
  };
}

async function sendMail({ to, subject, text, html }) {
  const configurationStatus = getEmailConfigurationStatus();

  if (!configurationStatus.configured) {
    return {
      skipped: true,
      reason: `Missing email configuration: ${configurationStatus.missingKeys.join(", ")}`
    };
  }

  const sender = parseSender(process.env.MAIL_FROM);
  if (!sender.email) {
    return {
      skipped: true,
      reason: "MAIL_FROM must contain a valid sender email."
    };
  }

  const recipients = (Array.isArray(to) ? to : [to])
    .map((recipient) => String(recipient || "").trim())
    .filter(Boolean)
    .map((email) => ({ email }));

  if (recipients.length === 0) {
    return {
      skipped: true,
      reason: "Recipient list is empty."
    };
  }

  try {
    const response = await fetch(BREVO_SEND_EMAIL_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY
      },
      body: JSON.stringify({
        sender,
        to: recipients,
        subject,
        textContent: text,
        htmlContent: html
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        skipped: true,
        reason: `Brevo API send failed (${response.status}): ${errorText || response.statusText}`
      };
    }

    return {
      skipped: false,
      provider: "brevo-api"
    };
  } catch (error) {
    return {
      skipped: true,
      reason: `Brevo API send failed: ${error.message}`
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
        provider: "brevo-api",
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
        <p style="margin-top: 0;">This confirms that your Brevo API configuration is working.</p>
        <p><strong>Requested by:</strong> ${requestedByName}</p>
        ${requestUrl ? `<p><a href="${requestUrl}" style="color: #1d4ed8;">Open Procurement System</a></p>` : ""}
      </div>
    `
  });

  return result.skipped
    ? result
    : {
        skipped: false,
        provider: "brevo-api",
        recipient: recipientEmail
      };
}
