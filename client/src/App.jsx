import { useEffect, useRef, useState } from "react";
import ActionPanel from "./components/ActionPanel.jsx";
import ConfirmDialog from "./components/ConfirmDialog.jsx";
import CreateRequestForm from "./components/CreateRequestForm.jsx";
import DocumentPanel from "./components/DocumentPanel.jsx";
import LoginForm from "./components/LoginForm.jsx";
import Modal from "./components/Modal.jsx";
import PanelExpandButton from "./components/PanelExpandButton.jsx";
import PurchaseOrderDirectoryPage from "./components/PurchaseOrderDirectoryPage.jsx";
import PurchaseOrderPage from "./components/PurchaseOrderPage.jsx";
import RequestForPaymentPage from "./components/RequestForPaymentPage.jsx";
import RequestAdminPanel from "./components/RequestAdminPanel.jsx";
import RequestList from "./components/RequestList.jsx";
import RequestSummary from "./components/RequestSummary.jsx";
import RequestWorkspacePage from "./components/RequestWorkspacePage.jsx";
import SettingsPage from "./components/SettingsPage.jsx";
import SupplierForm from "./components/SupplierForm.jsx";
import SupplierManagementPage from "./components/SupplierManagementPage.jsx";
import ToastStack from "./components/ToastStack.jsx";
import UserEditorPanel from "./components/UserEditorPanel.jsx";
import UserManagementPanel from "./components/UserManagementPanel.jsx";
import WorkflowTimeline from "./components/WorkflowTimeline.jsx";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
const API_ORIGIN = API_BASE_URL.replace(/\/api$/, "");
const DASHBOARD_REFRESH_MS = 5000;
const BRANCH_OPTIONS = [
  "Januarius Holdings",
  "Stats",
  "Januarius Performance Center"
];
const DEFAULT_COMPANY_SETTINGS = {
  companyName: "Januarius Holdings Inc.",
  logoUrl: "/JANUARIUS.ico",
  address: "Januarius Holdings Inc., Head Office, Makati City, Metro Manila, Philippines"
};
const OFFICE_ADDRESS_MAP = {
  "Januarius Holdings": "Januarius Holdings Inc., Head Office, Makati City, Metro Manila, Philippines",
  Stats: "Stats Office, Mandaluyong City, Metro Manila, Philippines",
  "Januarius Performance Center":
    "Januarius Performance Center, Quezon City, Metro Manila, Philippines"
};

function getStoredTheme() {
  try {
    return localStorage.getItem("procurement-theme") || "dark";
  } catch {
    return "dark";
  }
}

function getOfficeDeliveryAddress(branch, fallbackAddress = "") {
  return (
    OFFICE_ADDRESS_MAP[branch] ||
    fallbackAddress ||
    "Januarius Holdings Inc., Head Office, Makati City, Metro Manila, Philippines"
  );
}

function getInitialIdentityForm(defaults = DEFAULT_COMPANY_SETTINGS) {
  return {
    branchName: "",
    address: defaults.address,
    logoUrl: defaults.logoUrl
  };
}

function getCompanyIdentityForBranch(branch, companySettings, identities = []) {
  const normalizedBranch = String(branch || "").trim().toLowerCase();

  if (!normalizedBranch) {
    return companySettings;
  }

  const matchedIdentity = identities.find(
    (identity) => String(identity.branchName || "").trim().toLowerCase() === normalizedBranch
  );

  return matchedIdentity || companySettings;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read the selected image."));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to process the selected image."));
    image.src = source;
  });
}

async function optimizeLogoFile(file) {
  const fileName = String(file?.name || "").toLowerCase();
  const isIco = file?.type === "image/x-icon" || fileName.endsWith(".ico");

  if (isIco) {
    if ((file?.size || 0) > 600 * 1024) {
      throw new Error("ICO logo is too large. Please use a smaller icon file.");
    }

    return readFileAsDataUrl(file);
  }

  const source = await readFileAsDataUrl(file);
  const image = await loadImageElement(source);
  const maxDimension = 320;
  const scale = Math.min(1, maxDimension / Math.max(image.width || 1, image.height || 1));
  const width = Math.max(1, Math.round((image.width || 1) * scale));
  const height = Math.max(1, Math.round((image.height || 1) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to prepare the selected image.");
  }

  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/webp", 0.82);
}

function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem("procurement-session") || "null");
  } catch {
    return null;
  }
}

function getInitialRequestForm(department = "", requesterName = "", requesterEmail = "") {
  return {
    requesterName,
    requesterEmail,
    title: "",
    description: "",
    branch: "Januarius Holdings",
    department,
    amount: "",
    currency: "PHP",
    dateNeeded: "",
    deliveryAddress: "",
    notes: ""
  };
}

function getInitialUserForm() {
  return {
    name: "",
    email: "",
    role: "requester",
    department: "",
    password: ""
  };
}

function getInitialSupplierForm() {
  return {
    name: "",
    category: "Product",
    supplierType: "Manufacturer",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    notes: ""
  };
}

function getInitialPurchaseOrderLineItem() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    qty: "1",
    unit: "",
    description: "",
    unitPrice: "",
    total: ""
  };
}

function getInitialPurchaseOrderForm() {
  return {
    supplier: "",
    poNumber: "",
    notes: "",
    salesTax: "",
    shippingHandling: "",
    other: "",
    lineItems: [getInitialPurchaseOrderLineItem()]
  };
}

function getPurchaseOrderDraft(item, items) {
  if (item?.poDraft) {
    return {
      supplier: item.poDraft.supplier ?? "",
      poNumber: item.poDraft.poNumber || getAssignedPurchaseOrderNumber(item, items),
      notes: item.poDraft.notes ?? "",
      salesTax: item.poDraft.salesTax ?? "",
      shippingHandling: item.poDraft.shippingHandling ?? "",
      other: item.poDraft.other ?? "",
      lineItems:
        item.poDraft.lineItems && item.poDraft.lineItems.length
          ? item.poDraft.lineItems
          : [getInitialPurchaseOrderLineItem()]
    };
  }

  return {
    supplier: item?.supplier === "Pending selection" ? "" : item?.supplier || "",
    poNumber: getAssignedPurchaseOrderNumber(item, items),
    notes: item?.notes || "",
    salesTax: "",
    shippingHandling: "",
    other: "",
    lineItems: [getInitialPurchaseOrderLineItem()]
  };
}

function getInitialRequestForPaymentForm() {
  return {
    payee: "",
    invoiceNumber: "",
    paymentReference: "",
    amountRequested: "",
    dueDate: "",
    notes: ""
  };
}

function getNextPurchaseOrderNumber(items) {
  const currentYear = new Date().getFullYear();
  let highestYear = currentYear;
  let highestSequence = 0;

  items.forEach((item) => {
    const value = String(item.poNumber || "").trim();
    const match = value.match(/^PO-(\d{4})-(\d+)$/i);

    if (!match) {
      return;
    }

    const year = Number.parseInt(match[1], 10);
    const sequence = Number.parseInt(match[2], 10);

    if (year > highestYear || (year === highestYear && sequence > highestSequence)) {
      highestYear = year;
      highestSequence = sequence;
    }
  });

  const nextSequence = String(highestSequence + 1).padStart(3, "0");
  return `PO-${highestYear}-${nextSequence}`;
}

function getAssignedPurchaseOrderNumber(item, items) {
  return item?.poNumber || getNextPurchaseOrderNumber(items);
}

function getRequestAdminForm(item) {
  if (!item) {
    return {
      title: "",
      description: "",
      branch: "Januarius Holdings",
      department: "",
      amount: "",
      dateNeeded: "",
      status: "open",
      currentStage: "",
      inspectionStatus: "pending",
      supplier: "",
      poNumber: "",
      invoiceNumber: "",
      paymentReference: "",
      notes: ""
    };
  }

  return {
    title: item.title ?? "",
    description: item.description ?? "",
    branch: item.branch ?? "Januarius Holdings",
    department: item.department ?? "",
    amount: String(item.amount ?? ""),
    dateNeeded: item.dateNeeded ? item.dateNeeded.slice(0, 10) : "",
    status: item.status ?? "open",
    currentStage: item.currentStage ?? "",
    inspectionStatus: item.inspectionStatus ?? "pending",
    supplier: item.supplier === "Pending selection" ? "" : item.supplier ?? "",
    poNumber: item.poNumber ?? "",
    invoiceNumber: item.invoiceNumber ?? "",
    paymentReference: item.paymentReference ?? "",
    notes: item.notes ?? ""
  };
}

function getDashboardStats(items) {
  const openCount = items.filter((item) => item.status === "open").length;
  const completedCount = items.filter((item) => item.status === "completed").length;
  const totalAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return [
    { label: "Open Requests", value: String(openCount).padStart(2, "0") },
    { label: "Completed", value: String(completedCount).padStart(2, "0") },
    { label: "Active Users", value: String(items.length).padStart(2, "0") },
    {
      label: "Tracked Value",
      value: new Intl.NumberFormat("en-PH", {
        style: "currency",
        currency: "PHP",
        maximumFractionDigits: 0
      }).format(totalAmount)
    }
  ];
}

function formatExportDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function escapeCsvValue(value) {
  const stringValue = String(value ?? "");
  return `"${stringValue.replaceAll('"', '""')}"`;
}

function parseAmountValue(value) {
  if (value === null || typeof value === "undefined") {
    return 0;
  }

  const normalized = String(value).replaceAll(",", "").trim();
  if (!normalized) {
    return 0;
  }

  return Number(normalized);
}

function formatCurrencyValue(value, currency = "PHP") {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency
  }).format(value || 0);
}

function CompanyHeader({
  isAuthenticated,
  user,
  onLogout,
  theme,
  onThemeChange,
  onOpenSuppliers,
  onOpenUsers,
  onOpenPurchaseOrder,
  onOpenSettings,
  companySettings = DEFAULT_COMPANY_SETTINGS
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }

    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  function handleMenuAction(action) {
    setIsMenuOpen(false);
    action?.();
  }

  return (
    <header className="company-header">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true">
          <img src={companySettings.logoUrl} alt="" />
        </div>
        <div>
          <p className="brand-kicker">{companySettings.companyName}</p>
          <strong>Procurement Management System</strong>
        </div>
      </div>

      <div className="header-meta">
        <div className="theme-toggle" role="group" aria-label="Theme switcher">
          <button
            className={theme === "light" ? "theme-toggle-button active" : "theme-toggle-button"}
            type="button"
            onClick={() => onThemeChange("light")}
          >
            Light
          </button>
          <button
            className={theme === "dark" ? "theme-toggle-button active" : "theme-toggle-button"}
            type="button"
            onClick={() => onThemeChange("dark")}
          >
            Dark
          </button>
        </div>
        {user ? (
          <div className="header-menu-wrap" ref={menuRef}>
            <button
              className="header-menu-trigger"
              type="button"
              onClick={() => setIsMenuOpen((current) => !current)}
              aria-haspopup="menu"
              aria-expanded={isMenuOpen}
            >
              <span>{user.name}</span>
              <span className="header-menu-caret" aria-hidden="true">
                ▾
              </span>
            </button>
            {isMenuOpen ? (
              <div className="header-menu-dropdown" role="menu" aria-label="Account menu">
                <button type="button" role="menuitem" onClick={() => handleMenuAction(onOpenSuppliers)}>
                  Suppliers
                </button>
                <button type="button" role="menuitem" onClick={() => handleMenuAction(onOpenUsers)}>
                  Users
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleMenuAction(onOpenPurchaseOrder)}
                >
                  Purchase Order
                </button>
                <button type="button" role="menuitem" onClick={() => handleMenuAction(onOpenSettings)}>
                  Settings
                </button>
                <button type="button" role="menuitem" onClick={() => handleMenuAction(onLogout)}>
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => getStoredTheme());
  const [companySettings, setCompanySettings] = useState(DEFAULT_COMPANY_SETTINGS);
  const [companyIdentities, setCompanyIdentities] = useState([]);
  const [settingsForm, setSettingsForm] = useState(DEFAULT_COMPANY_SETTINGS);
  const [identityForm, setIdentityForm] = useState(getInitialIdentityForm());
  const [editingIdentityId, setEditingIdentityId] = useState("");
  const [identitySaveMessage, setIdentitySaveMessage] = useState("");
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [isMainSettingsEditing, setIsMainSettingsEditing] = useState(false);
  const [session, setSession] = useState(() => getStoredSession());
  const [credentials, setCredentials] = useState({
    email: "admin@januarius.app",
    password: "password123"
  });
  const [items, setItems] = useState([]);
  const [stages, setStages] = useState([]);
  const [users, setUsers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [actionForm, setActionForm] = useState({
    supplier: "",
    notes: "",
    poNumber: "",
    invoiceNumber: "",
    paymentReference: "",
    deliveryDate: "",
    inspectionStatus: "pending",
    selectedItemId: "",
    selectedItemStage: ""
  });
  const [requestForm, setRequestForm] = useState(() =>
    getInitialRequestForm(
      session?.user?.department || "",
      session?.user?.role === "admin" ? "" : session?.user?.name || "",
      session?.user?.role === "admin" ? "" : session?.user?.email || ""
    )
  );
  const [requestQuotationFile, setRequestQuotationFile] = useState(null);
  const [uploadForm, setUploadForm] = useState({
    type: "po",
    label: "",
    file: null
  });
  const [requestAdminForm, setRequestAdminForm] = useState(() => getRequestAdminForm(null));
  const [userForm, setUserForm] = useState(getInitialUserForm());
  const [supplierForm, setSupplierForm] = useState(getInitialSupplierForm());
  const [purchaseOrderForm, setPurchaseOrderForm] = useState(getInitialPurchaseOrderForm());
  const [purchaseOrderDrafts, setPurchaseOrderDrafts] = useState({});
  const [isPurchaseOrderPageOpen, setIsPurchaseOrderPageOpen] = useState(false);
  const [isPurchaseOrderDirectoryOpen, setIsPurchaseOrderDirectoryOpen] = useState(false);
  const [isRequestForPaymentPageOpen, setIsRequestForPaymentPageOpen] = useState(false);
  const [requestForPaymentForm, setRequestForPaymentForm] = useState(getInitialRequestForPaymentForm());
  const [isRequestWorkspacePageOpen, setIsRequestWorkspacePageOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [actionError, setActionError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [userError, setUserError] = useState("");
  const [supplierError, setSupplierError] = useState("");
  const [isCreateRequestModalOpen, setIsCreateRequestModalOpen] = useState(false);
  const [isEditRequestModalOpen, setIsEditRequestModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isSupplierDirectoryOpen, setIsSupplierDirectoryOpen] = useState(false);
  const [isUserDirectoryOpen, setIsUserDirectoryOpen] = useState(false);
  const [isSettingsPageOpen, setIsSettingsPageOpen] = useState(false);
  const [supplierModalMode, setSupplierModalMode] = useState("create");
  const [expandedPanel, setExpandedPanel] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [toasts, setToasts] = useState([]);
  const dashboardRefreshInFlight = useRef(false);

  const isAdmin = session?.user?.role === "admin";
  const branchOptions = Array.from(
    new Set([...BRANCH_OPTIONS, ...companyIdentities.map((identity) => identity.branchName).filter(Boolean)])
  );
  const canCreateRequest = ["requester", "admin"].includes(session?.user?.role);
  const requesterOptions = users;
  const supplierOptions = Array.from(
    new Set(
      [...suppliers.map((supplier) => supplier.name), ...items.map((item) => item.supplier)]
        .filter((supplier) => supplier && supplier !== "Pending selection")
    )
  ).sort((left, right) => left.localeCompare(right));
  const filteredItems = items;
  const selectedItem =
    filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null;
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;
  const selectedSupplier = suppliers.find((supplier) => supplier.id === selectedSupplierId) ?? null;
  const dashboardStats = getDashboardStats(items);
  const purchaseOrderRecords = items.filter(
    (item) => String(item.poNumber || item.poDraft?.poNumber || "").trim()
  );
  const shouldPauseDashboardRefresh =
    isCreateRequestModalOpen ||
    isEditRequestModalOpen ||
    isUserModalOpen ||
    isSupplierModalOpen ||
    isRequestWorkspacePageOpen ||
    isRequestForPaymentPageOpen ||
    isPurchaseOrderPageOpen ||
    isSettingsPageOpen;
  const canManageDocuments = Boolean(
    selectedItem &&
      session?.user &&
      (session.user.role === "admin" ||
        session.user.email === selectedItem.requesterEmail ||
        selectedItem.allowedRoles.includes(session.user.role))
  );
  const canEditSelectedRequest = Boolean(
    selectedItem &&
      session?.user &&
      (session.user.role === "admin" || session.user.email === selectedItem.requesterEmail)
  );

  async function syncCompanySettings() {
    const response = await fetch(`${API_BASE_URL}/settings`);
    if (!response.ok) {
      throw new Error("Unable to load company settings.");
    }

    const data = await response.json();
    const nextSettings = {
      companyName: data.companyName || DEFAULT_COMPANY_SETTINGS.companyName,
      address: data.address || DEFAULT_COMPANY_SETTINGS.address,
      logoUrl: data.logoUrl || DEFAULT_COMPANY_SETTINGS.logoUrl
    };

    setCompanySettings(nextSettings);
    setSettingsForm(nextSettings);
    setCompanyIdentities(Array.isArray(data.identities) ? data.identities : []);
    return nextSettings;
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("procurement-theme", theme);
  }, [theme]);

  useEffect(() => {
    const favicon = document.querySelector("link[rel='icon']");
    if (favicon) {
      favicon.setAttribute("href", companySettings.logoUrl);
    }
  }, [companySettings]);

  useEffect(() => {
    let ignore = false;

    async function loadSettings() {
      try {
        if (ignore) {
          return;
        }

        const nextSettings = await syncCompanySettings();
        if (ignore) {
          return;
        }

        setIdentityForm(getInitialIdentityForm(nextSettings));
      } catch (_error) {
        if (ignore) {
          return;
        }

        setCompanySettings(DEFAULT_COMPANY_SETTINGS);
        setSettingsForm(DEFAULT_COMPANY_SETTINGS);
        setCompanyIdentities([]);
        setIdentityForm(getInitialIdentityForm());
      }
    }

    void loadSettings();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!toasts.length) {
      return;
    }

    const timers = toasts.map((toast) =>
      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== toast.id));
      }, toast.duration ?? 3200)
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [toasts]);

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedId("");
      return;
    }

    if (!filteredItems.some((item) => item.id === selectedId)) {
      setSelectedId(filteredItems[0].id);
    }
  }, [filteredItems, selectedId]);

  useEffect(() => {
    if (!selectedItem) {
      setRequestAdminForm(getRequestAdminForm(null));
      return;
    }

    setActionForm((current) => {
      const nextSupplier =
        selectedItem.supplier === "Pending selection" ? "" : selectedItem.supplier;
      const selectedIdChanged = current.selectedItemId !== selectedItem.id;
      const selectedStageChanged = current.selectedItemStage !== selectedItem.currentStage;

      if (!selectedIdChanged && !selectedStageChanged) {
        return {
          ...current,
          selectedItemId: selectedItem.id,
          selectedItemStage: selectedItem.currentStage
        };
      }

      return {
        supplier: nextSupplier,
        notes: "",
        poNumber: getAssignedPurchaseOrderNumber(selectedItem, items),
        invoiceNumber: selectedItem.invoiceNumber ?? "",
        paymentReference: selectedItem.paymentReference ?? "",
        deliveryDate: selectedItem.deliveryDate ? selectedItem.deliveryDate.slice(0, 10) : "",
        inspectionStatus: selectedItem.inspectionStatus ?? "pending",
        selectedItemId: selectedItem.id,
        selectedItemStage: selectedItem.currentStage
      };
    });
    setRequestAdminForm(getRequestAdminForm(selectedItem));
    setPurchaseOrderForm(
      purchaseOrderDrafts[selectedItem.id] ?? getPurchaseOrderDraft(selectedItem, items)
    );
    setUploadForm((current) => ({
      ...current,
      label: "",
      file: null
    }));
    setSelectedId(selectedItem.id);
  }, [selectedItem, purchaseOrderDrafts, items]);

  useEffect(() => {
    if (isUserModalOpen) {
      return;
    }

    if (!selectedUser) {
      setUserForm(getInitialUserForm());
      return;
    }

    setUserForm({
      name: selectedUser.name,
      email: selectedUser.email,
      role: selectedUser.role,
      department: selectedUser.department ?? "",
      password: ""
    });
  }, [selectedUser, isUserModalOpen]);

  useEffect(() => {
    if (!session?.token) {
      return;
    }

    localStorage.setItem("procurement-session", JSON.stringify(session));
    setRequestForm(
      getInitialRequestForm(
        session.user.department || "",
        session.user.role === "admin" ? "" : session.user.name || "",
        session.user.role === "admin" ? "" : session.user.email || ""
      )
    );
    void loadDashboard(session.token, session.user.role);
  }, [session]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    if (!users.length) {
      return;
    }

    setRequestForm((current) => {
      if (current.requesterEmail && users.some((user) => user.email === current.requesterEmail)) {
        return current;
      }

      const defaultUser = users[0];
      return {
        ...current,
        requesterName: defaultUser.name,
        requesterEmail: defaultUser.email
      };
    });
  }, [isAdmin, users]);

  function clearSession() {
    localStorage.removeItem("procurement-session");
    setSession(null);
    setItems([]);
    setStages([]);
    setUsers([]);
    setSuppliers([]);
    setSelectedId("");
    setSelectedUserId("");
    setRequestForm(getInitialRequestForm("", "", ""));
    setRequestQuotationFile(null);
    setRequestAdminForm(getRequestAdminForm(null));
    setUserForm(getInitialUserForm());
    setSupplierForm(getInitialSupplierForm());
    setIsCreateRequestModalOpen(false);
    setIsEditRequestModalOpen(false);
    setIsUserModalOpen(false);
    setIsSupplierModalOpen(false);
    setIsRequestWorkspacePageOpen(false);
    setExpandedPanel("");
    setConfirmDialog(null);
  }

  function handleSessionExpired() {
    clearSession();
    setAuthError("Your session expired. Please sign in again.");
    pushToast({
      title: "Session expired",
      message: "Please sign in again to continue.",
      variant: "error",
      duration: 4200
    });
  }

  async function loadDashboard(token, role, options = {}) {
    const { background = false } = options;

    if (dashboardRefreshInFlight.current) {
      return;
    }

    dashboardRefreshInFlight.current = true;

    if (!background) {
      setIsLoading(true);
      setActionError("");
      setUserError("");
    }

    try {
      const workflowPromise = fetch(`${API_BASE_URL}/workflows/purchase-requests`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const supplierPromise = fetch(`${API_BASE_URL}/suppliers`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const userPromise =
        role === "admin"
          ? fetch(`${API_BASE_URL}/users`, {
              headers: {
                Authorization: `Bearer ${token}`
              }
            })
          : Promise.resolve(null);

      const [workflowResponse, supplierResponse, userResponse] = await Promise.all([
        workflowPromise,
        supplierPromise,
        userPromise
      ]);

      if (
        workflowResponse.status === 401 ||
        supplierResponse.status === 401 ||
        userResponse?.status === 401
      ) {
        handleSessionExpired();
        return;
      }

      if (!workflowResponse.ok) {
        throw new Error("Unable to load workflow data.");
      }

      if (!supplierResponse.ok) {
        throw new Error("Unable to load suppliers.");
      }

      const workflowData = await workflowResponse.json();
      const supplierData = await supplierResponse.json();
      setStages(workflowData.stages);
      setItems(workflowData.items);
      setSuppliers(supplierData.items);
      setSelectedId((current) => current || workflowData.items[0]?.id || "");

      if (userResponse) {
        if (!userResponse.ok) {
          throw new Error("Unable to load users.");
        }

        const userData = await userResponse.json();
        setUsers(userData.items);
        setSelectedUserId((current) => current || userData.items[0]?.id || "");
      } else {
        setUsers([]);
        setSelectedUserId("");
      }
    } catch (error) {
      if (!background) {
        setActionError(error.message || "Unable to load dashboard.");
      }
    } finally {
      dashboardRefreshInFlight.current = false;
      if (!background) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!session?.token) {
      return;
    }

    if (shouldPauseDashboardRefresh) {
      return;
    }

    const refreshDashboard = () => {
      if (document.hidden) {
        return;
      }

      void loadDashboard(session.token, session.user.role, { background: true });
    };

    const intervalId = window.setInterval(refreshDashboard, DASHBOARD_REFRESH_MS);
    window.addEventListener("focus", refreshDashboard);
    document.addEventListener("visibilitychange", refreshDashboard);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshDashboard);
      document.removeEventListener("visibilitychange", refreshDashboard);
    };
  }, [session, shouldPauseDashboardRefresh]);

  function handleCredentialChange(event) {
    setCredentials((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  function pushToast({ title, message = "", variant = "success", duration = 3200 }) {
    setToasts((current) => [
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        title,
        message,
        variant,
        duration
      }
    ]);
  }

  function dismissToast(id) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  async function handleLogin() {
    setAuthError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      setSession(data);
      pushToast({
        title: "Signed in",
        message: `Welcome back, ${data.user.name}.`,
        variant: "success"
      });
    } catch (error) {
      setAuthError(error.message);
      pushToast({
        title: "Sign-in failed",
        message: error.message,
        variant: "error",
        duration: 4200
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleRequestFormChange(event) {
    setRequestForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  function handleRequestQuotationFileChange(event) {
    setRequestQuotationFile(event.target.files?.[0] ?? null);
  }

  function handleActionFormChange(event) {
    setActionForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  function handleUploadFormChange(event) {
    setUploadForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  function handleUploadFileChange(event) {
    const file = event.target.files?.[0] ?? null;
    setUploadForm((current) => ({
      ...current,
      file
    }));
  }

  function handleReviewApprovalFileChange(event) {
    const file = event.target.files?.[0] ?? null;
    setUploadForm({
      type: "other",
      label: "Boss approval attachment",
      file
    });
  }

  function handleRequestAdminFormChange(event) {
    setRequestAdminForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  function handleUserFormChange(event) {
    setUserForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  function handleSupplierFormChange(event) {
    setSupplierForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  function handlePurchaseOrderFormChange(event) {
    const { name, value } = event.target;

    if (name === "poNumber") {
      return;
    }

    setPurchaseOrderForm((current) => {
      const nextForm = {
        ...current,
        [name]: value
      };

      if (selectedItem?.id) {
        setPurchaseOrderDrafts((drafts) => ({
          ...drafts,
          [selectedItem.id]: nextForm
        }));
      }

      return nextForm;
    });

    if (["supplier", "notes"].includes(name)) {
      setActionForm((current) => ({
        ...current,
        [name]: value
      }));
    }
  }

  function handleSettingsFormChange(event) {
    setSettingsForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  function handleIdentityFormChange(event) {
    setIdentitySaveMessage("");
    setIdentityForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  function loadImageIntoForm(file, setter, options = {}) {
    if (!file) {
      return;
    }

    const { onStart, onDone, onError } = options;

    void (async () => {
      try {
        onStart?.();
        const optimizedLogoUrl = await optimizeLogoFile(file);
        setter((current) => ({
          ...current,
          logoUrl: optimizedLogoUrl || current.logoUrl
        }));
        onDone?.();
      } catch (error) {
        onError?.(error);
      }
    })();
  }

  function handleSettingsLogoChange(event) {
    const file = event.target.files?.[0];
    loadImageIntoForm(file, setSettingsForm, {
      onError: (error) =>
        pushToast({
          title: "Logo update failed",
          message: error.message,
          variant: "error",
          duration: 4200
        })
    });
  }

  function handleIdentityLogoChange(event) {
    const file = event.target.files?.[0];
    loadImageIntoForm(file, setIdentityForm, {
      onStart: () => setIdentitySaveMessage(""),
      onError: (error) =>
        pushToast({
          title: "Logo update failed",
          message: error.message,
          variant: "error",
          duration: 4200
        })
    });
  }

  function handleRequestForPaymentFormChange(event) {
    setRequestForPaymentForm((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  function handlePurchaseOrderLineItemChange(index, field, value) {
    setPurchaseOrderForm((current) => {
      const lineItems = current.lineItems.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        const nextItem = {
          ...item,
          [field]: value
        };

        const qty = Number.parseFloat(String(field === "qty" ? value : nextItem.qty).replaceAll(",", "")) || 0;
        const unitPrice =
          Number.parseFloat(
            String(field === "unitPrice" ? value : nextItem.unitPrice).replaceAll(",", "")
          ) || 0;

        return {
          ...nextItem,
          total: qty > 0 && unitPrice > 0 ? String(qty * unitPrice) : ""
        };
      });

      const nextForm = {
        ...current,
        lineItems
      };

      if (selectedItem?.id) {
        setPurchaseOrderDrafts((drafts) => ({
          ...drafts,
          [selectedItem.id]: nextForm
        }));
      }

      return nextForm;
    });
  }

  function handleAddPurchaseOrderLineItem() {
    setPurchaseOrderForm((current) => {
      const nextForm = {
        ...current,
        lineItems: [...current.lineItems, getInitialPurchaseOrderLineItem()]
      };

      if (selectedItem?.id) {
        setPurchaseOrderDrafts((drafts) => ({
          ...drafts,
          [selectedItem.id]: nextForm
        }));
      }

      return nextForm;
    });
  }

  function handleRemovePurchaseOrderLineItem(index) {
    setPurchaseOrderForm((current) => {
      const nextForm = {
        ...current,
        lineItems:
          current.lineItems.length === 1
            ? [getInitialPurchaseOrderLineItem()]
            : current.lineItems.filter((_, itemIndex) => itemIndex !== index)
      };

      if (selectedItem?.id) {
        setPurchaseOrderDrafts((drafts) => ({
          ...drafts,
          [selectedItem.id]: nextForm
        }));
      }

      return nextForm;
    });
  }

  function handleExportCsv() {
    const headers = [
      "Request Number",
      "Title",
      "Department",
      "Category",
      "Requester",
      "Amount",
      "Priority",
      "Status",
      "Current Stage",
      "Requested At",
      "Date Needed",
      "Supplier"
    ];

    const rows = filteredItems.map((item) => [
      item.requestNumber,
      item.title,
      item.branch,
      item.department,
      item.requester,
      item.amount,
      item.status,
      item.currentStage,
      formatExportDate(item.requestedAt),
      formatExportDate(item.dateNeeded),
      item.supplier
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((value) => escapeCsvValue(value)).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "procurement-request-list.csv";
    link.click();
    URL.revokeObjectURL(url);

    pushToast({
      title: "CSV exported",
      message: `${filteredItems.length} request${filteredItems.length === 1 ? "" : "s"} downloaded.`,
      variant: "success"
    });
  }

  function handleExportPdf() {
    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) {
      pushToast({
        title: "Popup blocked",
        message: "Allow popups to export the PDF view.",
        variant: "error",
        duration: 4200
      });
      return;
    }

    const exportTotalValue = filteredItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const rowsHtml = filteredItems
      .map(
        (item) => `
          <tr>
            <td>${item.requestNumber}</td>
            <td>${item.title}</td>
            <td>${item.branch ?? ""}</td>
            <td>${item.department}</td>
            <td>${item.requester}</td>
            <td>${item.currentStage}</td>
            <td>${item.status}</td>
            <td>${formatExportDate(item.requestedAt)}</td>
            <td>${formatExportDate(item.dateNeeded)}</td>
            <td>${item.supplier}</td>
          </tr>
        `
      )
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Procurement Request List</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 32px; color: #0f1720; }
            .report-header {
              display: flex;
              justify-content: space-between;
              gap: 24px;
              padding: 24px;
              border: 1px solid #d7dee7;
              border-radius: 18px;
              background: linear-gradient(135deg, #f8fafc 0%, #eef3f8 100%);
            }
            .brand {
              display: flex;
              gap: 14px;
              align-items: center;
            }
            .brand-mark {
              width: 52px;
              height: 52px;
              border-radius: 14px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, #d5b56c 0%, #f0c251 100%);
              color: #12202d;
              font-size: 24px;
              font-weight: 800;
            }
            .kicker { margin: 0 0 4px; color: #8b6d2b; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; }
            h1 { margin: 0 0 6px; font-size: 30px; }
            .subhead { margin: 0; color: #475569; }
            .meta {
              min-width: 240px;
              display: grid;
              gap: 10px;
            }
            .meta-card {
              padding: 12px 14px;
              border-radius: 14px;
              background: #ffffff;
              border: 1px solid #e2e8f0;
            }
            .meta-card span {
              display: block;
              font-size: 11px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              margin-bottom: 4px;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 12px;
              margin-top: 18px;
            }
            .summary-card {
              padding: 14px 16px;
              border-radius: 14px;
              border: 1px solid #e2e8f0;
              background: #ffffff;
            }
            .summary-card span {
              display: block;
              font-size: 11px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              margin-bottom: 6px;
            }
            .summary-card strong { font-size: 22px; }
            .filter-row {
              margin-top: 18px;
              padding: 12px 14px;
              border-radius: 14px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              color: #334155;
              font-size: 12px;
            }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            th, td { border: 1px solid #d7dee7; padding: 10px; text-align: left; font-size: 12px; vertical-align: top; }
            th { background: #e8eef5; color: #1e293b; }
            tbody tr:nth-child(even) { background: #f8fafc; }
            .footer { margin-top: 18px; color: #64748b; font-size: 11px; }
          </style>
        </head>
        <body>
          <section class="report-header">
            <div>
              <div class="brand">
                <div class="brand-mark">J</div>
                <div>
                  <p class="kicker">${companySettings.companyName}</p>
                  <h1>Procurement Request Report</h1>
                  <p class="subhead">Filtered registry export from the Procurement Management System.</p>
                </div>
              </div>
              <div class="summary-grid">
                <div class="summary-card">
                  <span>Requests</span>
                  <strong>${filteredItems.length}</strong>
                </div>
                <div class="summary-card">
                  <span>Open Requests</span>
                  <strong>${filteredItems.filter((item) => item.status === "open").length}</strong>
                </div>
                <div class="summary-card">
                  <span>Tracked Value</span>
                  <strong>${new Intl.NumberFormat("en-PH", {
                    style: "currency",
                    currency: "PHP",
                    maximumFractionDigits: 0
                  }).format(exportTotalValue)}</strong>
                </div>
              </div>
              <div class="filter-row">
                <strong>Scope:</strong> All requests currently visible in the registry
              </div>
            </div>
            <div class="meta">
              <div class="meta-card">
                <span>Generated by</span>
                <strong>${session?.user?.name ?? "System User"}</strong>
              </div>
              <div class="meta-card">
                <span>Generated on</span>
                <strong>${formatExportDate(new Date().toISOString())}</strong>
              </div>
            </div>
          </section>
          <table>
            <thead>
              <tr>
                <th>Request Number</th>
                <th>Title</th>
                <th>Branch</th>
                <th>Department</th>
                <th>Requester</th>
                <th>Current Stage</th>
                <th>Status</th>
                <th>Requested At</th>
                <th>Date Needed</th>
                <th>Supplier</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <p class="footer">Generated from the live filtered request registry.</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();

    pushToast({
      title: "PDF view opened",
      message: "Use the print dialog to save the filtered list as PDF.",
      variant: "success"
    });
  }

  function openCreateRequestModal() {
    setRequestForm(getInitialRequestForm(session?.user?.department || ""));
    setRequestQuotationFile(null);
    setIsCreateRequestModalOpen(true);
  }

  function openEditRequestModal() {
    if (!selectedItem || !canEditSelectedRequest) {
      return;
    }

    setRequestAdminForm(getRequestAdminForm(selectedItem));
    setIsEditRequestModalOpen(true);
  }

  function openEditRequestModalForItem(requestId) {
    const targetItem = items.find((item) => item.id === requestId);

    if (
      !targetItem ||
      !session?.user ||
      (session.user.role !== "admin" && session.user.email !== targetItem.requesterEmail)
    ) {
      return;
    }

    setSelectedId(targetItem.id);
    setRequestAdminForm(getRequestAdminForm(targetItem));
    setIsEditRequestModalOpen(true);
  }

  function openRequestDetailsModal() {
    if (!selectedItem) {
      return;
    }

    setIsRequestWorkspacePageOpen(true);
  }

  function openCreateUserModal() {
    setSelectedUserId("");
    setUserForm(getInitialUserForm());
    setUserError("");
    setIsUserModalOpen(true);
  }

  function openCreateSupplierModal() {
    if (!isAdmin) {
      return;
    }

    setSupplierModalMode("create");
    setSelectedSupplierId("");
    setSupplierError("");
    setSupplierForm(getInitialSupplierForm());
    setIsSupplierModalOpen(true);
  }

  function openEditSupplierModal(supplierId = selectedSupplierId) {
    const targetSupplier = suppliers.find((supplier) => supplier.id === supplierId);

    if (!isAdmin || !targetSupplier) {
      return;
    }

    setSupplierModalMode("edit");
    setSelectedSupplierId(targetSupplier.id);
    setSupplierError("");
    setSupplierForm({
      name: targetSupplier.name,
      category: targetSupplier.category,
      supplierType: targetSupplier.supplierType,
      contactPerson: targetSupplier.contactPerson ?? "",
      email: targetSupplier.email ?? "",
      phone: targetSupplier.phone ?? "",
      address: targetSupplier.address ?? "",
      notes: targetSupplier.notes ?? ""
    });
    setIsSupplierModalOpen(true);
  }

  function openConfirmDialog(config) {
    setConfirmDialog(config);
  }

  function openEditUserModal(userId = selectedUserId) {
    const targetUser = users.find((user) => user.id === userId);

    if (!targetUser) {
      return;
    }

    setSelectedUserId(targetUser.id);
    setUserForm({
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      department: targetUser.department ?? "",
      password: ""
    });
    setIsUserModalOpen(true);
  }

  function openExpandedPanel(panelKey) {
    setExpandedPanel(panelKey);
  }

  function closeExpandedPanel() {
    setExpandedPanel("");
  }

  function openRequestForPaymentPage() {
    if (!selectedItem) {
      return;
    }

    setRequestForPaymentForm((current) => ({
      ...current,
      payee:
        current.payee ||
        (selectedItem.supplier === "Pending selection" ? "" : selectedItem.supplier || ""),
      invoiceNumber: current.invoiceNumber || actionForm.invoiceNumber || selectedItem.invoiceNumber || "",
      paymentReference:
        current.paymentReference ||
        actionForm.paymentReference ||
        selectedItem.paymentReference ||
        "",
      amountRequested: current.amountRequested || String(selectedItem.amount || ""),
      dueDate: current.dueDate || (selectedItem.dateNeeded ? selectedItem.dateNeeded.slice(0, 10) : ""),
      notes: current.notes || actionForm.notes || ""
    }));
    setIsRequestForPaymentPageOpen(true);
  }

  function openPurchaseOrderPage(requestId = selectedId) {
    const targetItem = items.find((item) => item.id === requestId) ?? selectedItem;

    if (!targetItem) {
      pushToast({
        title: "No request selected",
        message: "Select a request first before opening the purchase order page.",
        variant: "error",
        duration: 4200
      });
      return;
    }

    setSelectedId(targetItem.id);
    setPurchaseOrderForm(
      purchaseOrderDrafts[targetItem.id] ?? {
        ...getPurchaseOrderDraft(targetItem, items),
        supplier:
          actionForm.supplier ||
          (targetItem.supplier === "Pending selection" ? "" : targetItem.supplier || ""),
        notes: actionForm.notes || targetItem.notes || ""
      }
    );
    setIsPurchaseOrderDirectoryOpen(false);
    setIsPurchaseOrderPageOpen(true);
  }

  function closeRequestForPaymentPage() {
    setIsRequestForPaymentPageOpen(false);
  }

  function closePurchaseOrderPage() {
    setIsPurchaseOrderPageOpen(false);
  }

  function closePurchaseOrderDirectory() {
    setIsPurchaseOrderDirectoryOpen(false);
  }

  function closeRequestWorkspacePage() {
    setIsRequestWorkspacePageOpen(false);
  }

  function handleSaveRequestForPaymentPage() {
    setActionForm((current) => ({
      ...current,
      invoiceNumber: requestForPaymentForm.invoiceNumber,
      paymentReference: requestForPaymentForm.paymentReference,
      notes: requestForPaymentForm.notes
    }));
    setIsRequestForPaymentPageOpen(false);
    pushToast({
      title: "Request for payment draft saved",
      message: "The payment request details were copied back into the workflow form.",
      variant: "success"
    });
  }

  function handleSavePurchaseOrderPage() {
    void (async () => {
      if (!selectedItem || !session?.token) {
        return;
      }

      setIsSubmitting(true);

      try {
        const response = await fetch(
          `${API_BASE_URL}/workflows/purchase-requests/${selectedItem.id}/po-draft`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.token}`
            },
            body: JSON.stringify(purchaseOrderForm)
          }
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to save purchase order draft.");
        }

        setItems((current) => current.map((item) => (item.id === data.id ? data : item)));
        setPurchaseOrderDrafts((drafts) => ({
          ...drafts,
          [data.id]: data.poDraft ?? purchaseOrderForm
        }));
        setActionForm((current) => ({
          ...current,
          supplier: data.supplier || purchaseOrderForm.supplier,
          poNumber: data.poNumber || purchaseOrderForm.poNumber,
          notes: purchaseOrderForm.notes
        }));
        setIsPurchaseOrderPageOpen(false);
        pushToast({
          title: "Purchase order draft saved",
          message: "The PO details and breakdown were saved.",
          variant: "success"
        });
      } catch (error) {
        pushToast({
          title: "Save purchase order failed",
          message: error.message,
          variant: "error",
          duration: 4200
        });
      } finally {
        setIsSubmitting(false);
      }
    })();
  }

  function handlePrintPurchaseOrderPage() {
    if (!selectedItem) {
      return;
    }

    const printWindow = window.open("", "_blank", "width=1200,height=900");
    if (!printWindow) {
      pushToast({
        title: "Popup blocked",
        message: "Allow popups to print the purchase order.",
        variant: "error",
        duration: 4200
      });
      return;
    }

    const currency = selectedItem.currency || "PHP";
    const subTotal = purchaseOrderForm.lineItems.reduce(
      (sum, lineItem) => sum + parseAmountValue(lineItem.total),
      0
    );
    const salesTax = parseAmountValue(purchaseOrderForm.salesTax);
    const shippingHandling = parseAmountValue(purchaseOrderForm.shippingHandling);
    const other = parseAmountValue(purchaseOrderForm.other);
    const netTotal = subTotal + salesTax + shippingHandling + other;
    const activeCompanyIdentity = getCompanyIdentityForBranch(
      selectedItem.branch,
      companySettings,
      companyIdentities
    );
    const officeDeliveryAddress = getOfficeDeliveryAddress(
      selectedItem.branch,
      activeCompanyIdentity.address || selectedItem.deliveryAddress
    );

    const rowsHtml = purchaseOrderForm.lineItems
      .map(
        (lineItem) => `
          <tr>
            <td>${lineItem.qty || ""}</td>
            <td>${lineItem.unit || ""}</td>
            <td>${lineItem.description || ""}</td>
            <td>${lineItem.unitPrice ? formatCurrencyValue(parseAmountValue(lineItem.unitPrice), currency) : ""}</td>
            <td>${lineItem.total ? formatCurrencyValue(parseAmountValue(lineItem.total), currency) : ""}</td>
          </tr>
        `
      )
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>Purchase Order ${purchaseOrderForm.poNumber || selectedItem.requestNumber}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 30px; color: #12202d; }
            .sheet { border: 1px solid #d7dee7; border-radius: 20px; padding: 28px; }
            .topbar { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
            .brand-kicker { margin: 0 0 4px; color: #8b6d2b; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; }
            h1 { margin: 0 0 8px; font-size: 34px; }
            .sub { margin: 0; color: #4b5d70; }
            .po-number { padding: 14px 16px; min-width: 220px; border: 1px solid #d7dee7; border-radius: 16px; background: #f8fafc; }
            .po-number span, .meta-card span, .totals-card span { display: block; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
            .meta-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }
            .meta-card { padding: 14px 16px; border: 1px solid #d7dee7; border-radius: 16px; background: #fff; }
            .meta-card strong, .po-number strong, .totals-card strong { font-size: 18px; }
            .notes { margin: 20px 0; padding: 16px; border: 1px solid #d7dee7; border-radius: 16px; background: #f8fafc; }
            .notes h2 { margin: 0 0 10px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
            .notes p { margin: 0; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #d7dee7; padding: 10px; text-align: left; font-size: 12px; vertical-align: top; }
            th { background: #eef3f8; color: #1e293b; text-transform: uppercase; letter-spacing: 0.06em; font-size: 11px; }
            .totals { width: 360px; margin-left: auto; margin-top: 18px; display: grid; gap: 10px; }
            .totals-card { padding: 12px 14px; border: 1px solid #d7dee7; border-radius: 14px; background: #fff; }
            .totals-card.net { background: #f6e1a4; border-color: #d5b56c; }
            .footer { margin-top: 24px; font-size: 11px; color: #64748b; }
            @media print { body { padding: 0; } .sheet { border: 0; border-radius: 0; padding: 0; } }
          </style>
        </head>
        <body>
          <section class="sheet">
            <div class="topbar">
              <div>
                <p class="brand-kicker">${activeCompanyIdentity.companyName}</p>
                <h1>Purchase Order</h1>
                <p class="sub">Generated from the Procurement Management System.</p>
              </div>
              <div class="po-number">
                <span>PO Number</span>
                <strong>${purchaseOrderForm.poNumber || "Pending"}</strong>
              </div>
            </div>

            <div class="meta-grid">
              <div class="meta-card"><span>Request No.</span><strong>${selectedItem.requestNumber}</strong></div>
              <div class="meta-card"><span>Requester</span><strong>${selectedItem.requester}</strong></div>
              <div class="meta-card"><span>Supplier</span><strong>${purchaseOrderForm.supplier || selectedItem.supplier || "Pending selection"}</strong></div>
              <div class="meta-card"><span>Date Needed</span><strong>${formatExportDate(selectedItem.dateNeeded)}</strong></div>
              <div class="meta-card"><span>Branch</span><strong>${selectedItem.branch || "Not set"}</strong></div>
              <div class="meta-card"><span>Delivery Address</span><strong>${officeDeliveryAddress}</strong></div>
            </div>

            <div class="notes">
              <h2>PO Notes</h2>
              <p>${purchaseOrderForm.notes || "No purchase order notes provided."}</p>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Description</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>

            <div class="totals">
              <div class="totals-card"><span>Sub Total</span><strong>${formatCurrencyValue(subTotal, currency)}</strong></div>
              <div class="totals-card"><span>Sales Tax</span><strong>${formatCurrencyValue(salesTax, currency)}</strong></div>
              <div class="totals-card"><span>Shipping & Handling</span><strong>${formatCurrencyValue(shippingHandling, currency)}</strong></div>
              <div class="totals-card"><span>Other</span><strong>${formatCurrencyValue(other, currency)}</strong></div>
              <div class="totals-card net"><span>Net Total</span><strong>${formatCurrencyValue(netTotal, currency)}</strong></div>
            </div>

            <p class="footer">Prepared on ${formatExportDate(new Date().toISOString())}. Use the browser print dialog to print or save as PDF.</p>
          </section>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();

    pushToast({
      title: "PO print view opened",
      message: "Use the print dialog to print or save the purchase order as PDF.",
      variant: "success"
    });
  }

  function renderRequestLaunch(showExpand = true) {
    if (!selectedItem) {
      return null;
    }

    return (
      <section className="panel launch-card panel-with-expand">
        {showExpand ? (
          <PanelExpandButton
            onClick={() => openExpandedPanel("request-launch")}
            label="Expand purchase request panel"
          />
        ) : null}
        <div>
          <p className="eyebrow">Purchase Request</p>
          <h2>{selectedItem.requestNumber}</h2>
          <p className="panel-support">
            Open the selected request in a dedicated modal for full details.
          </p>
        </div>
        <button type="button" onClick={openRequestDetailsModal}>
          Open request details
        </button>
      </section>
    );
  }

  function renderAdminRequestLaunch(showExpand = true) {
    return (
      <section className="panel launch-card panel-with-expand">
        {showExpand ? (
          <PanelExpandButton
            onClick={() => openExpandedPanel("admin-request")}
            label="Expand admin request panel"
          />
        ) : null}
        <div>
          <p className="eyebrow">Admin Request</p>
          <h2>Manage selected request</h2>
          <p className="panel-support">
            Update request metadata or remove an entry from the registry using a focused editor.
          </p>
        </div>
        <button type="button" onClick={openEditRequestModal} disabled={!selectedItem}>
          Open request editor
        </button>
      </section>
    );
  }

  async function handleCreateRequest() {
    if (!session?.token) {
      return;
    }

    if (!canCreateRequest) {
      setActionError("Your role cannot create a new purchase request.");
      pushToast({
        title: "Create request unavailable",
        message: "Only requesters and system admins can create new requests.",
        variant: "error",
        duration: 4200
      });
      return;
    }

    if (!requestForm.title.trim()) {
      const message = "Request title is required.";
      setActionError(message);
      pushToast({
        title: "Missing required fields",
        message,
        variant: "error",
        duration: 4200
      });
      return;
    }

    if (isAdmin && !requestForm.requesterEmail) {
      const message = "Requester must be selected from system users.";
      setActionError(message);
      pushToast({
        title: "Missing requester",
        message,
        variant: "error",
        duration: 4200
      });
      return;
    }

    const parsedRequestAmount = parseAmountValue(requestForm.amount);

    if (requestForm.amount && (Number.isNaN(parsedRequestAmount) || parsedRequestAmount <= 0)) {
      const message = "Amount must be a valid number greater than zero if provided.";
      setActionError(message);
      pushToast({
        title: "Invalid amount",
        message,
        variant: "error",
        duration: 4200
      });
      return;
    }

    setActionError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/workflows/purchase-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify({
          ...requestForm,
          requesterEmail: isAdmin ? requestForm.requesterEmail : session.user.email,
          amount: parsedRequestAmount
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to create request.");
      }

      let createdRequest = data;

      if (requestQuotationFile) {
        const formData = new FormData();
        formData.append("type", "quotation");
        formData.append(
          "label",
          "Attach the approved quotation if it has already been approved"
        );
        formData.append("document", requestQuotationFile);

        const uploadResponse = await fetch(
          `${API_BASE_URL}/workflows/purchase-requests/${data.id}/documents`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.token}`
            },
            body: formData
          }
        );

        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok) {
          throw new Error(uploadData.message || "Request created, but quotation upload failed.");
        }

        createdRequest = uploadData;
      }

      setItems((current) => [createdRequest, ...current]);
      setSelectedId(createdRequest.id);
      setRequestForm(
        getInitialRequestForm(
          session.user.department || "",
          session.user.role === "admin" ? "" : session.user.name || "",
          session.user.role === "admin" ? "" : session.user.email || ""
        )
      );
      setRequestQuotationFile(null);
      setIsCreateRequestModalOpen(false);
      pushToast({
        title: "Request created",
        message: `${createdRequest.requestNumber} is now in the workflow.`,
        variant: "success"
      });
    } catch (error) {
      setActionError(error.message);
      pushToast({
        title: "Create request failed",
        message: error.message,
        variant: "error",
        duration: 4200
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAdvance() {
    if (!selectedItem || !session?.token) {
      return;
    }

    setActionError("");
    setIsSubmitting(true);

    try {
      const stageComment =
        actionForm.notes.trim() ||
        `${session.user.name} advanced ${selectedItem.requestNumber} to the next stage.`;

      const response = await fetch(
        `${API_BASE_URL}/workflows/purchase-requests/${selectedItem.id}/advance`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.token}`
          },
          body: JSON.stringify({
            supplier: actionForm.supplier || undefined,
            poNumber: actionForm.poNumber,
            invoiceNumber: actionForm.invoiceNumber,
            paymentReference: actionForm.paymentReference,
            deliveryDate: actionForm.deliveryDate || undefined,
            inspectionStatus: actionForm.inspectionStatus,
            poDraft: purchaseOrderForm,
            comment: stageComment
          })
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to advance request.");
      }

      setItems((current) => current.map((item) => (item.id === data.id ? data : item)));
      setPurchaseOrderDrafts((current) => ({
        ...current,
        [data.id]: data.poDraft ?? purchaseOrderForm
      }));
      setActionForm((current) => ({
        ...current,
        supplier: data.supplier || current.supplier,
        poNumber: data.poNumber || current.poNumber,
        notes: ""
      }));
      pushToast({
        title: "Stage advanced",
        message: `${data.requestNumber} moved to ${data.currentStage}.`,
        variant: "success"
      });
    } catch (error) {
      setActionError(error.message);
      pushToast({
        title: "Advance failed",
        message: error.message,
        variant: "error",
        duration: 4200
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRevert() {
    if (!selectedItem || !session?.token) {
      return;
    }

    setActionError("");
    setIsSubmitting(true);

    try {
      const stageComment =
        actionForm.notes.trim() ||
        `${session.user.name} moved ${selectedItem.requestNumber} back to the previous stage.`;

      const response = await fetch(
        `${API_BASE_URL}/workflows/purchase-requests/${selectedItem.id}/revert`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.token}`
          },
          body: JSON.stringify({
            comment: stageComment
          })
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to move request back.");
      }

      setItems((current) => current.map((item) => (item.id === data.id ? data : item)));
      setActionForm((current) => ({
        ...current,
        notes: ""
      }));
      pushToast({
        title: "Stage moved back",
        message: `${data.requestNumber} returned to ${data.currentStage}.`,
        variant: "success"
      });
    } catch (error) {
      setActionError(error.message);
      pushToast({
        title: "Move back failed",
        message: error.message,
        variant: "error",
        duration: 4200
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUploadDocument() {
    if (!selectedItem || !session?.token || !uploadForm.file) {
      return;
    }

    setUploadError("");
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("type", uploadForm.type);
      formData.append("label", uploadForm.label);
      formData.append("document", uploadForm.file);

      const response = await fetch(
        `${API_BASE_URL}/workflows/purchase-requests/${selectedItem.id}/documents`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.token}`
          },
          body: formData
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to upload document.");
      }

      setItems((current) => current.map((item) => (item.id === data.id ? data : item)));
      setUploadForm({
        type: "po",
        label: "",
        file: null
      });
      pushToast({
        title: "Document uploaded",
        message: `${uploadForm.file.name} has been attached.`,
        variant: "success"
      });
    } catch (error) {
      setUploadError(error.message);
      pushToast({
        title: "Upload failed",
        message: error.message,
        variant: "error",
        duration: 4200
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteDocument(documentId) {
    if (!selectedItem || !session?.token) {
      return;
    }

    openConfirmDialog({
      title: "Delete document",
      message: "This file will be removed from the request packet and can no longer be opened.",
      confirmLabel: "Delete document",
      onConfirm: async () => {
        setUploadError("");
        setIsSubmitting(true);

        try {
          const response = await fetch(
            `${API_BASE_URL}/workflows/purchase-requests/${selectedItem.id}/documents/${documentId}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${session.token}`
              }
            }
          );

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || "Failed to delete document.");
          }

          await loadDashboard(session.token, session.user.role);
          setConfirmDialog(null);
          pushToast({
            title: "Document deleted",
            message: "The attachment was removed from the request.",
            variant: "success"
          });
        } catch (error) {
          setUploadError(error.message);
          pushToast({
            title: "Delete failed",
            message: error.message,
            variant: "error",
            duration: 4200
          });
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  }

  async function handleSaveRequest() {
    if (
      !selectedItem ||
      !session?.token ||
      (session.user.role !== "admin" && session.user.email !== selectedItem.requesterEmail)
    ) {
      return;
    }

    const parsedRequestAmount = parseAmountValue(requestAdminForm.amount);

    if (
      requestAdminForm.amount &&
      (Number.isNaN(parsedRequestAmount) || parsedRequestAmount < 0)
    ) {
      const message = "Amount must be a valid number if provided.";
      setActionError(message);
      pushToast({
        title: "Invalid amount",
        message,
        variant: "error",
        duration: 4200
      });
      return;
    }

    setActionError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/workflows/purchase-requests/${selectedItem.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify({
          ...requestAdminForm,
          amount: parsedRequestAmount
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update request.");
      }

      setItems((current) => current.map((item) => (item.id === data.id ? data : item)));
      setIsEditRequestModalOpen(false);
      pushToast({
        title: "Request updated",
        message: `${data.requestNumber} changes were saved.`,
        variant: "success"
      });
    } catch (error) {
      setActionError(error.message);
      pushToast({
        title: "Update failed",
        message: error.message,
        variant: "error",
        duration: 4200
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteRequest() {
    if (!selectedItem || !session?.token || !isAdmin) {
      return;
    }

    openConfirmDialog({
      title: "Delete purchase request",
      message: `This will permanently remove ${selectedItem.requestNumber} from the registry.`,
      confirmLabel: "Delete request",
      onConfirm: async () => {
        setActionError("");
        setIsSubmitting(true);

        try {
          const response = await fetch(
            `${API_BASE_URL}/workflows/purchase-requests/${selectedItem.id}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${session.token}`
              }
            }
          );

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || "Failed to delete request.");
          }

          setItems((current) => current.filter((item) => item.id !== selectedItem.id));
          setSelectedId("");
          setIsEditRequestModalOpen(false);
          setConfirmDialog(null);
          pushToast({
            title: "Request deleted",
            message: `${selectedItem.requestNumber} was removed from the registry.`,
            variant: "success"
          });
        } catch (error) {
          setActionError(error.message);
          pushToast({
            title: "Delete failed",
            message: error.message,
            variant: "error",
            duration: 4200
          });
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  }

  async function handleCreateUser() {
    if (!session?.token || !isAdmin) {
      return;
    }

    setUserError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify(userForm)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to create user.");
      }

      setUsers((current) => [data, ...current]);
      setSelectedUserId(data.id);
      setIsUserModalOpen(false);
      pushToast({
        title: "User created",
        message: `${data.name} now has access to the system.`,
        variant: "success"
      });
    } catch (error) {
      setUserError(error.message);
      pushToast({
        title: "Create user failed",
        message: error.message,
        variant: "error",
        duration: 4200
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateUser() {
    if (!session?.token || !isAdmin || !selectedUserId) {
      return;
    }

    setUserError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/users/${selectedUserId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify(userForm)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update user.");
      }

      setUsers((current) => current.map((user) => (user.id === data.id ? data : user)));

      if (session.user.id === data.id) {
        setSession((current) => ({
          ...current,
          user: {
            ...current.user,
            name: data.name,
            email: data.email,
            role: data.role,
            roleLabel: data.roleLabel,
            department: data.department
          }
        }));
      }

      setIsUserModalOpen(false);
      pushToast({
        title: "User updated",
        message: `${data.name}'s account details were saved.`,
        variant: "success"
      });
    } catch (error) {
      setUserError(error.message);
      pushToast({
        title: "Update user failed",
        message: error.message,
        variant: "error",
        duration: 4200
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteUser(userId = selectedUserId) {
    const targetUser = users.find((user) => user.id === userId);

    if (!session?.token || !isAdmin || !targetUser) {
      return;
    }

    openConfirmDialog({
      title: "Delete user account",
      message: `Are you sure you want to delete ${targetUser.name}? This account will lose access to the procurement workflow immediately.`,
      confirmLabel: "Yes, delete user",
      onConfirm: async () => {
        setUserError("");
        setIsSubmitting(true);

        try {
          const response = await fetch(`${API_BASE_URL}/users/${targetUser.id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${session.token}`
            }
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || "Failed to delete user.");
          }

          setUsers((current) => current.filter((user) => user.id !== targetUser.id));
          setSelectedUserId((current) => (current === targetUser.id ? "" : current));
          setUserForm(getInitialUserForm());
          setIsUserModalOpen(false);
          setConfirmDialog(null);
          pushToast({
            title: "User deleted",
            message: "The account has been removed.",
            variant: "success"
          });
        } catch (error) {
          setUserError(error.message);
          pushToast({
            title: "Delete user failed",
            message: error.message,
            variant: "error",
            duration: 4200
          });
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  }

  async function handleCreateSupplier() {
    if (!session?.token || !isAdmin) {
      return;
    }

    if (!supplierForm.name.trim()) {
      const message = "Supplier name is required.";
      setSupplierError(message);
      pushToast({
        title: "Missing supplier name",
        message,
        variant: "error",
        duration: 4200
      });
      return;
    }

    setSupplierError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/suppliers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify(supplierForm)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to create supplier.");
      }

      setSuppliers((current) =>
        [...current, data].sort((left, right) => left.name.localeCompare(right.name))
      );
      setActionForm((current) => ({
        ...current,
        supplier: data.name
      }));
      setIsSupplierModalOpen(false);
      setSupplierForm(getInitialSupplierForm());
      pushToast({
        title: "Supplier created",
        message: `${data.name} is now available in supplier suggestions.`,
        variant: "success"
      });
    } catch (error) {
      setSupplierError(error.message);
      pushToast({
        title: "Create supplier failed",
        message: error.message,
        variant: "error",
        duration: 4200
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateSupplier() {
    if (!session?.token || !isAdmin || !selectedSupplier) {
      return;
    }

    if (!supplierForm.name.trim()) {
      const message = "Supplier name is required.";
      setSupplierError(message);
      pushToast({
        title: "Missing supplier name",
        message,
        variant: "error",
        duration: 4200
      });
      return;
    }

    setSupplierError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/suppliers/${selectedSupplier.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`
        },
        body: JSON.stringify(supplierForm)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to update supplier.");
      }

      setSuppliers((current) =>
        current
          .map((supplier) => (supplier.id === data.id ? data : supplier))
          .sort((left, right) => left.name.localeCompare(right.name))
      );
      setSelectedSupplierId(data.id);
      setIsSupplierModalOpen(false);
      setSupplierForm(getInitialSupplierForm());
      pushToast({
        title: "Supplier updated",
        message: `${data.name} changes were saved.`,
        variant: "success"
      });
    } catch (error) {
      setSupplierError(error.message);
      pushToast({
        title: "Update supplier failed",
        message: error.message,
        variant: "error",
        duration: 4200
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteSupplier(supplierId = selectedSupplierId) {
    const targetSupplier = suppliers.find((supplier) => supplier.id === supplierId);

    if (!session?.token || !isAdmin || !targetSupplier) {
      return;
    }

    openConfirmDialog({
      title: "Delete supplier",
      message: `Are you sure you want to delete ${targetSupplier.name}? This action cannot be undone and the supplier will be removed from the directory.`,
      confirmLabel: "Yes, delete supplier",
      onConfirm: async () => {
        setSupplierError("");
        setIsSubmitting(true);

        try {
          const response = await fetch(`${API_BASE_URL}/suppliers/${targetSupplier.id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${session.token}`
            }
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || "Failed to delete supplier.");
          }

          setSuppliers((current) =>
            current.filter((supplier) => supplier.id !== targetSupplier.id)
          );
          setSelectedSupplierId((current) => (current === targetSupplier.id ? "" : current));
          setConfirmDialog(null);
          pushToast({
            title: "Supplier deleted",
            message: `${targetSupplier.name} was removed from the directory.`,
            variant: "success"
          });
        } catch (error) {
          setSupplierError(error.message);
          pushToast({
            title: "Delete supplier failed",
            message: error.message,
            variant: "error",
            duration: 4200
          });
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  }

  function handleSelect(id) {
    setSelectedId(id);
  }

  function handleSelectSupplier(id) {
    setSelectedSupplierId(id);
  }

  async function handleOpenRequestDetails(id) {
    const targetItem = items.find((item) => item.id === id);

    if (!targetItem) {
      return;
    }

    setSelectedId(id);

    if (session?.user?.role === "requester") {
      setIsRequestWorkspacePageOpen(true);
      return;
    }

    if (targetItem.currentStage === "Purchase Request" && session?.token) {
      setActionError("");
      setIsSubmitting(true);

      try {
        const response = await fetch(
          `${API_BASE_URL}/workflows/purchase-requests/${targetItem.id}/advance`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.token}`
            },
            body: JSON.stringify({
              comment: `${session.user.name} opened ${targetItem.requestNumber} and moved it to Review.`
            })
          }
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to move request to Review.");
        }

        setItems((current) => current.map((item) => (item.id === data.id ? data : item)));
        setSelectedId(data.id);
        pushToast({
          title: "Moved to Review",
          message: `${data.requestNumber} is now in Review.`,
          variant: "success"
        });
      } catch (error) {
        setActionError(error.message);
        pushToast({
          title: "Open request failed",
          message: error.message,
          variant: "error",
          duration: 4200
        });
        setIsSubmitting(false);
        return;
      } finally {
        setIsSubmitting(false);
      }
    }

    setIsRequestWorkspacePageOpen(true);
  }

  function handleSelectUser(id) {
    setSelectedUserId(id);
  }

  function handleLogout() {
    clearSession();
  }

  function closeHeaderMenuPages() {
    setIsSupplierDirectoryOpen(false);
    setIsUserDirectoryOpen(false);
    setIsPurchaseOrderDirectoryOpen(false);
    setIsPurchaseOrderPageOpen(false);
    setIsSettingsPageOpen(false);
  }

  function handleOpenUsersDirectory() {
    if (session?.user?.role !== "admin") {
      return;
    }

    closeHeaderMenuPages();
    setIsUserDirectoryOpen(true);
  }

  function handleOpenSuppliersMenu() {
    closeHeaderMenuPages();
    setIsSupplierDirectoryOpen(true);
  }

  function handleOpenPurchaseOrderMenu() {
    closeHeaderMenuPages();
    setIsPurchaseOrderDirectoryOpen(true);
  }

  function handleOpenSettingsPage() {
    closeHeaderMenuPages();
    setSettingsForm(companySettings);
    setIdentityForm(getInitialIdentityForm(companySettings));
    setEditingIdentityId("");
    setIsMainSettingsEditing(false);
    setIsSettingsPageOpen(true);
  }

  function closeSupplierDirectory() {
    setIsSupplierDirectoryOpen(false);
  }

  function closeUserDirectory() {
    setIsUserDirectoryOpen(false);
  }

  function closeSettingsPage() {
    setIsMainSettingsEditing(false);
    setIsIdentityModalOpen(false);
    setIsSettingsPageOpen(false);
  }

  function handleStartMainSettingsEdit() {
    setIsMainSettingsEditing(true);
  }

  function handleCancelMainSettingsEdit() {
    setSettingsForm(companySettings);
    setIsMainSettingsEditing(false);
  }

  function handleSaveSettings() {
    void (async () => {
      if (!session?.token || !isAdmin) {
        return;
      }

      setIsSubmitting(true);

      try {
        const response = await fetch(`${API_BASE_URL}/settings`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.token}`
          },
          body: JSON.stringify({
            companyName: settingsForm.companyName.trim() || DEFAULT_COMPANY_SETTINGS.companyName,
            address: settingsForm.address.trim() || DEFAULT_COMPANY_SETTINGS.address,
            logoUrl: settingsForm.logoUrl || DEFAULT_COMPANY_SETTINGS.logoUrl
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to save settings.");
        }

        const nextSettings = {
          companyName: data.companyName || DEFAULT_COMPANY_SETTINGS.companyName,
          address: data.address || DEFAULT_COMPANY_SETTINGS.address,
          logoUrl: data.logoUrl || DEFAULT_COMPANY_SETTINGS.logoUrl
        };

        setCompanySettings(nextSettings);
        setSettingsForm(nextSettings);
        setCompanyIdentities(Array.isArray(data.identities) ? data.identities : []);
        setIdentityForm(getInitialIdentityForm(nextSettings));
        setEditingIdentityId("");
        setIsMainSettingsEditing(false);
        pushToast({
          title: "Settings saved",
          message: "Company branding was updated.",
          variant: "success"
        });
      } catch (error) {
        pushToast({
          title: "Save settings failed",
          message: error.message,
          variant: "error",
          duration: 4200
        });
      } finally {
        setIsSubmitting(false);
      }
    })();
  }

  function handleEditIdentity(identityId) {
    const targetIdentity = companyIdentities.find((identity) => identity.id === identityId);

    if (!targetIdentity) {
      return;
    }

    setEditingIdentityId(targetIdentity.id);
    setIdentitySaveMessage("");
    setIdentityForm({
      branchName: targetIdentity.branchName || "",
      address: targetIdentity.address || DEFAULT_COMPANY_SETTINGS.address,
      logoUrl: targetIdentity.logoUrl || DEFAULT_COMPANY_SETTINGS.logoUrl
    });
    setIsIdentityModalOpen(true);
  }

  function handleResetIdentity() {
    setEditingIdentityId("");
    setIdentitySaveMessage("");
    setIdentityForm(getInitialIdentityForm(companySettings));
    setIsIdentityModalOpen(false);
  }

  function handleOpenCreateIdentityModal() {
    setEditingIdentityId("");
    setIdentitySaveMessage("");
    setIdentityForm(getInitialIdentityForm(companySettings));
    setIsIdentityModalOpen(true);
  }

  function handleSaveIdentity() {
    void (async () => {
      if (!session?.token || !isAdmin) {
        return;
      }

      setIsSubmitting(true);

      try {
        const endpoint = editingIdentityId
          ? `${API_BASE_URL}/settings/identities/${editingIdentityId}`
          : `${API_BASE_URL}/settings/identities`;
        const method = editingIdentityId ? "PATCH" : "POST";
        const response = await fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.token}`
          },
          body: JSON.stringify({
            branchName: identityForm.branchName.trim(),
            address: identityForm.address.trim() || companySettings.address,
            logoUrl: identityForm.logoUrl || companySettings.logoUrl
          })
        });

        const raw = await response.text();
        let data = {};

        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          data = {};
        }

        if (!response.ok) {
          if (response.status === 413) {
            throw new Error("Logo upload is too large. Please use a smaller image.");
          }

          throw new Error(data.message || "Failed to save company identity.");
        }

        const nextSettings = await syncCompanySettings();
        setEditingIdentityId("");
        setIdentityForm(getInitialIdentityForm(nextSettings));
        setIdentitySaveMessage("Saved to database");
        setIsIdentityModalOpen(false);
        pushToast({
          title: editingIdentityId ? "Identity updated" : "Identity created",
          message: "The subsidiary or branch identity was saved.",
          variant: "success"
        });
      } catch (error) {
        pushToast({
          title: "Save identity failed",
          message: error.message,
          variant: "error",
          duration: 4200
        });
      } finally {
        setIsSubmitting(false);
      }
    })();
  }

  function handleDeleteIdentity(identityId) {
    const targetIdentity = companyIdentities.find((identity) => identity.id === identityId);

    if (!targetIdentity || !session?.token || !isAdmin) {
      return;
    }

    openConfirmDialog({
      title: "Delete company identity?",
      message: `Are you sure you want to delete ${targetIdentity.branchName}? This action cannot be undone.`,
      confirmLabel: "Yes, delete identity",
      onConfirm: async () => {
        setIsSubmitting(true);

        try {
          const response = await fetch(`${API_BASE_URL}/settings/identities/${identityId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${session.token}`
            }
          });

          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || "Failed to delete company identity.");
          }

          setCompanyIdentities((current) => current.filter((identity) => identity.id !== identityId));
          if (editingIdentityId === identityId) {
            setEditingIdentityId("");
            setIdentityForm(getInitialIdentityForm(companySettings));
          }
          setConfirmDialog(null);
          pushToast({
            title: "Identity deleted",
            message: "The branch or subsidiary identity was removed.",
            variant: "success"
          });
        } catch (error) {
          setConfirmDialog(null);
          pushToast({
            title: "Delete identity failed",
            message: error.message,
            variant: "error",
            duration: 4200
          });
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  }

  if (!session?.token) {
    return (
      <main className="app-shell">
        <CompanyHeader
          isAuthenticated={false}
          theme={theme}
          onThemeChange={setTheme}
          companySettings={companySettings}
        />
        <section className="hero">
          <p className="eyebrow">Januarius Procurement Hub</p>
          <h1>From purchase request to filing, in one workflow.</h1>
          <p className="hero-copy">
            React frontend for Vercel, Express API for Render, and MongoDB persistence for each
            approval step.
          </p>
        </section>
        <LoginForm
          credentials={credentials}
          onChange={handleCredentialChange}
          onSubmit={handleLogin}
          isSubmitting={isSubmitting}
          error={authError}
        />
      </main>
    );
  }

  if (isRequestForPaymentPageOpen && selectedItem) {
    return (
      <main className="app-shell">
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <CompanyHeader
          isAuthenticated
          user={session.user}
          onLogout={handleLogout}
          theme={theme}
          onThemeChange={setTheme}
          onOpenSuppliers={handleOpenSuppliersMenu}
          onOpenUsers={handleOpenUsersDirectory}
          onOpenPurchaseOrder={handleOpenPurchaseOrderMenu}
          onOpenSettings={handleOpenSettingsPage}
          companySettings={companySettings}
        />
        <RequestForPaymentPage
          item={selectedItem}
          form={requestForPaymentForm}
          onChange={handleRequestForPaymentFormChange}
          onSave={handleSaveRequestForPaymentPage}
          onClose={closeRequestForPaymentPage}
          isSubmitting={isSubmitting}
        />
      </main>
    );
  }

  if (isPurchaseOrderPageOpen && selectedItem) {
    return (
      <main className="app-shell">
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <CompanyHeader
          isAuthenticated
          user={session.user}
          onLogout={handleLogout}
          theme={theme}
          onThemeChange={setTheme}
          onOpenSuppliers={handleOpenSuppliersMenu}
          onOpenUsers={handleOpenUsersDirectory}
          onOpenPurchaseOrder={handleOpenPurchaseOrderMenu}
          onOpenSettings={handleOpenSettingsPage}
          companySettings={companySettings}
        />
        <PurchaseOrderPage
          item={selectedItem}
          form={purchaseOrderForm}
          onChange={handlePurchaseOrderFormChange}
          onLineItemChange={handlePurchaseOrderLineItemChange}
          onAddLineItem={handleAddPurchaseOrderLineItem}
          onRemoveLineItem={handleRemovePurchaseOrderLineItem}
          onPrint={handlePrintPurchaseOrderPage}
          onSave={handleSavePurchaseOrderPage}
          onClose={closePurchaseOrderPage}
          isSubmitting={isSubmitting}
        />
      </main>
    );
  }

  if (isPurchaseOrderDirectoryOpen) {
    return (
      <main className="app-shell">
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <CompanyHeader
          isAuthenticated
          user={session.user}
          onLogout={handleLogout}
          theme={theme}
          onThemeChange={setTheme}
          onOpenSuppliers={handleOpenSuppliersMenu}
          onOpenUsers={handleOpenUsersDirectory}
          onOpenPurchaseOrder={handleOpenPurchaseOrderMenu}
          onOpenSettings={handleOpenSettingsPage}
          companySettings={companySettings}
        />
        <PurchaseOrderDirectoryPage
          items={purchaseOrderRecords}
          onOpen={openPurchaseOrderPage}
          onClose={closePurchaseOrderDirectory}
        />
      </main>
    );
  }

  if (isSupplierDirectoryOpen) {
    return (
      <main className="app-shell">
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <CompanyHeader
          isAuthenticated
          user={session.user}
          onLogout={handleLogout}
          theme={theme}
          onThemeChange={setTheme}
          onOpenSuppliers={handleOpenSuppliersMenu}
          onOpenUsers={handleOpenUsersDirectory}
          onOpenPurchaseOrder={handleOpenPurchaseOrderMenu}
          onOpenSettings={handleOpenSettingsPage}
          companySettings={companySettings}
        />
        <SupplierManagementPage
          suppliers={suppliers}
          selectedSupplierId={selectedSupplierId}
          onSelect={handleSelectSupplier}
          onCreateNew={openCreateSupplierModal}
          onEditSelected={openEditSupplierModal}
          onDeleteSelected={handleDeleteSupplier}
          onClose={closeSupplierDirectory}
          canManage={isAdmin}
        />
        {confirmDialog ? (
          <ConfirmDialog
            title={confirmDialog.title}
            message={confirmDialog.message}
            confirmLabel={confirmDialog.confirmLabel}
            onConfirm={confirmDialog.onConfirm}
            onClose={() => setConfirmDialog(null)}
            isSubmitting={isSubmitting}
          />
        ) : null}
        {isSupplierModalOpen ? (
          <Modal
            eyebrow={supplierModalMode === "edit" ? "Edit Supplier" : "New Supplier"}
            title={supplierModalMode === "edit" ? "Update supplier" : "Create supplier"}
            onClose={() => setIsSupplierModalOpen(false)}
          >
            <SupplierForm
              form={supplierForm}
              onChange={handleSupplierFormChange}
              onSubmit={supplierModalMode === "edit" ? handleUpdateSupplier : handleCreateSupplier}
              isSubmitting={isSubmitting}
              error={supplierError}
              submitLabel={supplierModalMode === "edit" ? "Save changes" : "Create supplier"}
            />
          </Modal>
        ) : null}
      </main>
    );
  }

  if (isUserDirectoryOpen) {
    return (
      <main className="app-shell">
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <CompanyHeader
          isAuthenticated
          user={session.user}
          onLogout={handleLogout}
          theme={theme}
          onThemeChange={setTheme}
          onOpenSuppliers={handleOpenSuppliersMenu}
          onOpenUsers={handleOpenUsersDirectory}
          onOpenPurchaseOrder={handleOpenPurchaseOrderMenu}
          onOpenSettings={handleOpenSettingsPage}
          companySettings={companySettings}
        />
        <section className="po-page">
          <div className="po-page-header">
            <div>
              <p className="eyebrow">Admin Users</p>
              <h1>Users</h1>
              <p className="hero-copy">
                View all user accounts and manage access from one page.
              </p>
            </div>
            <div className="po-page-actions">
              <button className="ghost-button" type="button" onClick={closeUserDirectory}>
                Back to dashboard
              </button>
            </div>
          </div>

          <UserManagementPanel
            users={users}
            selectedUserId={selectedUserId}
            onSelect={handleSelectUser}
            onCreateNew={openCreateUserModal}
            onEditSelected={openEditUserModal}
            onDeleteSelected={handleDeleteUser}
            showExpand={false}
          />
        </section>
        {isUserModalOpen ? (
          <Modal
            eyebrow="Admin Users"
            title={selectedUserId ? "Edit user account" : "Create user account"}
            onClose={() => setIsUserModalOpen(false)}
          >
            <UserEditorPanel
              selectedUserId={selectedUserId}
              form={userForm}
              onChange={handleUserFormChange}
              onCreate={handleCreateUser}
              onUpdate={handleUpdateUser}
              onDelete={handleDeleteUser}
              isSubmitting={isSubmitting}
              error={userError}
            />
          </Modal>
        ) : null}
        {confirmDialog ? (
          <ConfirmDialog
            title={confirmDialog.title}
            message={confirmDialog.message}
            confirmLabel={confirmDialog.confirmLabel}
            onConfirm={confirmDialog.onConfirm}
            onClose={() => setConfirmDialog(null)}
            isSubmitting={isSubmitting}
          />
        ) : null}
      </main>
    );
  }

  if (isSettingsPageOpen) {
    return (
      <main className="app-shell">
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <CompanyHeader
          isAuthenticated
          user={session.user}
          onLogout={handleLogout}
          theme={theme}
          onThemeChange={setTheme}
          onOpenSuppliers={handleOpenSuppliersMenu}
          onOpenUsers={handleOpenUsersDirectory}
          onOpenPurchaseOrder={handleOpenPurchaseOrderMenu}
          onOpenSettings={handleOpenSettingsPage}
          companySettings={companySettings}
        />
        <SettingsPage
          identities={companyIdentities}
          canManageIdentities={isAdmin}
          isMainSettingsEditing={isMainSettingsEditing}
          form={settingsForm}
          onChange={handleSettingsFormChange}
          onLogoFileChange={handleSettingsLogoChange}
          onStartMainSettingsEdit={handleStartMainSettingsEdit}
          onCancelMainSettingsEdit={handleCancelMainSettingsEdit}
          onSave={handleSaveSettings}
          onCreateIdentity={handleOpenCreateIdentityModal}
          onEditIdentity={handleEditIdentity}
          onDeleteIdentity={handleDeleteIdentity}
          onClose={closeSettingsPage}
        />
        {isIdentityModalOpen ? (
          <Modal
            eyebrow="Subsidiaries"
            title={editingIdentityId ? "Edit identity" : "New identity"}
            onClose={handleResetIdentity}
          >
            <div className="modal-form">
              <label>
                Branch or subsidiary
                <input
                  name="branchName"
                  value={identityForm.branchName}
                  onChange={handleIdentityFormChange}
                  placeholder="Example: Stats or Januarius Holdings Cebu"
                />
              </label>

              <label>
                Address
                <textarea
                  name="address"
                  value={identityForm.address}
                  onChange={handleIdentityFormChange}
                  rows="4"
                  placeholder="Enter the complete branch or subsidiary address"
                />
              </label>

              <label className="settings-file-field">
                Replace logo
                <input
                  type="file"
                  accept=".ico,.png,.jpg,.jpeg,.svg,.webp"
                  onChange={handleIdentityLogoChange}
                />
              </label>

              <button type="button" onClick={handleSaveIdentity}>
                {editingIdentityId ? "Save identity" : "Add identity"}
              </button>
              {identitySaveMessage ? <p className="settings-inline-status">{identitySaveMessage}</p> : null}
            </div>
          </Modal>
        ) : null}
        {confirmDialog ? (
          <ConfirmDialog
            title={confirmDialog.title}
            message={confirmDialog.message}
            confirmLabel={confirmDialog.confirmLabel}
            onConfirm={confirmDialog.onConfirm}
            onClose={() => setConfirmDialog(null)}
            isSubmitting={isSubmitting}
          />
        ) : null}
      </main>
    );
  }

  if (isRequestWorkspacePageOpen && selectedItem) {
    return (
      <main className="app-shell">
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
        <CompanyHeader
          isAuthenticated
          user={session.user}
          onLogout={handleLogout}
          theme={theme}
          onThemeChange={setTheme}
          onOpenSuppliers={handleOpenSuppliersMenu}
          onOpenUsers={handleOpenUsersDirectory}
          onOpenPurchaseOrder={handleOpenPurchaseOrderMenu}
          onOpenSettings={handleOpenSettingsPage}
          companySettings={companySettings}
        />
        <RequestWorkspacePage
          item={selectedItem}
          stages={stages}
          user={session.user}
          actionForm={actionForm}
          purchaseOrderForm={purchaseOrderForm}
          uploadForm={uploadForm}
          suppliers={suppliers}
          onActionChange={handleActionFormChange}
          onPurchaseOrderChange={handlePurchaseOrderFormChange}
          onPurchaseOrderLineItemChange={handlePurchaseOrderLineItemChange}
          onAddPurchaseOrderLineItem={handleAddPurchaseOrderLineItem}
          onRemovePurchaseOrderLineItem={handleRemovePurchaseOrderLineItem}
          onPrintPurchaseOrder={handlePrintPurchaseOrderPage}
          onUploadFormChange={handleUploadFormChange}
          onUploadFileChange={handleUploadFileChange}
          onReviewAttachmentFileChange={handleReviewApprovalFileChange}
          onUpload={handleUploadDocument}
          onCreateSupplier={openCreateSupplierModal}
          onAdvance={handleAdvance}
          onBack={handleRevert}
          isSubmitting={isSubmitting}
          actionError={actionError}
          onDeleteDocument={handleDeleteDocument}
          canManageDocuments={canManageDocuments}
          uploadError={uploadError}
          apiOrigin={API_ORIGIN}
          onClose={closeRequestWorkspacePage}
            onEditRequest={openEditRequestModal}
            canEditRequest={canEditSelectedRequest}
        />
        {isSupplierModalOpen ? (
          <Modal eyebrow="New Supplier" title="Create supplier" onClose={() => setIsSupplierModalOpen(false)}>
            <SupplierForm
              form={supplierForm}
              onChange={handleSupplierFormChange}
              onSubmit={handleCreateSupplier}
              isSubmitting={isSubmitting}
              error={supplierError}
            />
          </Modal>
        ) : null}
      </main>
    );
  }

  return (
    <main className="app-shell">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <CompanyHeader
        isAuthenticated
        user={session.user}
        onLogout={handleLogout}
        theme={theme}
        onThemeChange={setTheme}
        onOpenSuppliers={handleOpenSuppliersMenu}
        onOpenUsers={handleOpenUsersDirectory}
        onOpenPurchaseOrder={handleOpenPurchaseOrderMenu}
        onOpenSettings={handleOpenSettingsPage}
        companySettings={companySettings}
      />
      <section className="hero">
        <div className="hero-grid">
          <div>
            <p className="eyebrow">Januarius Procurement Hub</p>
            <h1>
              Purchase Request
              <br />
              to Payment Tracking
            </h1>
            <p className="hero-copy">
              Role-based processing for review, approval, supplier selection, PO, delivery, invoice,
              matching, payment, and filing.
            </p>
          </div>
          <div className="toolbar-actions left hero-actions hero-actions-side">
            <div className="hero-action-stack">
              {canCreateRequest ? (
                <button type="button" onClick={openCreateRequestModal}>
                  New purchase request
                </button>
              ) : null}
              <button
                className="hero-inline-link"
                type="button"
                onClick={openRequestForPaymentPage}
                disabled={!selectedItem}
              >
                Request for Payment
              </button>
            </div>
          </div>
        </div>
      </section>

      {session.user.role !== "requester" ? (
        <section className="stats-grid">
          {dashboardStats.map((stat) => (
            <article className="panel stat-card" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </article>
          ))}
        </section>
      ) : null}

      {actionError ? <p className="error-text">{actionError}</p> : null}
      {isLoading ? <p className="error-text">Loading workflow data...</p> : null}

      {session.user.role === "requester" ? (
        <div className="layout-grid requester-workspace">
          <RequestList
            items={filteredItems}
            selectedId={selectedId}
            onSelect={handleSelect}
            onOpenDetails={handleOpenRequestDetails}
            onEdit={openEditRequestModalForItem}
            canEditItem={(item) =>
              Boolean(
                session?.user &&
                  (session.user.role === "admin" || session.user.email === item.requesterEmail)
              )
            }
            onExportCsv={handleExportCsv}
            onExportPdf={handleExportPdf}
            onExpand={() => openExpandedPanel("request-list")}
          />
          {selectedItem ? (
            <WorkflowTimeline
              stages={stages}
              currentStage={selectedItem.currentStage}
              history={selectedItem.history}
              onOpenRequestForPaymentPage={openRequestForPaymentPage}
              onExpand={() => openExpandedPanel("workflow")}
            />
          ) : null}
        </div>
      ) : (
        <div className="layout-grid">
          <RequestList
            items={filteredItems}
            selectedId={selectedId}
            onSelect={handleSelect}
            onOpenDetails={handleOpenRequestDetails}
            onEdit={openEditRequestModalForItem}
            canEditItem={(item) =>
              Boolean(
                session?.user &&
                  (session.user.role === "admin" || session.user.email === item.requesterEmail)
              )
            }
            onExportCsv={handleExportCsv}
            onExportPdf={handleExportPdf}
            onExpand={() => openExpandedPanel("request-list")}
          />
          {selectedItem ? (
            <RequestSummary
              item={selectedItem}
              onExpand={() => openExpandedPanel("request-summary")}
            />
          ) : null}
        </div>
      )}

      {session.user.role !== "requester" && selectedItem ? (
        <div className="layout-grid modal-launch-grid">
          <WorkflowTimeline
            stages={stages}
            currentStage={selectedItem.currentStage}
            history={selectedItem.history}
            onOpenRequestForPaymentPage={openRequestForPaymentPage}
            onExpand={() => openExpandedPanel("workflow")}
          />
        </div>
      ) : null}

      {selectedItem ? (
        <DocumentPanel
          item={selectedItem}
          uploadForm={uploadForm}
          onUploadFormChange={handleUploadFormChange}
          onFileChange={handleUploadFileChange}
          onUpload={handleUploadDocument}
          onDelete={handleDeleteDocument}
          canManage={canManageDocuments}
          isSubmitting={isSubmitting}
          error={uploadError}
          apiOrigin={API_ORIGIN}
          onExpand={() => openExpandedPanel("documents")}
        />
      ) : null}

      {isAdmin ? (
        <div className="admin-stack">
          {renderAdminRequestLaunch()}
          <UserManagementPanel
            users={users}
            selectedUserId={selectedUserId}
            onSelect={handleSelectUser}
            onCreateNew={openCreateUserModal}
            onEditSelected={openEditUserModal}
            onExpand={() => openExpandedPanel("user-directory")}
          />
        </div>
      ) : null}

      {isCreateRequestModalOpen ? (
        <Modal
          eyebrow="New Request"
          title="Create purchase request"
          onClose={() => setIsCreateRequestModalOpen(false)}
        >
          <CreateRequestForm
            form={requestForm}
            branchOptions={branchOptions}
            isAdmin={isAdmin}
            requesterOptions={requesterOptions}
            onChange={handleRequestFormChange}
            onQuotationFileChange={handleRequestQuotationFileChange}
            quotationFileName={requestQuotationFile?.name ?? ""}
            onSubmit={handleCreateRequest}
            isSubmitting={isSubmitting}
            canCreate={canCreateRequest}
            error={actionError}
          />
        </Modal>
      ) : null}

      {isSupplierModalOpen ? (
        <Modal eyebrow="New Supplier" title="Create supplier" onClose={() => setIsSupplierModalOpen(false)}>
          <SupplierForm
            form={supplierForm}
            onChange={handleSupplierFormChange}
            onSubmit={handleCreateSupplier}
            isSubmitting={isSubmitting}
            error={supplierError}
          />
        </Modal>
      ) : null}

      {expandedPanel ? (
        <Modal eyebrow="Expanded Panel" title="Expanded view" onClose={closeExpandedPanel}>
          {expandedPanel === "request-list" ? (
            <RequestList
              items={filteredItems}
              selectedId={selectedId}
              onSelect={handleSelect}
              onOpenDetails={handleOpenRequestDetails}
              onExportCsv={handleExportCsv}
              onExportPdf={handleExportPdf}
              showExpand={false}
            />
          ) : null}
          {expandedPanel === "stage-actions" && selectedItem ? (
            <ActionPanel
              item={selectedItem}
              stages={stages}
              user={session.user}
              form={actionForm}
              purchaseOrderForm={purchaseOrderForm}
              uploadForm={uploadForm}
              suppliers={suppliers}
              onChange={handleActionFormChange}
              onPurchaseOrderChange={handlePurchaseOrderFormChange}
              onPurchaseOrderLineItemChange={handlePurchaseOrderLineItemChange}
              onAddPurchaseOrderLineItem={handleAddPurchaseOrderLineItem}
              onRemovePurchaseOrderLineItem={handleRemovePurchaseOrderLineItem}
              onPrintPurchaseOrder={handlePrintPurchaseOrderPage}
              onReviewAttachmentFileChange={handleReviewApprovalFileChange}
              onUpload={handleUploadDocument}
              onCreateSupplier={openCreateSupplierModal}
              onAdvance={handleAdvance}
              onBack={handleRevert}
              isSubmitting={isSubmitting}
              error={actionError}
              showExpand={false}
            />
          ) : null}
          {expandedPanel === "request-summary" && selectedItem ? (
            <RequestSummary item={selectedItem} showExpand={false} />
          ) : null}
          {expandedPanel === "workflow" && selectedItem ? (
            <WorkflowTimeline
              stages={stages}
              currentStage={selectedItem.currentStage}
              history={selectedItem.history}
              onOpenRequestForPaymentPage={openRequestForPaymentPage}
              showExpand={false}
            />
          ) : null}
          {expandedPanel === "documents" && selectedItem ? (
            <DocumentPanel
              item={selectedItem}
              uploadForm={uploadForm}
              onUploadFormChange={handleUploadFormChange}
              onFileChange={handleUploadFileChange}
              onUpload={handleUploadDocument}
              onDelete={handleDeleteDocument}
              canManage={canManageDocuments}
              isSubmitting={isSubmitting}
              error={uploadError}
              apiOrigin={API_ORIGIN}
              showExpand={false}
            />
          ) : null}
          {expandedPanel === "admin-request" ? renderAdminRequestLaunch(false) : null}
          {expandedPanel === "user-directory" ? (
            <UserManagementPanel
              users={users}
              selectedUserId={selectedUserId}
              onSelect={handleSelectUser}
              onCreateNew={openCreateUserModal}
              onEditSelected={openEditUserModal}
              onDeleteSelected={handleDeleteUser}
              showExpand={false}
            />
          ) : null}
        </Modal>
      ) : null}

      {isEditRequestModalOpen && selectedItem ? (
        <Modal
          eyebrow={isAdmin ? "Admin Request" : "Edit Request"}
          title={`Edit ${selectedItem.requestNumber}`}
          onClose={() => setIsEditRequestModalOpen(false)}
        >
          <RequestAdminPanel
            item={selectedItem}
            stages={stages}
            branchOptions={branchOptions}
            form={requestAdminForm}
            onChange={handleRequestAdminFormChange}
            onSave={handleSaveRequest}
            onDelete={handleDeleteRequest}
            canDelete={isAdmin}
            isAdmin={isAdmin}
            isSubmitting={isSubmitting}
            error={actionError}
          />
        </Modal>
      ) : null}

      {isUserModalOpen ? (
        <Modal
          eyebrow="Admin Users"
          title={selectedUserId ? "Edit user account" : "Create user account"}
          onClose={() => setIsUserModalOpen(false)}
        >
          <UserEditorPanel
            selectedUserId={selectedUserId}
            form={userForm}
            onChange={handleUserFormChange}
            onCreate={handleCreateUser}
            onUpdate={handleUpdateUser}
            onDelete={handleDeleteUser}
            isSubmitting={isSubmitting}
            error={userError}
          />
        </Modal>
      ) : null}

      {confirmDialog ? (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          onConfirm={confirmDialog.onConfirm}
          onClose={() => setConfirmDialog(null)}
          isSubmitting={isSubmitting}
        />
      ) : null}
    </main>
  );
}
