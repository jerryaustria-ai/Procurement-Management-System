import PanelExpandButton from "./PanelExpandButton.jsx";

function getEntry(history, stage) {
  return [...history].reverse().find((entry) => entry.stage === stage);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

function getStageAnchor(stage) {
  return stage.toLowerCase().replaceAll(/\s+/g, "-");
}

function getDisplayIndex(stageIndex) {
  return stageIndex + 1;
}

export default function WorkflowTimeline({
  stages,
  currentStage,
  history,
  requestStatus = "open",
  onExpand,
  showExpand = true
}) {
  const currentIndex = stages.indexOf(currentStage);
  const currentEntry = currentIndex >= 0 ? getEntry(history, stages[currentIndex]) : null;
  const currentStageCompleted =
    currentEntry?.status === "completed" || currentEntry?.status === "ready";
  const completedCount =
    currentIndex < 0 ? 0 : currentIndex + (currentStageCompleted ? 1 : 0);

  return (
    <section className="panel panel-with-expand">
      {showExpand && onExpand ? (
        <PanelExpandButton onClick={onExpand} label="Expand procurement lifecycle" />
      ) : null}
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Workflow</p>
          <h2>Procurement lifecycle</h2>
        </div>
        <span className="panel-counter">
          {completedCount}/{stages.length} complete
        </span>
      </div>
      <div className="timeline">
        {stages.map((stage, index) => {
          const entry = getEntry(history, stage);
          const entryRejected = entry?.status === "rejected";
          const state =
            index > currentIndex
              ? "queued"
              : entryRejected
                ? "active"
                : index === currentIndex
                  ? "active"
                  : entry?.status === "completed" || entry?.status === "ready" || index < currentIndex
                    ? "done"
                    : "queued";
          const showEntryDetails = state !== "queued";

          return (
            <div className="timeline-stack" key={stage}>
              <article className={`timeline-card ${state}`} id={getStageAnchor(stage)}>
                <span className="timeline-index">
                  {String(getDisplayIndex(index)).padStart(2, "0")}
                </span>
                <div>
                  <h3>{stage}</h3>
                  <p>
                    {entryRejected || (requestStatus === "rejected" && index === currentIndex)
                      ? "Rejected"
                      : state === "done"
                      ? "Completed"
                      : state === "active"
                        ? "In progress"
                        : "Waiting"}
                  </p>
                  {showEntryDetails && entry?.actor ? (
                    <small>
                      {entry.actor} · {entry.actorRoleLabel}
                    </small>
                  ) : null}
                  {showEntryDetails && entry?.updatedAt ? (
                    <small>{formatDate(entry.updatedAt)}</small>
                  ) : null}
                  {showEntryDetails && entry?.comment ? <small>{entry.comment}</small> : null}
                </div>
              </article>
            </div>
          );
        })}
      </div>
    </section>
  );
}
