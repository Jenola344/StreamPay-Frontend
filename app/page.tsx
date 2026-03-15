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
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>StreamPay</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
        Payment streaming on Stellar
      </p>
      <p style={{ maxWidth: "32ch", textAlign: "center" }}>
        Connect your wallet to create and manage payment streams.
      </p>
    </main>
  );
}
