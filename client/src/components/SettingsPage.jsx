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
  onWorkflowStageMove,
  onWorkflowStageSkipChange,
  onCurrencyOptionsChange,
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
  const [currencyDraft, setCurrencyDraft] = useState({ code: '', symbol: '' })
  const [currencyError, setCurrencyError] = useState('')

  function handleAddCurrency() {
    const code = currencyDraft.code.trim().toUpperCase()
    const symbol = currencyDraft.symbol.trim()
    const supportedCurrencyCodes =
      typeof Intl.supportedValuesOf === 'function'
        ? Intl.supportedValuesOf('currency')
        : null

    let isSupportedCurrency = false
    try {
      new Intl.NumberFormat('en', { style: 'currency', currency: code }).format(
        1,
      )
      isSupportedCurrency = true
    } catch {
      isSupportedCurrency = false
    }

    if (
      !/^[A-Z]{3}$/.test(code) ||
      !symbol ||
      symbol.length > 4 ||
      (supportedCurrencyCodes && !supportedCurrencyCodes.includes(code)) ||
      !isSupportedCurrency
    ) {
      setCurrencyError('Enter a valid 3-letter currency code and its symbol.')
      return
    }

    if (form.currencies?.some((currency) => currency.code === code)) {
      setCurrencyError(`${code} is already in the currency list.`)
      return
    }

    onCurrencyOptionsChange?.([...(form.currencies || []), { code, symbol }])
    setCurrencyDraft({ code: '', symbol: '' })
    setCurrencyError('')
  }

  function handleDeleteCurrency(code) {
    if ((form.currencies || []).length <= 1) {
      setCurrencyError('At least one currency must remain available.')
      return
    }

    onCurrencyOptionsChange?.(
      form.currencies.filter((currency) => currency.code !== code),
    )
    setCurrencyError('')
  }

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
            <button
              className='ghost-button settings-back-button'
              type='button'
              onClick={onClose}
            >
              <span aria-hidden='true'>←</span>
              <span>Back to dashboard</span>
            </button>
          </div>
        </div>

        <section className='panel action-panel settings-profile-panel'>
          <div className='panel-heading'>
            <div>
              <p className='eyebrow'>Profile</p>
              <h2>{user?.name || 'My account'}</h2>
              <p className='hero-copy'>
                {user?.email || 'Update your personal account settings.'}
              </p>
            </div>
          </div>

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
          <button
            className='ghost-button settings-back-button'
            type='button'
            onClick={onClose}
          >
            <span aria-hidden='true'>←</span>
            <span>Back to dashboard</span>
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
              className={`settings-shortcut-button ${activeSection === 'workflow' ? 'is-primary' : ''}`}
              type='button'
              onClick={() => setActiveSection('workflow')}
            >
              Workflow
            </button>
            <button
              className={`settings-shortcut-button ${activeSection === 'currencies' ? 'is-primary' : ''}`}
              type='button'
              onClick={() => setActiveSection('currencies')}
            >
              Currencies
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
          {activeSection === 'currencies' ? (
            <section
              className={`panel settings-branding-panel ${isMainSettingsEditing ? 'is-active' : 'is-inactive'}`}
            >
              <div
                className={`settings-panel-actions ${isMainSettingsEditing ? 'is-active' : ''}`}
              >
                {isMainSettingsEditing ? (
                  <button
                    className='ghost-button settings-panel-cancel'
                    type='button'
                    onClick={() => {
                      setCurrencyError('')
                      setCurrencyDraft({ code: '', symbol: '' })
                      onCancelMainSettingsEdit()
                    }}
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
                  <p className='eyebrow'>Currencies</p>
                  <h2>Amount currency options</h2>
                  <p className='hero-copy'>
                    Manage the currencies available when creating a request.
                  </p>
                </div>
              </div>

              <div className='settings-form-card currency-settings-card'>
                <div className='currency-settings-list'>
                  {(form.currencies || []).map((currency) => (
                    <div className='currency-settings-item' key={currency.code}>
                      <span
                        className='currency-settings-symbol'
                        aria-hidden='true'
                      >
                        {currency.symbol}
                      </span>
                      <div>
                        <strong>{currency.code}</strong>
                        <small>{currency.symbol}</small>
                      </div>
                      <button
                        className='ghost-button danger-link'
                        type='button'
                        onClick={() => handleDeleteCurrency(currency.code)}
                        disabled={!isMainSettingsEditing}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>

                <div className='currency-settings-add'>
                  <label>
                    Currency code
                    <input
                      value={currencyDraft.code}
                      onChange={(event) => {
                        setCurrencyDraft((current) => ({
                          ...current,
                          code: event.target.value.toUpperCase().slice(0, 3),
                        }))
                        setCurrencyError('')
                      }}
                      placeholder='JPY'
                      maxLength='3'
                      disabled={!isMainSettingsEditing}
                    />
                  </label>
                  <label>
                    Symbol
                    <input
                      value={currencyDraft.symbol}
                      onChange={(event) => {
                        setCurrencyDraft((current) => ({
                          ...current,
                          symbol: event.target.value.slice(0, 4),
                        }))
                        setCurrencyError('')
                      }}
                      placeholder='¥'
                      maxLength='4'
                      disabled={!isMainSettingsEditing}
                    />
                  </label>
                  <button
                    type='button'
                    onClick={handleAddCurrency}
                    disabled={!isMainSettingsEditing}
                  >
                    Add currency
                  </button>
                </div>
                {currencyError ? (
                  <p className='error-text'>{currencyError}</p>
                ) : null}
              </div>
            </section>
          ) : activeSection === 'workflow' ? (
            <section
              id='settings-workflow-panel'
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
                  <p className='eyebrow'>Workflow</p>
                  <h2>Workflow order</h2>
                  <p className='hero-copy'>
                    Reorder the procurement stages for new requests only.
                    Existing requests will keep their current workflow order.
                  </p>
                </div>
              </div>

              <div className='settings-form-card'>
                <div className='settings-workflow-list'>
                  {(form.workflowStages || []).map((stage, index, stages) => (
                    <article className='settings-workflow-item' key={stage}>
                      <div className='settings-workflow-index'>
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div className='settings-workflow-stage'>
                        <strong>{stage}</strong>
                      </div>
                      <div className='settings-workflow-actions'>
                        <button
                          className='ghost-button'
                          type='button'
                          onClick={() => onWorkflowStageMove(stage, 'up')}
                          disabled={!isMainSettingsEditing || index === 0}
                        >
                          Move up
                        </button>
                        <button
                          className='ghost-button'
                          type='button'
                          onClick={() => onWorkflowStageMove(stage, 'down')}
                          disabled={
                            !isMainSettingsEditing || index === stages.length - 1
                          }
                        >
                          Move down
                        </button>
                        <label className='settings-workflow-skip'>
                          <input
                            type='checkbox'
                            checked={Boolean(
                              form.skippedWorkflowStages?.includes(stage),
                            )}
                            disabled={
                              !isMainSettingsEditing ||
                              stage === 'Purchase Request'
                            }
                            onChange={(event) =>
                              onWorkflowStageSkipChange?.(
                                stage,
                                event.target.checked,
                              )
                            }
                          />
                          <span>Skip</span>
                        </label>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          ) : activeSection === 'users' ? (
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
