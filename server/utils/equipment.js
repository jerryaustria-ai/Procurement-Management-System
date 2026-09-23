export const categories = ['Laptop', 'MacBook', 'Desktop Computer', 'iPad', 'Tablet', 'Mobile Phone', 'Monitor', 'Printer', 'Projector', 'Router', 'Network Device', 'UPS', 'External Drive', 'Other Equipment'];
export const conditions = ['Brand New', 'Good', 'Fair', 'Damaged', 'Defective', 'For Repair', 'Beyond Repair'];
export const statuses = ['Available', 'Issued', 'In Storage', 'Borrowed', 'Under Repair', 'For Replacement', 'Returned', 'Lost', 'Retired', 'Disposed'];

function fail(message) { const error = new Error(message); error.status = 400; throw error; }
function validDate(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value; }

export function validateEquipment(payload) {
  if (!statuses.includes(payload.status)) fail('Select a valid equipment status.');
  if (!categories.includes(payload.data?.category)) fail('Select an equipment category.');
  if (!conditions.includes(payload.data?.condition)) fail('Select an equipment condition.');
}

export function issueEntry(values, user) {
  if (!values.employeeName?.trim() || !values.department?.trim() || !validDate(values.issueDate) || !conditions.includes(values.conditionUponIssue) || !values.issuedBy?.trim() || !values.receivedBy?.trim()) {
    fail('Employee, department, valid issue date, issue condition, issued by, and received by are required.');
  }
  return {
    employeeName: values.employeeName.trim(), department: values.department.trim(), issueDate: values.issueDate,
    returnDate: '', conditionUponIssue: values.conditionUponIssue, conditionUponReturn: '',
    issuedBy: values.issuedBy.trim(), receivedBy: values.receivedBy.trim(), returnReceivedBy: '',
    transferDetails: values.transferDetails || '', remarks: values.remarks || '',
    recordedAt: new Date(), recordedBy: user.email,
  };
}

export function applyAccountability(item, values, user) {
  if (!['issue', 'transfer', 'return'].includes(values.action)) fail('Choose issue, transfer, or return.');
  if (item.archived) fail('Restore this equipment before changing accountability.');
  if (['Disposed', 'Retired', 'Under Repair'].includes(item.status) || (item.status === 'Lost' && values.action !== 'return')) fail('This equipment cannot be issued or transferred in its current status.');
  const history = item.accountabilityHistory;
  let active = history.find((entry) => !entry.returnDate);
  // Preserve the current custodian of older equipment before recording its first movement.
  if (!active && item.accountableTo) {
    active = { employeeName: item.accountableTo, department: item.data?.department || '', issueDate: item.data?.issueDate || '',
      returnDate: '', conditionUponIssue: item.data?.condition || '', conditionUponReturn: '', issuedBy: '', receivedBy: '',
      transferDetails: '', remarks: 'Previous assignment preserved from legacy record; unspecified details are unknown.', recordedAt: new Date(), recordedBy: user.email };
    history.push(active);
    active = history[history.length - 1];
  }
  if (values.action === 'issue' && active) fail('This equipment is already issued. Use Transfer or Return.');
  if (values.action !== 'issue' && !active) fail('There is no active assignment to transfer or return.');
  const next = values.action !== 'return' ? issueEntry(values, user) : null;
  const lastReturn = history.map((entry) => entry.returnDate || '').sort().at(-1);
  if (values.action === 'issue' && lastReturn && next.issueDate < lastReturn) fail('New issue date cannot precede the previous return date.');
  if (values.action === 'transfer' && !values.transferDetails?.trim()) fail('Transfer details are required.');
  if (active) {
    if (!validDate(values.returnDate) || !conditions.includes(values.conditionUponReturn) || !values.returnReceivedBy?.trim()) fail('Return date, return condition, and receiving person are required.');
    if (active.issueDate && values.returnDate < String(active.issueDate).slice(0, 10)) fail('Return date cannot precede issue date.');
    if (next && next.issueDate < values.returnDate) fail('New issue date cannot precede return date.');
    active.returnDate = values.returnDate;
    active.conditionUponReturn = values.conditionUponReturn;
    active.returnReceivedBy = values.returnReceivedBy.trim();
    active.returnRemarks = values.remarks || '';
    active.returnRecordedAt = new Date();
    active.returnRecordedBy = user.email;
    active.returnTransferDetails = values.transferDetails || '';
  }
  if (next) history.push(next);
  item.accountableTo = next?.employeeName || '';
  item.status = next ? 'Issued' : 'Returned';
  item.data = { ...item.data, department: next?.department || '', issueDate: next?.issueDate || '', condition: next?.conditionUponIssue || values.conditionUponReturn };
}

export function applyEquipmentMovement(item, values, user) {
  if (item.archived) fail('Restore this equipment before recording a movement.');
  const before = { status: item.status, employee: item.accountableTo || '', department: item.data?.department || '', location: item.data?.location || '', condition: item.data?.condition || '' };
  const action = values.action;
  const movementDate = ['issue', 'transfer'].includes(action) ? values.issueDate : action === 'return' ? values.returnDate : values.movementDate;
  if (!validDate(movementDate)) fail('Enter a valid movement date.');
  const lastDate = [...(item.movementHistory || []).map((entry) => entry.movementDate || ''),
    ...item.accountabilityHistory.flatMap((entry) => [entry.issueDate || '', entry.returnDate || '']), item.data?.issueDate || ''].sort().at(-1);
  if (lastDate && movementDate < lastDate) fail('Movement date cannot precede the latest recorded movement.');
  if (values.action === 'transfer' && lastDate && values.returnDate < lastDate) fail('Transfer return date cannot precede the latest recorded movement.');
  if (['issue', 'transfer', 'return'].includes(action)) {
    applyAccountability(item, values, user);
  } else {
    if (!['repair-out', 'repair-in', 'lost', 'retire', 'dispose'].includes(action)) fail('Choose a valid equipment action.');
    if (!values.handledBy?.trim() || !values.remarks?.trim()) fail('Handled By and reason / remarks are required.');
    if (!conditions.includes(values.condition)) fail('Select the equipment condition.');
    if (item.status === 'Disposed') fail('Disposed equipment cannot have further movements.');
    if (action === 'repair-out') {
      if (['Under Repair', 'Lost', 'Retired'].includes(item.status)) fail('This equipment cannot be sent for repair in its current status.');
      if (!values.repairProvider?.trim()) fail('Repair provider or technician is required.');
      item.repairPreviousStatus = item.status;
      item.status = 'Under Repair';
    } else if (action === 'repair-in') {
      if (item.status !== 'Under Repair') fail('Only equipment under repair can be returned from repair.');
      item.status = item.accountableTo ? (item.repairPreviousStatus === 'Borrowed' ? 'Borrowed' : 'Issued') : 'Available';
      item.repairPreviousStatus = '';
    } else if (action === 'lost') {
      if (['Lost', 'Retired'].includes(item.status)) fail('This equipment is already lost or retired.');
      item.status = 'Lost';
    } else {
      if (item.accountableTo || item.accountabilityHistory.some((entry) => !entry.returnDate)) fail('Return equipment from its employee before retiring or disposing of it.');
      if (item.status === 'Under Repair') fail('Return equipment from repair first.');
      if (action === 'retire' && item.status === 'Retired') fail('This equipment is already retired.');
      item.status = action === 'retire' ? 'Retired' : 'Disposed';
    }
    item.data = { ...item.data, condition: values.condition };
  }
  item.movementHistory.push({ action, movementDate, before,
    after: { status: item.status, employee: item.accountableTo || '', department: item.data?.department || '', location: item.data?.location || '', condition: item.data?.condition || '' },
    handledBy: values.handledBy || values.issuedBy || values.returnReceivedBy || '',
    receivedBy: values.receivedBy || values.returnReceivedBy || '', repairProvider: values.repairProvider || '',
    transferDetails: values.transferDetails || '', remarks: values.remarks || '', recordedAt: new Date(), recordedBy: user.email,
  });
}
