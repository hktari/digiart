import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArtworksList } from "../artworks-list";
import "@testing-library/jest-dom";

// Mock the server actions
vi.mock("@/lib/actions/artworks", () => ({
  archiveArtwork: vi.fn(),
  reactivateArtwork: vi.fn(),
  deleteArtwork: vi.fn(),
}));

describe("ArtworksList", () => {
  const mockArtworks = [
    {
      id: "artwork-1",
      title: "Test Artwork 1",
      storageKey: "artworks/test1.jpg",
      mimeType: "image/jpeg",
      fileSize: 1000000,
      width: 1920,
      height: 1080,
      orientation: "LANDSCAPE" as const,
      status: "ACTIVE" as const,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      creatorProfileId: "creator-1",
      thumbnailUrl: "https://example.com/test1.jpg",
      isInRelease: false,
    },
    {
      id: "artwork-2",
      title: "Test Artwork 2",
      storageKey: "artworks/test2.jpg",
      mimeType: "image/jpeg",
      fileSize: 2000000,
      width: 1080,
      height: 1920,
      orientation: "PORTRAIT" as const,
      status: "ARCHIVED" as const,
      createdAt: new Date("2024-01-02"),
      updatedAt: new Date("2024-01-02"),
      creatorProfileId: "creator-1",
      thumbnailUrl: "https://example.com/test2.jpg",
      isInRelease: false,
    },
  ];

  describe("empty state", () => {
    it("shows empty state when no artworks", () => {
      render(<ArtworksList artworks={[]} />);

      expect(screen.getByText("No artworks yet")).toBeInTheDocument();
      expect(
        screen.getByText("Upload your first artwork to get started."),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Upload artwork/i }),
      ).toHaveAttribute("href", "/creator/artworks/new");
    });
  });

  describe("with artworks", () => {
    it("renders list of artworks", () => {
      render(<ArtworksList artworks={mockArtworks} />);

      expect(screen.getByText("Your Artworks")).toBeInTheDocument();
      expect(screen.getByText("2 artworks")).toBeInTheDocument();
      expect(screen.getByText("Test Artwork 1")).toBeInTheDocument();
      expect(screen.getByText("Test Artwork 2")).toBeInTheDocument();
    });

    it("has upload new button", () => {
      render(<ArtworksList artworks={mockArtworks} />);

      const uploadButton = screen.getByRole("link", { name: /Upload new/i });
      expect(uploadButton).toHaveAttribute("href", "/creator/artworks/new");
    });

    it("shows archive button for active artworks", () => {
      render(<ArtworksList artworks={mockArtworks} />);

      const archiveButtons = screen.getAllByRole("button", {
        name: /Archive/i,
      });
      expect(archiveButtons.length).toBe(1);
    });

    it("shows reactivate button for archived artworks", () => {
      render(<ArtworksList artworks={mockArtworks} />);

      const reactivateButtons = screen.getAllByRole("button", {
        name: /Reactivate/i,
      });
      expect(reactivateButtons.length).toBe(1);
    });

    it("displays archived overlay for archived artworks", () => {
      render(<ArtworksList artworks={mockArtworks} />);

      expect(screen.getByText("Archived")).toBeInTheDocument();
    });

    it("shows delete button for artworks not in releases", () => {
      render(<ArtworksList artworks={mockArtworks} />);

      const deleteButtons = screen.getAllByRole("button", {
        name: /Delete/i,
      });
      expect(deleteButtons.length).toBe(1);
    });

    it("does not show delete button for artworks in releases", () => {
      const artworksInRelease = [
        { ...mockArtworks[0], isInRelease: true },
        mockArtworks[1],
      ];
      render(<ArtworksList artworks={artworksInRelease} />);

      const deleteButtons = screen.queryAllByRole("button", {
        name: /Delete/i,
      });
      expect(deleteButtons.length).toBe(0);
    });
  });
});
