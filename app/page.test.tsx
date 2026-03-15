import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Home", () => {
  it("renders StreamPay heading", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { name: /streampay/i })).toBeInTheDocument();
  });

  it("renders payment streaming tagline", () => {
    render(<Home />);
    expect(screen.getByText(/payment streaming on stellar/i)).toBeInTheDocument();
  });
});
