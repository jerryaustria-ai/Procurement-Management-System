import { useEffect, useState } from "react";
import ActionPanel from "./components/ActionPanel.jsx";
import ConfirmDialog from "./components/ConfirmDialog.jsx";
import CreateRequestForm from "./components/CreateRequestForm.jsx";
import DocumentPanel from "./components/DocumentPanel.jsx";
import LoginForm from "./components/LoginForm.jsx";
import Modal from "./components/Modal.jsx";
import RequestAdminPanel from "./components/RequestAdminPanel.jsx";
import RequestList from "./components/RequestList.jsx";
import RequestSummary from "./components/RequestSummary.jsx";
import ToastStack from "./components/ToastStack.jsx";
import UserEditorPanel from "./components/UserEditorPanel.jsx";
import UserManagementPanel from "./components/UserManagementPanel.jsx";
import WorkflowTimeline from "./components/WorkflowTimeline.jsx";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
const API_ORIGIN = API_BASE_URL.replace(/\/api$/, "");

function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem("procurement-session") || "null");
  } catch {
    return null;
  }
}

function getInitialRequestForm(department = "") {
  return {
    title: "",
    description: "",
    category: "General Procurement",
    department,
    amount: "",
    currency: "PHP",
    priority: "medium",
    dateNeeded: "",
    deliveryAddress: "",
    paymentTerms: "Net 30",
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

function getRequestAdminForm(item) {
  if (!item) {
    return {
      title: "",
      description: "",
      category: "",
      department: "",
      amount: "",
      priority: "medium",
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
    category: item.category ?? "",
    department: item.department ?? "",
    amount: String(item.amount ?? ""),
    priority: item.priority ?? "medium",
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
  const highPriorityCount = items.filter((item) =>
    ["high", "critical"].includes(item.priority)
  ).length;
  const totalAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return [
    { label: "Open Requests", value: String(openCount).padStart(2, "0") },
    { label: "Completed", value: String(completedCount).padStart(2, "0") },
    { label: "High Priority", value: String(highPriorityCount).padStart(2, "0") },
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

function matchesSearch(item, query) {
  const searchable = [
    item.requestNumber,
    item.title,
    item.department,
    item.category,
    item.currentStage,
    item.requester
  ]
    .join(" ")
    .toLowerCase();

  return searchable.includes(query.toLowerCase());
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

function CompanyHeader({ isAuthenticated, user }) {
  return (
    <header className="company-header">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true">
          <span>J</span>
        </div>
        <div>
          <p className="brand-kicker">Januarius Holdings Inc.</p>
          <strong>Procurement Management System</strong>
        </div>
      </div>

      <div className="header-meta">
        <div className="header-chip">
          <span className="header-chip-dot" />
          <span>{isAuthenticated ? "Live Workflow Session" : "Secure Internal Access"}</span>
        </div>
        {user ? (
          <div className="header-identity">
            <span>{user.roleLabel}</span>
            <strong>{user.name}</strong>
          </div>
        ) : null}
      </div>
    </header>
  );
}

export default function App() {
  const [session, setSession] = useState(() => getStoredSession());
  const [credentials, setCredentials] = useState({
    email: "admin@januarius.app",
    password: "password123"
  });
  const [items, setItems] = useState([]);
  const [stages, setStages] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [requestFilters, setRequestFilters] = useState({
    query: "",
    stage: "all",
    status: "all",
    priority: "all",
    requestedFrom: "",
    requestedTo: ""
  });
  const [selectedUserId, setSelectedUserId] = useState("");
  const [actionForm, setActionForm] = useState({
    supplier: "",
    notes: "",
    poNumber: "",
    invoiceNumber: "",
    paymentReference: "",
    deliveryDate: "",
    inspectionStatus: "pending"
  });
  const [requestForm, setRequestForm] = useState(() =>
    getInitialRequestForm(session?.user?.department || "")
  );
  const [uploadForm, setUploadForm] = useState({
    type: "po",
    label: "",
    file: null
  });
  const [requestAdminForm, setRequestAdminForm] = useState(() => getRequestAdminForm(null));
  const [userForm, setUserForm] = useState(getInitialUserForm());
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [actionError, setActionError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [userError, setUserError] = useState("");
  const [isCreateRequestModalOpen, setIsCreateRequestModalOpen] = useState(false);
  const [isEditRequestModalOpen, setIsEditRequestModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [toasts, setToasts] = useState([]);

  const isAdmin = session?.user?.role === "admin";
  const filteredItems = items.filter((item) => {
    const matchesQuery = !requestFilters.query || matchesSearch(item, requestFilters.query);
    const matchesStage =
      requestFilters.stage === "all" || item.currentStage === requestFilters.stage;
    const matchesStatus = requestFilters.status === "all" || item.status === requestFilters.status;
    const matchesPriority =
      requestFilters.priority === "all" || item.priority === requestFilters.priority;
    const itemDate = item.requestedAt ? new Date(item.requestedAt) : null;
    const matchesFrom =
      !requestFilters.requestedFrom ||
      (itemDate && itemDate >= new Date(`${requestFilters.requestedFrom}T00:00:00`));
    const matchesTo =
      !requestFilters.requestedTo ||
      (itemDate && itemDate <= new Date(`${requestFilters.requestedTo}T23:59:59`));

    return matchesQuery && matchesStage && matchesStatus && matchesPriority && matchesFrom && matchesTo;
  });
  const selectedItem =
    filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null;
  const selectedUser = users.find((user) => user.id === selectedUserId) ?? null;
  const dashboardStats = getDashboardStats(items);
  const canManageDocuments = Boolean(
    selectedItem &&
      session?.user &&
      (session.user.role === "admin" ||
        session.user.email === selectedItem.requesterEmail ||
        selectedItem.allowedRoles.includes(session.user.role))
  );

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

    setActionForm({
      supplier: selectedItem.supplier === "Pending selection" ? "" : selectedItem.supplier,
      notes: selectedItem.notes ?? "",
      poNumber: selectedItem.poNumber ?? "",
      invoiceNumber: selectedItem.invoiceNumber ?? "",
      paymentReference: selectedItem.paymentReference ?? "",
      deliveryDate: selectedItem.deliveryDate ? selectedItem.deliveryDate.slice(0, 10) : "",
      inspectionStatus: selectedItem.inspectionStatus ?? "pending"
    });
    setRequestAdminForm(getRequestAdminForm(selectedItem));
    setUploadForm((current) => ({
      ...current,
      label: "",
      file: null
    }));
    setSelectedId(selectedItem.id);
  }, [selectedItem]);

  useEffect(() => {
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
  }, [selectedUser]);

  useEffect(() => {
    if (!session?.token) {
      return;
    }

    localStorage.setItem("procurement-session", JSON.stringify(session));
    setRequestForm(getInitialRequestForm(session.user.department || ""));
    void loadDashboard(session.token, session.user.role);
  }, [session]);

  async function loadDashboard(token, role) {
    setIsLoading(true);
    setActionError("");
    setUserError("");

    try {
      const workflowPromise = fetch(`${API_BASE_URL}/workflows/purchase-requests`, {
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

      const [workflowResponse, userResponse] = await Promise.all([workflowPromise, userPromise]);

      if (!workflowResponse.ok) {
        throw new Error("Unable to load workflow data.");
      }

      const workflowData = await workflowResponse.json();
      setStages(workflowData.stages);
      setItems(workflowData.items);
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
      setActionError(error.message || "Unable to load dashboard.");
    } finally {
      setIsLoading(false);
    }
  }

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

  function handleRequestFilterChange(event) {
    setRequestFilters((current) => ({
      ...current,
      [event.target.name]: event.target.value
    }));
  }

  function handleResetFilters() {
    setRequestFilters({
      query: "",
      stage: "all",
      status: "all",
      priority: "all",
      requestedFrom: "",
      requestedTo: ""
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
      item.department,
      item.category,
      item.requester,
      item.amount,
      item.priorityLabel,
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

    const activeFilters = [
      requestFilters.query ? `Search: ${requestFilters.query}` : null,
      requestFilters.stage !== "all" ? `Stage: ${requestFilters.stage}` : null,
      requestFilters.status !== "all" ? `Status: ${requestFilters.status}` : null,
      requestFilters.priority !== "all" ? `Priority: ${requestFilters.priority}` : null,
      requestFilters.requestedFrom ? `From: ${formatExportDate(requestFilters.requestedFrom)}` : null,
      requestFilters.requestedTo ? `To: ${formatExportDate(requestFilters.requestedTo)}` : null
    ]
      .filter(Boolean)
      .join(" | ");

    const exportTotalValue = filteredItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const exportHighPriority = filteredItems.filter((item) =>
      ["high", "critical"].includes(item.priority)
    ).length;

    const rowsHtml = filteredItems
      .map(
        (item) => `
          <tr>
            <td>${item.requestNumber}</td>
            <td>${item.title}</td>
            <td>${item.department}</td>
            <td>${item.requester}</td>
            <td>${item.priorityLabel}</td>
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
                  <p class="kicker">Januarius Holdings Inc.</p>
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
                  <span>High Priority</span>
                  <strong>${exportHighPriority}</strong>
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
                <strong>Applied filters:</strong> ${activeFilters || "All requests"}
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
                <th>Department</th>
                <th>Requester</th>
                <th>Priority</th>
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
    setIsCreateRequestModalOpen(true);
  }

  function openEditRequestModal() {
    if (!selectedItem) {
      return;
    }

    setRequestAdminForm(getRequestAdminForm(selectedItem));
    setIsEditRequestModalOpen(true);
  }

  function openCreateUserModal() {
    setSelectedUserId("");
    setUserForm(getInitialUserForm());
    setUserError("");
    setIsUserModalOpen(true);
  }

  function openConfirmDialog(config) {
    setConfirmDialog(config);
  }

  function openEditUserModal() {
    if (!selectedUser) {
      return;
    }

    setUserForm({
      name: selectedUser.name,
      email: selectedUser.email,
      role: selectedUser.role,
      department: selectedUser.department ?? "",
      password: ""
    });
    setIsUserModalOpen(true);
  }

  async function handleCreateRequest() {
    if (!session?.token) {
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
          amount: Number(requestForm.amount)
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to create request.");
      }

      setItems((current) => [data, ...current]);
      setSelectedId(data.id);
      setRequestForm(getInitialRequestForm(session.user.department || ""));
      setIsCreateRequestModalOpen(false);
      pushToast({
        title: "Request created",
        message: `${data.requestNumber} is now in the workflow.`,
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
            notes: actionForm.notes,
            poNumber: actionForm.poNumber,
            invoiceNumber: actionForm.invoiceNumber,
            paymentReference: actionForm.paymentReference,
            deliveryDate: actionForm.deliveryDate || undefined,
            inspectionStatus: actionForm.inspectionStatus,
            comment: `${session.user.name} advanced ${selectedItem.requestNumber} to the next stage.`
          })
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to advance request.");
      }

      setItems((current) => current.map((item) => (item.id === data.id ? data : item)));
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
    if (!selectedItem || !session?.token || !isAdmin) {
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
          amount: Number(requestAdminForm.amount)
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

  async function handleDeleteUser() {
    if (!session?.token || !isAdmin || !selectedUserId) {
      return;
    }

    openConfirmDialog({
      title: "Delete user account",
      message: "This account will lose access to the procurement workflow immediately.",
      confirmLabel: "Delete user",
      onConfirm: async () => {
        setUserError("");
        setIsSubmitting(true);

        try {
          const response = await fetch(`${API_BASE_URL}/users/${selectedUserId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${session.token}`
            }
          });

          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || "Failed to delete user.");
          }

          setUsers((current) => current.filter((user) => user.id !== selectedUserId));
          setSelectedUserId("");
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

  function handleSelect(id) {
    setSelectedId(id);
  }

  function handleSelectUser(id) {
    setSelectedUserId(id);
  }

  function handleLogout() {
    localStorage.removeItem("procurement-session");
    setSession(null);
    setItems([]);
    setStages([]);
    setUsers([]);
    setSelectedId("");
    setSelectedUserId("");
    setRequestForm(getInitialRequestForm(""));
    setRequestAdminForm(getRequestAdminForm(null));
    setUserForm(getInitialUserForm());
    setIsCreateRequestModalOpen(false);
    setIsEditRequestModalOpen(false);
    setIsUserModalOpen(false);
    setConfirmDialog(null);
  }

  if (!session?.token) {
    return (
      <main className="app-shell">
        <CompanyHeader isAuthenticated={false} />
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

  return (
    <main className="app-shell">
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
      <CompanyHeader isAuthenticated user={session.user} />
      <section className="hero hero-with-user">
        <div>
          <p className="eyebrow">Januarius Procurement Hub</p>
          <h1>Purchase Request to Payment Tracking</h1>
          <p className="hero-copy">
            Role-based processing for review, approval, supplier selection, PO, delivery, invoice,
            matching, payment, and filing.
          </p>
          <div className="toolbar-actions left hero-actions">
            <button type="button" onClick={openCreateRequestModal}>
              New purchase request
            </button>
            {isAdmin ? (
              <button className="ghost-button" type="button" onClick={openEditRequestModal} disabled={!selectedItem}>
                Edit selected request
              </button>
            ) : null}
          </div>
        </div>
        <div className="user-card">
          <strong>{session.user.name}</strong>
          <span>{session.user.roleLabel}</span>
          <small>{session.user.email}</small>
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </section>

      <section className="stats-grid">
        {dashboardStats.map((stat) => (
          <article className="panel stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </section>

      {actionError ? <p className="error-text">{actionError}</p> : null}
      {isLoading ? <p className="error-text">Loading workflow data...</p> : null}

      <div className="layout-grid three-column">
        <RequestList
          items={filteredItems}
          selectedId={selectedId}
          onSelect={handleSelect}
          stages={stages}
          filters={requestFilters}
          onFilterChange={handleRequestFilterChange}
          onResetFilters={handleResetFilters}
          onExportCsv={handleExportCsv}
          onExportPdf={handleExportPdf}
        />
        {selectedItem ? <RequestSummary item={selectedItem} /> : null}
        {selectedItem ? (
          <ActionPanel
            item={selectedItem}
            stages={stages}
            user={session.user}
            form={actionForm}
            onChange={handleActionFormChange}
            onAdvance={handleAdvance}
            isSubmitting={isSubmitting}
            error={actionError}
          />
        ) : null}
      </div>

      <div className="layout-grid modal-launch-grid">
        <section className="panel launch-card">
          <div>
            <p className="eyebrow">Create</p>
            <h2>Submit a new purchase request</h2>
            <p className="panel-support">
              Open a guided form to create procurement requests without leaving the dashboard.
            </p>
          </div>
          <button type="button" onClick={openCreateRequestModal}>
            Open request form
          </button>
        </section>
        {selectedItem ? (
          <WorkflowTimeline
            stages={stages}
            currentStage={selectedItem.currentStage}
            history={selectedItem.history}
          />
        ) : null}
      </div>

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
        />
      ) : null}

      {isAdmin ? (
        <div className="admin-stack">
          <section className="panel launch-card">
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
          <UserManagementPanel
            users={users}
            selectedUserId={selectedUserId}
            onSelect={handleSelectUser}
            onCreateNew={openCreateUserModal}
            onEditSelected={openEditUserModal}
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
            onChange={handleRequestFormChange}
            onSubmit={handleCreateRequest}
            isSubmitting={isSubmitting}
            canCreate={["requester", "admin"].includes(session.user.role)}
          />
        </Modal>
      ) : null}

      {isEditRequestModalOpen && selectedItem ? (
        <Modal
          eyebrow="Admin Request"
          title={`Edit ${selectedItem.requestNumber}`}
          onClose={() => setIsEditRequestModalOpen(false)}
        >
          <RequestAdminPanel
            item={selectedItem}
            stages={stages}
            form={requestAdminForm}
            onChange={handleRequestAdminFormChange}
            onSave={handleSaveRequest}
            onDelete={handleDeleteRequest}
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
