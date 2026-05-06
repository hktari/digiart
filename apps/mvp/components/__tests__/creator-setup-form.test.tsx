import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CreatorSetupForm } from "../creator-setup-form";

// Mock the server actions
vi.mock("@/lib/actions/creator", () => ({
  checkSlugAvailability: vi.fn(),
  saveCreatorProfile: vi.fn().mockResolvedValue({ success: true }),
}));

describe("CreatorSetupForm", () => {
  const renderForm = (
    initialData?: Parameters<typeof CreatorSetupForm>[0]["initialData"],
  ) => {
    return render(<CreatorSetupForm initialData={initialData} />);
  };

  describe("initial render", () => {
    it("renders the form with step 1 (profile) active", () => {
      renderForm();

      expect(screen.getByText("Creator Setup")).toBeInTheDocument();
      expect(screen.getByLabelText(/Display Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Profile Slug/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Bio/i)).toBeInTheDocument();
    });

    it("shows progress indicator with Profile step active", () => {
      renderForm();

      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("Payout")).toBeInTheDocument();
      expect(screen.getByText("Review")).toBeInTheDocument();
      expect(screen.getByText("Artwork")).toBeInTheDocument();
      expect(screen.getByText("Share")).toBeInTheDocument();
    });

    it("pre-fills fields when initialData is provided", () => {
      renderForm({
        displayName: "Test Artist",
        slug: "test-artist",
        bio: "I make art",
      });

      expect(screen.getByLabelText(/Display Name/i)).toHaveValue("Test Artist");
      expect(screen.getByLabelText(/Profile Slug/i)).toHaveValue("test-artist");
      expect(screen.getByLabelText(/Bio/i)).toHaveValue("I make art");
    });
  });

  describe("profile step validation", () => {
    it("shows error when display name is empty and user tries to continue", async () => {
      renderForm();

      const continueButton = screen.getByRole("button", {
        name: /Continue to Payout Settings/i,
      });
      await userEvent.click(continueButton);

      expect(screen.getByText("Display name is required")).toBeInTheDocument();
    });

    it("shows error when slug is empty", async () => {
      renderForm();

      await userEvent.type(screen.getByLabelText(/Display Name/i), "Test");
      const continueButton = screen.getByRole("button", {
        name: /Continue to Payout Settings/i,
      });
      await userEvent.click(continueButton);

      expect(screen.getByText("Slug is required")).toBeInTheDocument();
    });

    it("shows error for invalid slug format", async () => {
      renderForm();

      await userEvent.type(screen.getByLabelText(/Display Name/i), "Test");
      await userEvent.type(
        screen.getByLabelText(/Profile Slug/i),
        "Test Artist",
      );

      const continueButton = screen.getByRole("button", {
        name: /Continue to Payout Settings/i,
      });
      await userEvent.click(continueButton);

      expect(
        screen.getByText(
          /Slug can only contain lowercase letters, numbers, and hyphens/i,
        ),
      ).toBeInTheDocument();
    });

    it("shows error for slug that is too short", async () => {
      renderForm();

      await userEvent.type(screen.getByLabelText(/Display Name/i), "Test");
      await userEvent.type(screen.getByLabelText(/Profile Slug/i), "ab");

      const continueButton = screen.getByRole("button", {
        name: /Continue to Payout Settings/i,
      });
      await userEvent.click(continueButton);

      expect(
        screen.getByText(/Slug must be at least 3 characters/i),
      ).toBeInTheDocument();
    });

    it("converts slug to lowercase on input", async () => {
      renderForm();

      const slugInput = screen.getByLabelText(/Profile Slug/i);
      await userEvent.type(slugInput, "TestArtist");

      expect(slugInput).toHaveValue("testartist");
    });

    it("shows character count for bio field", async () => {
      renderForm();

      const bioInput = screen.getByLabelText(/Bio/i);
      await userEvent.type(bioInput, "This is my bio");

      expect(screen.getByText("14/500 characters")).toBeInTheDocument();
    });
  });

  describe("slug availability check", () => {
    it("has a check button for slug availability", () => {
      renderForm();

      const checkButton = screen.getByRole("button", { name: /Check/i });
      expect(checkButton).toBeInTheDocument();
    });

    it("disables check button when slug is empty", () => {
      renderForm();

      const checkButton = screen.getByRole("button", { name: /Check/i });
      expect(checkButton).toBeDisabled();
    });

    it("enables check button when slug has value", async () => {
      renderForm();

      await userEvent.type(
        screen.getByLabelText(/Profile Slug/i),
        "test-artist",
      );
      const checkButton = screen.getByRole("button", { name: /Check/i });
      expect(checkButton).toBeEnabled();
    });
  });

  describe("step navigation", () => {
    it("proceeds to payout step when profile is valid", async () => {
      renderForm();

      await userEvent.type(
        screen.getByLabelText(/Display Name/i),
        "Test Artist",
      );
      await userEvent.type(
        screen.getByLabelText(/Profile Slug/i),
        "test-artist",
      );

      const continueButton = screen.getByRole("button", {
        name: /Continue to Payout Settings/i,
      });
      await userEvent.click(continueButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/Legal Name/i)).toBeInTheDocument();
      });
    });

    it("shows payout fields in step 2", async () => {
      renderForm();

      // Fill profile step
      await userEvent.type(
        screen.getByLabelText(/Display Name/i),
        "Test Artist",
      );
      await userEvent.type(
        screen.getByLabelText(/Profile Slug/i),
        "test-artist",
      );
      await userEvent.click(
        screen.getByRole("button", { name: /Continue to Payout Settings/i }),
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Legal Name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/PayPal Email/i)).toBeInTheDocument();
      });
    });

    it("shows back button in payout step that returns to profile", async () => {
      renderForm();

      // Fill and proceed to payout
      await userEvent.type(
        screen.getByLabelText(/Display Name/i),
        "Test Artist",
      );
      await userEvent.type(
        screen.getByLabelText(/Profile Slug/i),
        "test-artist",
      );
      await userEvent.click(
        screen.getByRole("button", { name: /Continue to Payout Settings/i }),
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Legal Name/i)).toBeInTheDocument();
      });

      const backButton = screen.getByRole("button", { name: /Back/i });
      await userEvent.click(backButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/Display Name/i)).toBeInTheDocument();
      });
    });

    it("proceeds to review step from payout step", async () => {
      renderForm();

      // Navigate to payout step
      await userEvent.type(
        screen.getByLabelText(/Display Name/i),
        "Test Artist",
      );
      await userEvent.type(
        screen.getByLabelText(/Profile Slug/i),
        "test-artist",
      );
      await userEvent.click(
        screen.getByRole("button", { name: /Continue to Payout Settings/i }),
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Legal Name/i)).toBeInTheDocument();
      });

      // Click review
      await userEvent.click(screen.getByRole("button", { name: /Review/i }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /^Continue$/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe("review step", () => {
    it("displays summary of entered data", async () => {
      renderForm();

      // Navigate through steps
      await userEvent.type(
        screen.getByLabelText(/Display Name/i),
        "Test Artist",
      );
      await userEvent.type(
        screen.getByLabelText(/Profile Slug/i),
        "test-artist",
      );
      await userEvent.type(screen.getByLabelText(/Bio/i), "I create art");

      await userEvent.click(
        screen.getByRole("button", { name: /Continue to Payout Settings/i }),
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Legal Name/i)).toBeInTheDocument();
      });

      await userEvent.type(screen.getByLabelText(/Legal Name/i), "John Doe");
      await userEvent.type(
        screen.getByLabelText(/PayPal Email/i),
        "john@example.com",
      );

      await userEvent.click(screen.getByRole("button", { name: /Review/i }));

      await waitFor(() => {
        expect(screen.getByText("Test Artist")).toBeInTheDocument();
        expect(screen.getByText(/test-artist/)).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /^Continue$/i }),
        ).toBeInTheDocument();
      });
    });

    it("shows payout ready status when info is complete", async () => {
      renderForm();

      // Navigate through steps
      await userEvent.type(
        screen.getByLabelText(/Display Name/i),
        "Test Artist",
      );
      await userEvent.type(
        screen.getByLabelText(/Profile Slug/i),
        "test-artist",
      );

      await userEvent.click(
        screen.getByRole("button", { name: /Continue to Payout Settings/i }),
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Legal Name/i)).toBeInTheDocument();
      });

      await userEvent.type(screen.getByLabelText(/Legal Name/i), "John Doe");
      await userEvent.type(
        screen.getByLabelText(/PayPal Email/i),
        "john@example.com",
      );

      await userEvent.click(screen.getByRole("button", { name: /Review/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/Yes - Legal name and PayPal provided/i),
        ).toBeInTheDocument();
      });
    });

    it("shows incomplete status when payout info is missing", async () => {
      renderForm();

      // Navigate through steps without filling payout
      await userEvent.type(
        screen.getByLabelText(/Display Name/i),
        "Test Artist",
      );
      await userEvent.type(
        screen.getByLabelText(/Profile Slug/i),
        "test-artist",
      );

      await userEvent.click(
        screen.getByRole("button", { name: /Continue to Payout Settings/i }),
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Legal Name/i)).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole("button", { name: /Review/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/No - Complete payout info later/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("form submission", () => {
    it("displays submit button in review step", async () => {
      renderForm();

      // Navigate to review
      await userEvent.type(
        screen.getByLabelText(/Display Name/i),
        "Test Artist",
      );
      await userEvent.type(
        screen.getByLabelText(/Profile Slug/i),
        "test-artist",
      );
      await userEvent.click(
        screen.getByRole("button", { name: /Continue to Payout Settings/i }),
      );

      await waitFor(() => {
        expect(screen.getByLabelText(/Legal Name/i)).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole("button", { name: /Review/i }));

      await waitFor(() => {
        const continueButton = screen.getByRole("button", {
          name: /^Continue$/i,
        });
        expect(continueButton).toBeInTheDocument();
        expect(continueButton).toHaveAttribute("type", "button");
      });
    });

    it("clears field errors when user types", async () => {
      renderForm();

      // Trigger error
      await userEvent.click(
        screen.getByRole("button", { name: /Continue to Payout Settings/i }),
      );

      expect(screen.getByText("Display name is required")).toBeInTheDocument();

      // Type to clear error
      await userEvent.type(screen.getByLabelText(/Display Name/i), "Test");

      expect(
        screen.queryByText("Display name is required"),
      ).not.toBeInTheDocument();
    });
  });

  describe("optional payout fields", () => {
    it("shows info message about optional payout fields", async () => {
      renderForm();

      await userEvent.type(screen.getByLabelText(/Display Name/i), "Test");
      await userEvent.type(
        screen.getByLabelText(/Profile Slug/i),
        "test-artist",
      );
      await userEvent.click(
        screen.getByRole("button", { name: /Continue to Payout Settings/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByText(/You can complete payout information later/i),
        ).toBeInTheDocument();
      });
    });
  });
});
