"use client";

import { Card } from "./components/Card";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        gap: "2rem",
      }}
    >
      <header style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>StreamPay</h1>
        <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
          Payment streaming on Stellar
        </p>
        <p style={{ maxWidth: "32ch", textAlign: "center" }}>
          Connect your wallet to create and manage payment streams.
        </p>
      </header>

      <section style={{ width: "100%", maxWidth: "400px" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>
          Stream details summary
        </h2>
        <Card padding="lg">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Status</span>
              <span style={{ color: "var(--accent)" }}>Active</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Flow rate</span>
              <span>10 XLM/day</span>
            </div>
            <div
              style={{
                marginTop: "1rem",
                paddingTop: "1rem",
                borderTop: "1px solid var(--card-border)",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontWeight: "bold" }}>Total Streamed</span>
              <span style={{ fontWeight: "bold" }}>45.2 XLM</span>
            </div>
          </div>
        </Card>

        <div style={{ marginTop: "1rem" }}>
          <Card padding="md" onClick={() => alert("Card clicked!")}>
            <div style={{ textAlign: "center", color: "var(--accent)" }}>
              View performance charts →
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
