# Equipment workflows

Open Office Equipment → View to issue, return, transfer, send for repair, receive from repair, mark lost, retire, or dispose of equipment. Admin and Super Admin can record movements; other signed-in users can view records and generate forms.

Repair preserves the employee's accountability. Returning from repair restores Issued/Borrowed when assigned, or Available when unassigned. Return assigned equipment before retiring or disposing of it. Disposed equipment cannot be moved again. Closed accountability entries retain original issuance details; movement history records before/after status, custodian, condition, date, handler, reason, and recording user.

Generate Accountability Form opens a printable page with signature lines. Select an earlier assignment to generate its form. Print QR Label and Download QR Code create equipment labels. QR codes contain only an equipment URL, never authentication tokens.

The QR link defaults to the current website origin. Set `VITE_EQUIPMENT_PUBLIC_URL` to the deployed frontend origin before building if labels are generated from a local workstation. Printed links must be reachable by the scanning device. Camera scanning requires HTTPS (or localhost) and browser camera permission; uploading a QR image is also supported. Scanned links require sign-in and open `/inventory?equipmentId=<record ID>`.

Deploy both frontend and backend updates. New routes include authenticated `GET /api/inventory/equipment/:id` and admin-only `POST /api/inventory/equipment/:id/accountability`. No data migration is required; legacy assignments are preserved when their first movement is recorded. Unknown historical details are not invented.

Verification:

```sh
npm run build --prefix client
node --test server/utils/equipment.test.js client/src/utils/equipmentDocuments.test.js client/src/utils/renewal.test.js
```
