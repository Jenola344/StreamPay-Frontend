import EmptyState from "../components/EmptyState";

export default function StreamsPage() {
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
        title="No payment streams yet"
        description="Once you connect a Stellar wallet, your active streams will appear here. Create a stream to start sending payments in real time."
        primaryAction={
          <a
            href="/"
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
            Create stream
          </a>
        }
        secondaryAction={
          <a
            href="/activity"
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
            View activity
          </a>
        }
      >
        Tip: Connect your wallet to the dashboard and begin streaming payments securely over Stellar.
      </EmptyState>
    </main>
  );
}
