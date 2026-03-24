export default function PanelExpandButton({ onClick, label = "Expand panel" }) {
  return (
    <span
      className="panel-expand-button"
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={label}
      title={label}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M9 4H4v5M15 4h5v5M20 15v5h-5M4 15v5h5M10 10 4 4M14 10l6-6M14 14l6 6M10 14l-6 6"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  );
}
