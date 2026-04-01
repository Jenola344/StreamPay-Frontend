import EmptyState from "../components/EmptyState";

export default function ActivityPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "2rem",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <EmptyState
        title="Activity will appear here"
        description="Any payment stream updates, payments, or wallet events will show up once activity begins. Stay connected to monitor your flow."
        primaryAction={
          <a
            href="/streams"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.95rem 1.5rem",
              borderRadius: "999px",
              background: "var(--accent)",
              color: "#000",
              fontWeight: 700,
            }}
          >
            View streams
          </a>
        }
        secondaryAction={
          <a
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.95rem 1.5rem",
              borderRadius: "999px",
              border: "1px solid rgba(148,163,184,0.35)",
              color: "var(--foreground)",
            }}
          >
            Home dashboard
          </a>
        }
      >
        Keep your wallet connected to see live stream and payment activity in one place.
      </EmptyState>
    </main>
  );
}
