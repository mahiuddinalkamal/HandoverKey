import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import VaultStats from "../VaultStats";
import { VaultEntry } from "../../services/vault";

// Mock data for testing
const mockEntries: VaultEntry[] = [
  {
    id: "entry-1",
    encryptedData: "encrypted-content-1",
    iv: "iv-1",
    algorithm: "AES-256-GCM",
    category: "passwords",
    tags: ["work", "email"],
    version: 1,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "entry-2",
    encryptedData: "encrypted-content-2",
    iv: "iv-2",
    algorithm: "AES-256-GCM",
    category: "documents",
    tags: ["personal", "important"],
    version: 1,
    createdAt: "2024-01-02T00:00:00Z",
    updatedAt: "2024-01-02T00:00:00Z",
  },
  {
    id: "entry-3",
    encryptedData: "encrypted-content-3",
    iv: "iv-3",
    algorithm: "AES-256-GCM",
    category: "passwords",
    tags: ["work", "database"],
    version: 1,
    createdAt: "2024-01-03T00:00:00Z",
    updatedAt: "2024-01-03T00:00:00Z",
  },
  {
    id: "entry-4",
    encryptedData: "encrypted-content-4",
    iv: "iv-4",
    algorithm: "AES-256-GCM",
    category: "notes",
    tags: ["personal"],
    version: 1,
    createdAt: "2024-01-04T00:00:00Z",
    updatedAt: "2024-01-04T00:00:00Z",
  },
];

describe("VaultStats", () => {
  describe("Statistics Calculations", () => {
    it("should calculate total entries correctly", () => {
      render(
        <VaultStats
          entries={mockEntries}
          filteredEntries={mockEntries}
          isFiltered={false}
        />,
      );

      expect(screen.getByText("4")).toBeInTheDocument();
      expect(screen.getByText("Total Entries")).toBeInTheDocument();
    });

    it("should calculate unique categories correctly", () => {
      render(
        <VaultStats
          entries={mockEntries}
          filteredEntries={mockEntries}
          isFiltered={false}
        />,
      );

      // Should show 3 categories: passwords, documents, notes
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText("Categories")).toBeInTheDocument();
    });

    it("should calculate unique tags correctly", () => {
      render(
        <VaultStats
          entries={mockEntries}
          filteredEntries={mockEntries}
          isFiltered={false}
        />,
      );

      // Should show 5 unique tags: work, email, personal, important, database
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("Unique Tags")).toBeInTheDocument();
    });

    it("should handle empty entries array", () => {
      render(
        <VaultStats entries={[]} filteredEntries={[]} isFiltered={false} />,
      );

      const zeroValues = screen.getAllByText("0");
      expect(zeroValues).toHaveLength(3); // All three stats should be 0
    });

    it("should handle entries without categories or tags", () => {
      const entriesWithoutCategoriesOrTags: VaultEntry[] = [
        {
          id: "entry-1",
          encryptedData: "encrypted-content-1",
          iv: "iv-1",
          algorithm: "AES-256-GCM",
          version: 1,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      render(
        <VaultStats
          entries={entriesWithoutCategoriesOrTags}
          filteredEntries={entriesWithoutCategoriesOrTags}
          isFiltered={false}
        />,
      );

      expect(screen.getByText("1")).toBeInTheDocument(); // Total entries
      expect(screen.getAllByText("0")).toHaveLength(2); // Categories and tags should be 0
    });
  });

  describe("Filtered Statistics", () => {
    const filteredEntries = mockEntries.slice(0, 2); // First 2 entries

    it("should show filtered stats when isFiltered is true", () => {
      render(
        <VaultStats
          entries={mockEntries}
          filteredEntries={filteredEntries}
          isFiltered={true}
        />,
      );

      // Should show filtered count (2) instead of total (4)
      const entriesStats =
        screen.getByText("Total Entries").parentElement?.parentElement;
      expect(entriesStats).toHaveTextContent("2");
      expect(screen.getByText("of 4 total")).toBeInTheDocument();
    });

    it("should calculate filtered categories correctly", () => {
      render(
        <VaultStats
          entries={mockEntries}
          filteredEntries={filteredEntries}
          isFiltered={true}
        />,
      );

      // Filtered entries have 2 categories: passwords, documents
      const categoryStats = screen
        .getByText("Categories")
        .closest("div")?.parentElement;
      expect(categoryStats).toHaveTextContent("2");
      expect(categoryStats).toHaveTextContent("of 3 total");
    });

    it("should calculate filtered tags correctly", () => {
      render(
        <VaultStats
          entries={mockEntries}
          filteredEntries={filteredEntries}
          isFiltered={true}
        />,
      );

      // Filtered entries have 4 unique tags: work, email, personal, important
      const tagStats = screen
        .getByText("Unique Tags")
        .closest("div")?.parentElement;
      expect(tagStats).toHaveTextContent("4");
      expect(tagStats).toHaveTextContent("of 5 total");
    });

    it("should show filtered results message", () => {
      render(
        <VaultStats
          entries={mockEntries}
          filteredEntries={filteredEntries}
          isFiltered={true}
        />,
      );

      expect(screen.getByText("Showing filtered results")).toBeInTheDocument();
      expect(screen.getByText("(2 of 4 entries)")).toBeInTheDocument();
    });

    it("should not show comparison when filtered and total values are the same", () => {
      render(
        <VaultStats
          entries={mockEntries}
          filteredEntries={mockEntries}
          isFiltered={true}
        />,
      );

      // Should not show "of X total" when values are the same
      expect(screen.queryByText("of 4 total")).not.toBeInTheDocument();
      expect(screen.queryByText("of 3 total")).not.toBeInTheDocument();
      expect(screen.queryByText("of 5 total")).not.toBeInTheDocument();
    });
  });

  describe("Real-time Updates", () => {
    it("should update stats when entries prop changes", () => {
      const { rerender } = render(
        <VaultStats
          entries={mockEntries.slice(0, 2)}
          filteredEntries={mockEntries.slice(0, 2)}
          isFiltered={false}
        />,
      );

      const entriesStats =
        screen.getByText("Total Entries").parentElement?.parentElement;
      expect(entriesStats).toHaveTextContent("2");

      // Update with more entries
      rerender(
        <VaultStats
          entries={mockEntries}
          filteredEntries={mockEntries}
          isFiltered={false}
        />,
      );

      const updatedEntriesStats =
        screen.getByText("Total Entries").parentElement?.parentElement;
      expect(updatedEntriesStats).toHaveTextContent("4");
    });

    it("should update filtered stats when filteredEntries prop changes", () => {
      const { rerender } = render(
        <VaultStats
          entries={mockEntries}
          filteredEntries={mockEntries.slice(0, 1)}
          isFiltered={true}
        />,
      );

      const entriesStats =
        screen.getByText("Total Entries").parentElement?.parentElement;
      expect(entriesStats).toHaveTextContent("1");
      expect(screen.getByText("of 4 total")).toBeInTheDocument();

      // Update filtered entries
      rerender(
        <VaultStats
          entries={mockEntries}
          filteredEntries={mockEntries.slice(0, 3)}
          isFiltered={true}
        />,
      );

      const updatedEntriesStats =
        screen.getByText("Total Entries").parentElement?.parentElement;
      expect(updatedEntriesStats).toHaveTextContent("3");
      expect(screen.getByText("of 4 total")).toBeInTheDocument();
    });
  });

  describe("Responsive Design", () => {
    it("should render with responsive grid classes", () => {
      const { container } = render(
        <VaultStats
          entries={mockEntries}
          filteredEntries={mockEntries}
          isFiltered={false}
        />,
      );

      const gridContainer = container.querySelector(".grid");
      expect(gridContainer).toHaveClass(
        "grid-cols-1",
        "sm:grid-cols-3",
        "gap-4",
      );
    });

    it("should render stat cards with proper styling", () => {
      const { container } = render(
        <VaultStats
          entries={mockEntries}
          filteredEntries={mockEntries}
          isFiltered={false}
        />,
      );

      const statCards = container.querySelectorAll(
        ".bg-white.rounded-lg.border",
      );
      expect(statCards).toHaveLength(3);

      statCards.forEach((card) => {
        expect(card).toHaveClass(
          "transition-all",
          "duration-200",
          "hover:shadow-md",
        );
      });
    });
  });

  describe("Accessibility", () => {
    it("should render with proper semantic structure", () => {
      render(
        <VaultStats
          entries={mockEntries}
          filteredEntries={mockEntries}
          isFiltered={false}
        />,
      );

      // Check that stats are properly structured
      expect(screen.getByText("Total Entries")).toBeInTheDocument();
      expect(screen.getByText("Categories")).toBeInTheDocument();
      expect(screen.getByText("Unique Tags")).toBeInTheDocument();
    });

    it("should include icons for visual enhancement", () => {
      const { container } = render(
        <VaultStats
          entries={mockEntries}
          filteredEntries={mockEntries}
          isFiltered={false}
        />,
      );

      const icons = container.querySelectorAll("svg");
      expect(icons).toHaveLength(3); // One icon per stat card
    });
  });

  describe("Edge Cases", () => {
    it("should handle entries with duplicate tags correctly", () => {
      const entriesWithDuplicateTags: VaultEntry[] = [
        {
          id: "entry-1",
          encryptedData: "encrypted-content-1",
          iv: "iv-1",
          algorithm: "AES-256-GCM",
          category: "passwords",
          tags: ["work", "work", "email"], // Duplicate "work" tag
          version: 1,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      render(
        <VaultStats
          entries={entriesWithDuplicateTags}
          filteredEntries={entriesWithDuplicateTags}
          isFiltered={false}
        />,
      );

      // Should count unique tags only (work, email = 2 unique tags)
      const tagStats = screen
        .getByText("Unique Tags")
        .closest("div")?.parentElement;
      expect(tagStats).toHaveTextContent("2");
    });

    it("should handle entries with empty tags array", () => {
      const entriesWithEmptyTags: VaultEntry[] = [
        {
          id: "entry-1",
          encryptedData: "encrypted-content-1",
          iv: "iv-1",
          algorithm: "AES-256-GCM",
          category: "passwords",
          tags: [],
          version: 1,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      render(
        <VaultStats
          entries={entriesWithEmptyTags}
          filteredEntries={entriesWithEmptyTags}
          isFiltered={false}
        />,
      );

      const tagStats = screen
        .getByText("Unique Tags")
        .closest("div")?.parentElement;
      expect(tagStats).toHaveTextContent("0");
    });
  });
});
