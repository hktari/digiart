import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveSocialLinks } from "@/lib/actions/social-links";
import { SocialLinksForm } from "../social-links-form";

// Mock the server action
vi.mock("@/lib/actions/social-links", () => ({
  saveSocialLinks: vi.fn(),
}));

describe("SocialLinksForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderForm = (
    initialLinks?: Parameters<typeof SocialLinksForm>[0]["initialLinks"],
  ) => {
    return render(<SocialLinksForm initialLinks={initialLinks} />);
  };

  describe("initial render", () => {
    it("renders the form with title and description", () => {
      renderForm();

      expect(screen.getByText("Social Links")).toBeInTheDocument();
      expect(
        screen.getByText(/Add links to your social media, portfolio, or shop/i),
      ).toBeInTheDocument();
    });

    it("shows empty state when no links provided", () => {
      renderForm();

      expect(
        screen.getByText("No social links added yet."),
      ).toBeInTheDocument();
    });

    it("pre-fills links when initialLinks provided", () => {
      renderForm([
        { id: "1", label: "Instagram", url: "https://instagram.com/test" },
        { id: "2", label: "Website", url: "https://example.com" },
      ]);

      expect(screen.getAllByRole("combobox")).toHaveLength(2);
      expect(screen.getAllByPlaceholderText("https://...")).toHaveLength(2);
    });
  });

  describe("adding links", () => {
    it("has an Add Link button", () => {
      renderForm();

      expect(
        screen.getByRole("button", { name: /Add Link/i }),
      ).toBeInTheDocument();
    });

    it("adds a new link form when Add Link is clicked", async () => {
      renderForm();

      await userEvent.click(screen.getByRole("button", { name: /Add Link/i }));

      expect(screen.getAllByRole("combobox")).toHaveLength(1);
      expect(screen.getByPlaceholderText("https://...")).toBeInTheDocument();
    });

    it("shows link count indicator", () => {
      renderForm();

      expect(screen.getByText("0/10 links")).toBeInTheDocument();
    });

    it("updates link count when adding links", async () => {
      renderForm();

      await userEvent.click(screen.getByRole("button", { name: /Add Link/i }));

      expect(screen.getByText("1/10 links")).toBeInTheDocument();
    });

    it("disables Add Link button at maximum (10)", async () => {
      renderForm(
        Array.from({ length: 10 }, (_, i) => ({
          label: "Website",
          url: `https://example${i}.com`,
        })),
      );

      expect(screen.getByRole("button", { name: /Add Link/i })).toBeDisabled();
      expect(screen.getByText("10/10 links")).toBeInTheDocument();
    });
  });

  describe("removing links", () => {
    it("has remove buttons for each link", () => {
      renderForm([{ label: "Instagram", url: "https://instagram.com/test" }]);

      expect(
        screen.getByRole("button", { name: /Remove/i }),
      ).toBeInTheDocument();
    });

    it("removes a link when remove button is clicked", async () => {
      renderForm([{ label: "Instagram", url: "https://instagram.com/test" }]);

      await userEvent.click(
        screen.getByRole("button", { name: /Remove Instagram/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByText("No social links added yet."),
        ).toBeInTheDocument();
      });
    });

    it("removes correct link when multiple links exist", async () => {
      renderForm([
        { label: "Instagram", url: "https://instagram.com/test" },
        { label: "Website", url: "https://example.com" },
      ]);

      const removeButtons = screen.getAllByRole("button", { name: /Remove/i });
      await userEvent.click(removeButtons[0]);

      await waitFor(() => {
        expect(screen.getAllByRole("combobox")).toHaveLength(1);
      });
    });
  });

  describe("link fields", () => {
    it("has predefined label options in dropdown", async () => {
      renderForm();

      await userEvent.click(screen.getByRole("button", { name: /Add Link/i }));

      const select = screen.getByRole("combobox");
      await userEvent.click(select);

      expect(screen.getByText("Instagram")).toBeInTheDocument();
      expect(screen.getByText("Twitter")).toBeInTheDocument();
      expect(screen.getByText("Website")).toBeInTheDocument();
    });

    it("accepts URL input", async () => {
      renderForm();

      await userEvent.click(screen.getByRole("button", { name: /Add Link/i }));

      const urlInput = screen.getByPlaceholderText("https://...");
      await userEvent.type(urlInput, "https://example.com");

      expect(urlInput).toHaveValue("https://example.com");
    });

    it("shows error for empty label on submit", async () => {
      vi.mocked(saveSocialLinks).mockClear();

      renderForm();

      await userEvent.click(screen.getByRole("button", { name: /Add Link/i }));
      await userEvent.type(
        screen.getByPlaceholderText("https://..."),
        "https://example.com",
      );

      await userEvent.click(
        screen.getByRole("button", { name: /Save Social Links/i }),
      );

      await waitFor(() => {
        expect(screen.getByText("Label is required")).toBeInTheDocument();
      });

      expect(vi.mocked(saveSocialLinks)).not.toHaveBeenCalled();
    });

    it("shows error for empty URL on submit", async () => {
      vi.mocked(saveSocialLinks).mockClear();

      renderForm();

      await userEvent.click(screen.getByRole("button", { name: /Add Link/i }));
      await userEvent.selectOptions(screen.getByRole("combobox"), "Instagram");

      await userEvent.click(
        screen.getByRole("button", { name: /Save Social Links/i }),
      );

      await waitFor(() => {
        expect(screen.getByText("URL is required")).toBeInTheDocument();
      });

      expect(vi.mocked(saveSocialLinks)).not.toHaveBeenCalled();
    });

    it("clears errors when user corrects the input", async () => {
      renderForm();

      await userEvent.click(screen.getByRole("button", { name: /Add Link/i }));
      await userEvent.click(
        screen.getByRole("button", { name: /Save Social Links/i }),
      );

      await waitFor(() => {
        expect(screen.getByText("Label is required")).toBeInTheDocument();
      });

      await userEvent.selectOptions(screen.getByRole("combobox"), "Instagram");

      expect(screen.queryByText("Label is required")).not.toBeInTheDocument();
    });
  });

  describe("form submission", () => {
    it("has save button", () => {
      renderForm();

      expect(
        screen.getByRole("button", { name: /Save Social Links/i }),
      ).toBeInTheDocument();
    });

    it("disables save button when no links", () => {
      renderForm();

      expect(
        screen.getByRole("button", { name: /Save Social Links/i }),
      ).toBeDisabled();
    });

    it("disables save button when saving", async () => {
      vi.mocked(saveSocialLinks).mockImplementation(
        () => new Promise(() => {}),
      );

      renderForm([{ label: "Website", url: "https://example.com" }]);

      await userEvent.click(
        screen.getByRole("button", { name: /Save Social Links/i }),
      );

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Saving/i })).toBeDisabled();
      });
    });

    it("shows success message after successful save", async () => {
      vi.mocked(saveSocialLinks).mockResolvedValue({ success: true });

      renderForm([{ label: "Website", url: "https://example.com" }]);

      await userEvent.click(
        screen.getByRole("button", { name: /Save Social Links/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Your social links have been saved/i),
        ).toBeInTheDocument();
      });
    });

    it("displays server validation errors", async () => {
      vi.mocked(saveSocialLinks).mockResolvedValue({
        success: false,
        errors: [{ index: 0, field: "url", message: "URL is unreachable" }],
      });

      renderForm([{ label: "Website", url: "https://example.com" }]);

      await userEvent.click(
        screen.getByRole("button", { name: /Save Social Links/i }),
      );

      await waitFor(() => {
        expect(screen.getByText(/URL is unreachable/i)).toBeInTheDocument();
        expect(
          screen.getByText(/Please fix the errors below/i),
        ).toBeInTheDocument();
      });
    });
  });
});
