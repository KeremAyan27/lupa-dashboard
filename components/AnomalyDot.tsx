"use client";

// Clickable anomaly marker for the time-series charts. Rendered via Recharts'
// ReferenceDot `shape` prop, which supplies the pixel cx/cy.
//
// Affordance: a `cursor: pointer` group with a large transparent hit circle
// and a persistent ring around the dot, so it clearly reads as an interactive
// target — on desktop (cursor) and on touch (the ring), where there is no
// hover. Recharts renders ReferenceDots in a separate z-index layer that does
// not reliably surface hover events to the shape, so the affordance is
// persistent rather than hover-only. Tapping navigates to the alert;
// stopPropagation keeps the chart's tap-to-focus from also firing.

export function AnomalyDot({
  cx,
  cy,
  color,
  bg,
  onSelect,
  label,
}: {
  cx?: number;
  cy?: number;
  color: string;
  /** chart background, for a thin separating ring around the dot */
  bg: string;
  onSelect: () => void;
  label: string;
}) {
  if (typeof cx !== "number" || typeof cy !== "number") return <g />;
  return (
    <g
      className="anomaly-hit"
      role="button"
      tabIndex={0}
      aria-label={`${label} — open alert`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* enlarged transparent hit target */}
      <circle cx={cx} cy={cy} r={14} fill="transparent" />
      {/* persistent target ring */}
      <circle
        cx={cx}
        cy={cy}
        r={8}
        fill="none"
        stroke={color}
        strokeOpacity={0.45}
        strokeWidth={1.5}
      />
      {/* dot with a thin separating halo in the chart background color */}
      <circle cx={cx} cy={cy} r={4.5} fill={color} stroke={bg} strokeWidth={1.5} />
    </g>
  );
}
