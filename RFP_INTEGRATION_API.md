# Request for Payment Integration API

This read-only API returns Request for Payment forms whose payment status is
`Approved` or `Processed`, together with their attachment metadata and direct
view/download URLs.

## Endpoint

```text
GET /api/integrations/rfp-approved-processed
```

Production URL:

```text
https://pms-fwa4.onrender.com/api/integrations/rfp-approved-processed
```

The filter uses `rfpDraft.paymentStatus`, so it includes RFP forms created from
Purchase Requests and other request types. It does not rely only on the original
request category.

## Authentication

Set `RFP_INTEGRATION_API_KEY` in the backend environment. Send the key in either
the `X-API-Key` header or as a bearer token.

```bash
curl \
  -H "X-API-Key: YOUR_API_KEY" \
  https://pms-fwa4.onrender.com/api/integrations/rfp-approved-processed
```

Generate a strong key with:

```bash
openssl rand -hex 32
```

Keep this key on a trusted server. Do not place it in public frontend code.

## Response

```json
{
  "apiVersion": "1.0",
  "module": "Request for Payment",
  "paymentStatuses": ["Approved", "Processed"],
  "count": 1,
  "fetchedAt": "2026-10-29T07:00:00.000Z",
  "forms": [
    {
      "id": "...",
      "requestNumber": "PR-2026-001",
      "rfpNumber": "RFP-2026-001",
      "paymentStatus": "Approved",
      "paymentStatusUpdatedAt": "2026-10-29T06:30:00.000Z",
      "formData": {},
      "attachments": [
        {
          "id": "...",
          "type": "invoice",
          "label": "Invoice",
          "originalName": "invoice.pdf",
          "mimeType": "application/pdf",
          "size": 125000,
          "storageProvider": "cloudinary",
          "uploadedBy": "User Name",
          "uploadedByRole": "accountant",
          "uploadedAt": "2026-10-29T06:35:00.000Z",
          "url": "https://...",
          "viewUrl": "https://...",
          "downloadUrl": "https://..."
        }
      ]
    }
  ]
}
```

`formData` contains the complete serialized request and RFP form data. Workflow
history and role-permission metadata are intentionally excluded. This endpoint
does not create, edit, or delete records.
