import { useEffect, useState } from "react";
import ActionPanel from "./components/ActionPanel.jsx";
import CreateRequestForm from "./components/CreateRequestForm.jsx";
import LoginForm from "./components/LoginForm.jsx";
import RequestList from "./components/RequestList.jsx";
import RequestSummary from "./components/RequestSummary.jsx";
import WorkflowTimeline from "./components/WorkflowTimeline.jsx";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

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
  const [selectedId, setSelectedId] = useState("");
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
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [actionError, setActionError] = useState("");

  const selectedItem = items.find((item) => item.id === selectedId) ?? items[0] ?? null;
  const dashboardStats = getDashboardStats(items);

  useEffect(() => {
    if (!selectedItem) {
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
    setSelectedId(selectedItem.id);
  }, [selectedItem]);

  useEffect(() => {
    if (!session?.token) {
      return;
    }

    localStorage.setItem("procurement-session", JSON.stringify(session));
    setRequestForm(getInitialRequestForm(session.user.department || ""));
    void loadWorkflows(session.token);
  }, [session]);

  async function loadWorkflows(token) {
    setIsLoading(true);
    setActionError("");

    try {
      const response = await fetch(`${API_BASE_URL}/workflows/purchase-requests`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Unable to load");
      }

      const data = await response.json();
      setStages(data.stages);
      setItems(data.items);
      setSelectedId((current) => current || data.items[0]?.id || "");
    } catch (_error) {
      setActionError("Unable to load workflow data. Check MongoDB, Render API, and CORS settings.");
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

  function handleSelect(id) {
    setSelectedId(id);
  }

  function handleLogout() {
    localStorage.removeItem("procurement-session");
    setSession(null);
    setItems([]);
    setStages([]);
    setSelectedId("");
    setRequestForm(getInitialRequestForm(""));
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
    </main>
  );
}
