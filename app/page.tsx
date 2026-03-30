"use client";

import { useState, useEffect } from "react";
import { Card } from "./components/Card";
import { Skeleton } from "./components/Skeleton";
import { Modal } from "./components/Modal";

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

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
          {isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Skeleton width="60px" />
                <Skeleton width="40px" />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Skeleton width="80px" />
                <Skeleton width="100px" />
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
                <Skeleton width="120px" height="1.25rem" />
                <Skeleton width="60px" height="1.25rem" />
              </div>
            </div>
          ) : (
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
          )}
        </Card>

        <div style={{ marginTop: "1rem", display: "grid", gap: "1rem" }}>
          <Card padding="md" onClick={() => setIsModalOpen(true)}>
            <div style={{ textAlign: "center", color: "var(--accent)" }}>
              View performance charts →
            </div>
          </Card>
          
          <button 
            onClick={() => setIsLoading(!isLoading)}
            style={{
              padding: "0.5rem",
              background: "none",
              border: `1px solid var(--card-border)`,
              borderRadius: "0.5rem",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: "0.875rem"
            }}
          >
            Toggle {isLoading ? "Loaded" : "Loading"} state
          </button>
        </div>
      </section>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Performance Charts"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <p style={{ color: "var(--muted)" }}>
            Real-time streaming metrics enabled by the Stellar Network.
          </p>
          <div style={{ 
            height: "150px", 
            border: "1px dashed var(--card-border)", 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            borderRadius: "0.75rem",
            color: "var(--muted)"
          }}>
            Chart Preview
          </div>
          <Card onClick={() => setIsModalOpen(false)} padding="sm">
            <div style={{ textAlign: "center", fontWeight: "bold" }}>Close</div>
          </Card>
        </div>
      </Modal>
    </main>
  );
}
