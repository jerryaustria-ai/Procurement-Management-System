import { useState } from 'react'
import AuditTrailPage from './AuditTrailPage.jsx'
import PurchaseOrderDirectoryPage from './PurchaseOrderDirectoryPage.jsx'
import RfpDirectoryPage from './RfpDirectoryPage.jsx'
import SupplierManagementPage from './SupplierManagementPage.jsx'
import UserManagementPanel from './UserManagementPanel.jsx'

export default function SettingsPage({
  user,
  isAdmin,
  identities,
  canManageIdentities,
  isMainSettingsEditing,
  form,
  onChange,
  requesterForm,
  onRequesterChange,
  onSaveRequesterSettings,
  onLogoFileChange,
  onStartMainSettingsEdit,
  onCancelMainSettingsEdit,
  onSave,
  onCreateIdentity,
  onEditIdentity,
  onDeleteIdentity,
  users,
  selectedUserId,
  onSelectUser,
  onCreateNewUser,
  onEditUser,
  onDeleteUser,
  suppliers,
  selectedSupplierId,
  onSelectSupplier,
  onCreateNewSupplier,
  onEditSupplier,
  onDeleteSupplier,
  purchaseOrderItems,
  onOpenPurchaseOrderItem,
  rfpItems,
  onOpenRfpItem,
  onPrintRfpItem,
  auditItems,
  onOpenSuppliers,
  onOpenUsers,
  onOpenPurchaseOrder,
  onOpenAuditTrail,
  settingsError,
  isSubmitting,
  onClose,
}) {
  const [activeSection, setActiveSection] = useState('branding')

  if (!isAdmin) {
    return (
      <section className='po-page'>
        <div className='po-page-header'>
          <div>
            <p className='eyebrow'>User Settings</p>
            <h1>Settings</h1>
            <p className='hero-copy'>
              Manage your account security and notification preferences.
            </p>
          </div>
          <div className='po-page-actions'>
            <button className='ghost-button' type='button' onClick={onClose}>
              Back to dashboard
            </button>
          </div>
        </div>

        <section className='panel action-panel'>
          <div className='panel-heading'>
            <div>
              <p className='eyebrow'>Profile</p>
              <h2>{user?.name || 'My account'}</h2>
              <p className='hero-copy'>
                {user?.email || 'Update your personal account settings.'}
              </p>
            </div>
          </div>

          <div className='form-grid two-column'>
            <label>
              Current password
              <input
                name='currentPassword'
                type='password'
                value={requesterForm.currentPassword}
                onChange={onRequesterChange}
                placeholder='Enter current password'
              />
            </label>
            <label>
              New password
              <input
                name='newPassword'
                type='password'
                value={requesterForm.newPassword}
                onChange={onRequesterChange}
                placeholder='Enter new password'
              />
            </label>
          </div>

          <label>
            Confirm new password
            <input
              name='confirmPassword'
              type='password'
              value={requesterForm.confirmPassword}
              onChange={onRequesterChange}
              placeholder='Confirm new password'
            />
          </label>

          <label className='settings-checkbox-row'>
            <input
              name='notifyOnRequestChanges'
              type='checkbox'
              checked={requesterForm.notifyOnRequestChanges}
              onChange={onRequesterChange}
            />
            <div>
              <strong>
                Notify me via email if there are changes in my request
              </strong>
              <p>
                Receive email alerts whenever your purchase request status or
                workflow changes.
              </p>
            </div>
          </label>

          <div className='button-row'>
            <button
              type='button'
              onClick={onSaveRequesterSettings}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save settings'}
            </button>
          </div>
          {settingsError ? <p className='error-text'>{settingsError}</p> : null}
        </section>
      </section>
    )
  }

  return (
    <section className='po-page'>
      <div className='po-page-header'>
        <div>
          <p className='eyebrow'>System Settings</p>
          <h1>Settings</h1>
        </div>
        <div className='po-page-actions'>
          <button className='ghost-button' type='button' onClick={onClose}>
            Back to dashboard
          </button>
        </div>
      </div>

      <div className='settings-admin-layout'>
        <section className='panel settings-admin-sidebar'>
          <div className='panel-heading'>
            <div>
              <p className='eyebrow'>Admin</p>
              <h2>Quick access</h2>
            </div>
          </div>
          <div className='settings-shortcut-grid'>
            <button
              className={`settings-shortcut-button ${activeSection === 'branding' ? 'is-primary' : ''}`}
              type='button'
              onClick={() => setActiveSection('branding')}
            >
              Branding
            </button>
            <button
              className={`settings-shortcut-button ${activeSection === 'users' ? 'is-primary' : ''}`}
              type='button'
              onClick={() => setActiveSection('users')}
            >
              Users
            </button>
            <button
              className={`settings-shortcut-button ${activeSection === 'suppliers' ? 'is-primary' : ''}`}
              type='button'
              onClick={() => setActiveSection('suppliers')}
            >
              Suppliers
            </button>
            <button
              className={`settings-shortcut-button ${activeSection === 'purchase-order' ? 'is-primary' : ''}`}
              type='button'
              onClick={() => setActiveSection('purchase-order')}
            >
              Purchase Order
            </button>
            <button
              className={`settings-shortcut-button ${activeSection === 'rfp' ? 'is-primary' : ''}`}
              type='button'
              onClick={() => setActiveSection('rfp')}
            >
              RFP
            </button>
            <button
              className={`settings-shortcut-button ${activeSection === 'audit-trail' ? 'is-primary' : ''}`}
              type='button'
              onClick={() => setActiveSection('audit-trail')}
            >
              Audit Trail
            </button>
          </div>
        </section>

        <div className='settings-admin-content'>
          {activeSection === 'users' ? (
            <UserManagementPanel
              users={users}
              selectedUserId={selectedUserId}
              onSelect={onSelectUser}
              onCreateNew={onCreateNewUser}
              onEditSelected={onEditUser}
              onDeleteSelected={onDeleteUser}
              showExpand={false}
            />
          ) : activeSection === 'suppliers' ? (
            <SupplierManagementPage
              suppliers={suppliers}
              selectedSupplierId={selectedSupplierId}
              onSelect={onSelectSupplier}
              onCreateNew={onCreateNewSupplier}
              onEditSelected={onEditSupplier}
              onDeleteSelected={onDeleteSupplier}
              canManage={isAdmin}
              embedded
            />
          ) : activeSection === 'purchase-order' ? (
            <PurchaseOrderDirectoryPage
              items={purchaseOrderItems}
              onOpen={onOpenPurchaseOrderItem}
              embedded
            />
          ) : activeSection === 'rfp' ? (
            <RfpDirectoryPage
              items={rfpItems}
              onOpen={onOpenRfpItem}
              onPrint={onPrintRfpItem}
              embedded
            />
          ) : activeSection === 'audit-trail' ? (
            <AuditTrailPage items={auditItems} embedded />
          ) : (
            <>
              <section
                id='settings-branding-panel'
                className={`panel settings-branding-panel ${isMainSettingsEditing ? 'is-active' : 'is-inactive'}`}
              >
                <div
                  className={`settings-panel-actions ${isMainSettingsEditing ? 'is-active' : ''}`}
                >
                  {isMainSettingsEditing ? (
                    <button
                      className='ghost-button settings-panel-cancel'
                      type='button'
                      onClick={onCancelMainSettingsEdit}
                    >
                      Cancel
                    </button>
                  ) : null}
                  <button
                    className={`settings-panel-toggle ${isMainSettingsEditing ? 'is-active' : ''}`}
                    type='button'
                    onClick={
                      isMainSettingsEditing ? onSave : onStartMainSettingsEdit
                    }
                  >
                    {isMainSettingsEditing ? 'Save' : 'Edit'}
                  </button>
                </div>
                <div className='panel-heading'>
                  <div>
                    <p className='eyebrow'>Branding</p>
                    <h2>Company identity</h2>
                  </div>
                </div>

                <div className='settings-grid'>
                  <div
                    className={`settings-logo-card ${isMainSettingsEditing ? 'is-active' : 'is-inactive'}`}
                  >
                    <span>Logo preview</span>
                    <div className='settings-logo-preview'>
                      <img src={form.logoUrl} alt={form.companyName} />
                    </div>
                    <label
                      className={`settings-file-field ${isMainSettingsEditing ? '' : 'is-disabled'}`}
                    >
                      Replace logo
                      <input
                        type='file'
                        accept='.ico,.png,.jpg,.jpeg,.svg,.webp'
                        onChange={onLogoFileChange}
                        disabled={!isMainSettingsEditing}
                      />
                    </label>
                  </div>

                  <div
                    className={`settings-form-card ${isMainSettingsEditing ? 'is-active' : 'is-inactive'}`}
                  >
                    <label>
                      Company name
                      <input
                        name='companyName'
                        value={form.companyName}
                        onChange={onChange}
                        disabled={!isMainSettingsEditing}
                      />
                    </label>

                    <label>
                      Address
                      <textarea
                        name='address'
                        value={form.address}
                        onChange={onChange}
                        rows='4'
                        placeholder='Enter the complete office address'
                        disabled={!isMainSettingsEditing}
                      />
                    </label>

                    <label>
                      General Accountant / Head ACC Name
                      <input
                        name='generalAccountantName'
                        value={form.generalAccountantName || ''}
                        onChange={onChange}
                        disabled={!isMainSettingsEditing}
                        placeholder='Enter the name for General Accountant / Head ACC'
                      />
                    </label>

                    <label>
                      Chief Investment Officer Name
                      <input
                        name='chiefInvestmentOfficerName'
                        value={form.chiefInvestmentOfficerName || ''}
                        onChange={onChange}
                        disabled={!isMainSettingsEditing}
                        placeholder='Enter the name for Chief Investment Officer'
                      />
                    </label>
                  </div>
                </div>
              </section>

              <section className='panel'>
                <div className='panel-heading'>
                  <div>
                    <p className='eyebrow'>Subsidiaries</p>
                    <h2>Branch company identities</h2>
                    <p className='hero-copy'>
                      Create a different address and logo for a branch or
                      subsidiary.
                    </p>
                  </div>
                  {canManageIdentities ? (
                    <button
                      className='ghost-button'
                      type='button'
                      onClick={onCreateIdentity}
                    >
                      New identity
                    </button>
                  ) : null}
                </div>

                <div className='settings-form-card'>
                  {identities.length ? (
                    <div className='settings-identity-list'>
                      {identities.map((identity) => (
                        <article
                          className='settings-identity-card'
                          key={identity.id}
                        >
                          <div className='settings-identity-top'>
                            <div className='settings-identity-logo'>
                              <img
                                src={identity.logoUrl}
                                alt={identity.branchName}
                              />
                            </div>
                            <div>
                              <strong>{identity.branchName}</strong>
                            </div>
                          </div>
                          <small>{identity.address}</small>
                          <div className='request-card-actions'>
                            <button
                              className='ghost-button'
                              type='button'
                              onClick={() => onEditIdentity(identity.id)}
                            >
                              Edit
                            </button>
                            <button
                              className='ghost-button danger-link'
                              type='button'
                              onClick={() => onDeleteIdentity(identity.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className='empty-state'>
                      No branch or subsidiary identities yet.
                    </p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
