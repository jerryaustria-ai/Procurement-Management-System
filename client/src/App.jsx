import { useEffect, useState } from "react";
import ActionPanel from "./components/ActionPanel.jsx";
import CreateRequestForm from "./components/CreateRequestForm.jsx";
import DocumentPanel from "./components/DocumentPanel.jsx";
import LoginForm from "./components/LoginForm.jsx";
import RequestAdminPanel from "./components/RequestAdminPanel.jsx";
import RequestList from "./components/RequestList.jsx";
import RequestSummary from "./components/RequestSummary.jsx";
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

  const isAdmin = session?.user?.role === "admin";
  const selectedItem = items.find((item) => item.id === selectedId) ?? items[0] ?? null;
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
    } catch (error) {
      setAuthError(error.message);
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
    } catch (error) {
      setActionError(error.message);
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
    } catch (error) {
      setActionError(error.message);
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
    } catch (error) {
      setUploadError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteDocument(documentId) {
    if (!selectedItem || !session?.token) {
      return;
    }

    const shouldDelete = window.confirm("Delete this document?");
    if (!shouldDelete) {
      return;
    }

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
    } catch (error) {
      setUploadError(error.message);
    } finally {
      setIsSubmitting(false);
    }
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
    } catch (error) {
      setActionError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteRequest() {
    if (!selectedItem || !session?.token || !isAdmin) {
      return;
    }

    const shouldDelete = window.confirm(`Delete ${selectedItem.requestNumber}?`);
    if (!shouldDelete) {
      return;
    }

    setActionError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/workflows/purchase-requests/${selectedItem.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete request.");
      }

      setItems((current) => current.filter((item) => item.id !== selectedItem.id));
      setSelectedId("");
    } catch (error) {
      setActionError(error.message);
    } finally {
      setIsSubmitting(false);
    }
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
    } catch (error) {
      setUserError(error.message);
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
    } catch (error) {
      setUserError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteUser() {
    if (!session?.token || !isAdmin || !selectedUserId) {
      return;
    }

    const shouldDelete = window.confirm("Delete this user?");
    if (!shouldDelete) {
      return;
    }

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
    } catch (error) {
      setUserError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSelect(id) {
    setSelectedId(id);
  }

  function handleSelectUser(id) {
    setSelectedUserId(id);
  }

  function handleResetUserForm() {
    setSelectedUserId("");
    setUserError("");
    setUserForm(getInitialUserForm());
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
  }

  if (!session?.token) {
    return (
      <main className="app-shell">
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
      <section className="hero hero-with-user">
        <div>
          <p className="eyebrow">Januarius Procurement Hub</p>
          <h1>Purchase Request to Payment Tracking</h1>
          <p className="hero-copy">
            Role-based processing for review, approval, supplier selection, PO, delivery, invoice,
            matching, payment, and filing.
          </p>
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
        <RequestList items={items} selectedId={selectedId} onSelect={handleSelect} />
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

      <div className="layout-grid">
        <CreateRequestForm
          form={requestForm}
          onChange={handleRequestFormChange}
          onSubmit={handleCreateRequest}
          isSubmitting={isSubmitting}
          canCreate={["requester", "admin"].includes(session.user.role)}
        />
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
          <UserManagementPanel
            users={users}
            selectedUserId={selectedUserId}
            onSelect={handleSelectUser}
            form={userForm}
            onChange={handleUserFormChange}
            onCreate={handleCreateUser}
            onUpdate={handleUpdateUser}
            onDelete={handleDeleteUser}
            onReset={handleResetUserForm}
            isSubmitting={isSubmitting}
            error={userError}
          />
        </div>
      ) : null}
    </main>
  );
}
