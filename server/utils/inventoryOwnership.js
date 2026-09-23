export function ownershipQuery(user, uniqueName) {
  const choices = [{ accountableUserId: user._id }];
  if (uniqueName && user.name?.trim()) {
    const escaped = user.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    choices.push({ accountableUserId: null, accountableTo: { $regex: `^\\s*${escaped}\\s*$`, $options: 'i' } });
  }
  return { archived: false, $or: choices };
}

export function personalSummary(item) {
  const data = item.data || {};
  return {
    id: String(item._id), code: item.recordCode, name: item.name, status: item.status,
    company: item.company, provider: data.provider, accountNumber: data.accountNumber,
    mobileNumber: data.mobileNumber, type: data.category, location: data.location || data.installationAddress,
    renewalDate: item.renewalDate, issueDate: data.issueDate,
  };
}
