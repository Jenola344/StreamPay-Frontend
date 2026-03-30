import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  children?: ReactNode;
};

export default function EmptyState({
  title,
  description,
  primaryAction,
  secondaryAction,
  children,
}: EmptyStateProps) {
  return (
    <section
      style={{
        width: "100%",
        maxWidth: "44rem",
        margin: "0 auto",
        padding: "clamp(1.5rem, 2vw, 2.5rem)",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(148,163,184,0.18)",
        borderRadius: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      <div style={{ display: "grid", gap: "0.75rem" }}>
        <p
          style={{
            textTransform: "uppercase",
            letterSpacing: "0.16em",
            fontSize: "0.75rem",
            color: "var(--accent)",
            margin: 0,
          }}
        >
          Empty state
        </p>
        <h2 style={{ fontSize: "clamp(1.75rem, 2.5vw, 2.25rem)", margin: 0 }}>
          {title}
        </h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.8, margin: 0 }}>
          {description}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "center",
        }}
      >
        {primaryAction}
        {secondaryAction}
      </div>

      {children ? (
        <div style={{ color: "var(--muted)", fontSize: "0.95rem" }}>{children}</div>
      ) : null}
    </section>
  );
}
