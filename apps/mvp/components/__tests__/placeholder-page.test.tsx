import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlaceholderPage } from "../placeholder-page";

describe("PlaceholderPage", () => {
  it("renders without crashing", () => {
    render(<PlaceholderPage title="Test Page" />);
    expect(screen.getByText("Test Page")).toBeInTheDocument();
  });

  it("renders title and coming soon badge", () => {
    render(<PlaceholderPage title="My Feature" />);
    expect(screen.getByText("My Feature")).toBeInTheDocument();
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });

  it("renders description when provided", () => {
    render(
      <PlaceholderPage
        title="My Feature"
        description="This is a description"
      />,
    );
    expect(screen.getByText("This is a description")).toBeInTheDocument();
  });

  it("does not render description when not provided", () => {
    render(<PlaceholderPage title="My Feature" />);
    const description = screen.queryByText(/description/i);
    expect(description).not.toBeInTheDocument();
  });
});
