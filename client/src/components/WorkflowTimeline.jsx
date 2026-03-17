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

export default function WorkflowTimeline({
  stages,
  currentStage,
  history,
  onExpand,
  showExpand = true
}) {
  const currentIndex = stages.indexOf(currentStage);
  const completedCount = currentIndex < 0 ? 0 : currentIndex;

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
          const state =
            index < currentIndex ? "done" : index === currentIndex ? "active" : "queued";
          const entry = getEntry(history, stage);

          return (
            <article className={`timeline-card ${state}`} key={stage}>
              <span className="timeline-index">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{stage}</h3>
                <p>
                  {state === "done"
                    ? "Completed"
                    : state === "active"
                      ? "In progress"
                      : "Waiting"}
                </p>
                {entry?.actor ? (
                  <small>
                    {entry.actor} · {entry.actorRoleLabel}
                  </small>
                ) : null}
                {entry?.updatedAt ? <small>{formatDate(entry.updatedAt)}</small> : null}
                {entry?.comment ? <small>{entry.comment}</small> : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
