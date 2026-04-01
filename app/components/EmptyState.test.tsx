import { render, screen } from "@testing-library/react";
import EmptyState from "./EmptyState";

describe("EmptyState", () => {
  it("renders title, description, and CTA actions", () => {
    render(
      <EmptyState
        title="No data available"
        description="Please connect your wallet to continue."
        primaryAction={<button>Connect wallet</button>}
        secondaryAction={<button>Learn more</button>}
      >
        Additional details go here.
      </EmptyState>
    );

    expect(screen.getByRole("heading", { name: /no data available/i })).toBeInTheDocument();
    expect(screen.getByText(/please connect your wallet to continue/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /learn more/i })).toBeInTheDocument();
    expect(screen.getByText(/additional details go here/i)).toBeInTheDocument();
  });
});
