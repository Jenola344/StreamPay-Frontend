import { render, screen } from "@testing-library/react";
import { StreamsPageContent } from "./page";

describe("StreamsPageContent", () => {
  it("renders the empty state", () => {
    render(<StreamsPageContent state="empty" streams={[]} />);

    expect(screen.getByRole("heading", { name: /your streams list is empty/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create your first stream/i })).toBeInTheDocument();
  });

  it("renders the loading skeleton state", () => {
    render(<StreamsPageContent state="loading" />);

    expect(screen.getByLabelText(/loading streams/i)).toBeInTheDocument();
    expect(screen.getAllByTestId("stream-row-skeleton")).toHaveLength(3);
  });

  it("renders the populated list state", () => {
    render(<StreamsPageContent state="populated" />);

    expect(screen.getByRole("heading", { name: /streams overview/i })).toBeInTheDocument();
    expect(screen.getByText(/ada creative studio/i)).toBeInTheDocument();
    expect(screen.getByText(/120 xlm \/ month/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pause/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/stream status: active/i)).toBeInTheDocument();
  });
});
