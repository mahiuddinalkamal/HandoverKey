import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VaultFilters from "../VaultFilters";

describe("VaultFilters", () => {
  const mockProps = {
    searchTerm: "",
    selectedCategory: "",
    categories: ["passwords", "documents", "notes", "keys", "other"],
    onSearchChange: jest.fn(),
    onCategoryChange: jest.fn(),
    onClearFilters: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders search input with correct placeholder", () => {
      render(<VaultFilters {...mockProps} />);

      const searchInput = screen.getByPlaceholderText(
        "Search entries by ID, category, or tags...",
      );
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute("aria-label", "Search vault entries");
    });

    it("renders category dropdown with all categories", () => {
      render(<VaultFilters {...mockProps} />);

      const categorySelect = screen.getByLabelText("Filter by category");
      expect(categorySelect).toBeInTheDocument();

      // Check that all categories are present
      expect(screen.getByText("All Categories")).toBeInTheDocument();
      expect(screen.getByText("Passwords")).toBeInTheDocument();
      expect(screen.getByText("Documents")).toBeInTheDocument();
      expect(screen.getByText("Notes")).toBeInTheDocument();
      expect(screen.getByText("Keys")).toBeInTheDocument();
      expect(screen.getByText("Other")).toBeInTheDocument();
    });

    it("does not show clear filters button when no filters are active", () => {
      render(<VaultFilters {...mockProps} />);

      expect(screen.queryByText("Clear Filters")).not.toBeInTheDocument();
      expect(screen.queryByText("Active filters:")).not.toBeInTheDocument();
    });

    it("shows clear filters button when filters are active", () => {
      render(<VaultFilters {...mockProps} searchTerm="test" />);

      expect(screen.getByText("Clear Filters")).toBeInTheDocument();
      expect(screen.getByText("Active filters:")).toBeInTheDocument();
    });
  });

  describe("Search Functionality", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it("updates local search term immediately on input", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<VaultFilters {...mockProps} />);

      const searchInput = screen.getByPlaceholderText(
        "Search entries by ID, category, or tags...",
      );

      await user.type(searchInput, "test");

      expect(searchInput).toHaveValue("test");
    });

    it("debounces search term changes", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<VaultFilters {...mockProps} />);

      const searchInput = screen.getByPlaceholderText(
        "Search entries by ID, category, or tags...",
      );

      await user.type(searchInput, "test");

      // Should not call onSearchChange immediately
      expect(mockProps.onSearchChange).not.toHaveBeenCalled();

      // Fast-forward time by 300ms (debounce delay)
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        expect(mockProps.onSearchChange).toHaveBeenCalledWith("test");
      });
    });

    it("cancels previous debounced call when typing continues", async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<VaultFilters {...mockProps} />);

      const searchInput = screen.getByPlaceholderText(
        "Search entries by ID, category, or tags...",
      );

      await user.type(searchInput, "te");
      jest.advanceTimersByTime(200); // Less than debounce delay

      await user.type(searchInput, "st");
      jest.advanceTimersByTime(300); // Complete debounce delay

      await waitFor(() => {
        expect(mockProps.onSearchChange).toHaveBeenCalledTimes(1);
        expect(mockProps.onSearchChange).toHaveBeenCalledWith("test");
      });
    });

    it("syncs local search term with prop changes", () => {
      const { rerender } = render(<VaultFilters {...mockProps} />);

      const searchInput = screen.getByPlaceholderText(
        "Search entries by ID, category, or tags...",
      );
      expect(searchInput).toHaveValue("");

      rerender(<VaultFilters {...mockProps} searchTerm="external update" />);
      expect(searchInput).toHaveValue("external update");
    });
  });

  describe("Category Filtering", () => {
    it("calls onCategoryChange when category is selected", () => {
      render(<VaultFilters {...mockProps} />);

      const categorySelect = screen.getByLabelText("Filter by category");

      fireEvent.change(categorySelect, { target: { value: "passwords" } });

      expect(mockProps.onCategoryChange).toHaveBeenCalledWith("passwords");
    });

    it("displays selected category correctly", () => {
      render(<VaultFilters {...mockProps} selectedCategory="documents" />);

      const categorySelect = screen.getByLabelText(
        "Filter by category",
      ) as HTMLSelectElement;
      expect(categorySelect.value).toBe("documents");
    });
  });

  describe("Clear Filters Functionality", () => {
    it("calls onClearFilters when clear button is clicked", () => {
      render(<VaultFilters {...mockProps} searchTerm="test" />);

      const clearButton = screen.getByLabelText("Clear all filters");
      fireEvent.click(clearButton);

      expect(mockProps.onClearFilters).toHaveBeenCalled();
    });

    it("shows individual filter clear buttons in active filters display", () => {
      render(
        <VaultFilters
          {...mockProps}
          searchTerm="test"
          selectedCategory="passwords"
        />,
      );

      expect(screen.getByText('Search: "test"')).toBeInTheDocument();
      expect(screen.getByText("Category: Passwords")).toBeInTheDocument();

      const clearSearchButton = screen.getByLabelText("Clear search filter");
      const clearCategoryButton = screen.getByLabelText(
        "Clear category filter",
      );

      expect(clearSearchButton).toBeInTheDocument();
      expect(clearCategoryButton).toBeInTheDocument();
    });

    it("calls onSearchChange with empty string when search filter is cleared", () => {
      render(<VaultFilters {...mockProps} searchTerm="test" />);

      const clearSearchButton = screen.getByLabelText("Clear search filter");
      fireEvent.click(clearSearchButton);

      expect(mockProps.onSearchChange).toHaveBeenCalledWith("");
    });

    it("calls onCategoryChange with empty string when category filter is cleared", () => {
      render(<VaultFilters {...mockProps} selectedCategory="passwords" />);

      const clearCategoryButton = screen.getByLabelText(
        "Clear category filter",
      );
      fireEvent.click(clearCategoryButton);

      expect(mockProps.onCategoryChange).toHaveBeenCalledWith("");
    });
  });

  describe("Responsive Design", () => {
    it("shows abbreviated text on mobile screens", () => {
      render(<VaultFilters {...mockProps} searchTerm="test" />);

      // Check that both full and abbreviated versions exist
      const fullText = screen.getByText("Clear Filters");
      const shortText = screen.getByText("Clear");

      expect(fullText).toHaveClass("hidden", "sm:inline");
      expect(shortText).toHaveClass("sm:hidden");
    });

    it("applies responsive classes to layout elements", () => {
      render(<VaultFilters {...mockProps} />);

      const container = screen
        .getByPlaceholderText("Search entries by ID, category, or tags...")
        .closest(".flex");
      expect(container).toHaveClass("flex-col", "sm:flex-row");
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels for all interactive elements", () => {
      render(
        <VaultFilters
          {...mockProps}
          searchTerm="test"
          selectedCategory="passwords"
        />,
      );

      expect(screen.getByLabelText("Search vault entries")).toBeInTheDocument();
      expect(screen.getByLabelText("Filter by category")).toBeInTheDocument();
      expect(screen.getByLabelText("Clear all filters")).toBeInTheDocument();
      expect(screen.getByLabelText("Clear search filter")).toBeInTheDocument();
      expect(
        screen.getByLabelText("Clear category filter"),
      ).toBeInTheDocument();
    });

    it("maintains focus management for keyboard navigation", () => {
      render(<VaultFilters {...mockProps} />);

      const searchInput = screen.getByLabelText("Search vault entries");
      const categorySelect = screen.getByLabelText("Filter by category");

      // Focus should be manageable
      searchInput.focus();
      expect(searchInput).toHaveFocus();

      categorySelect.focus();
      expect(categorySelect).toHaveFocus();
    });
  });

  describe("State Management", () => {
    it("handles multiple rapid state changes correctly", () => {
      jest.useFakeTimers();

      render(<VaultFilters {...mockProps} />);

      const searchInput = screen.getByPlaceholderText(
        "Search entries by ID, category, or tags...",
      );

      // Rapid typing simulation
      fireEvent.change(searchInput, { target: { value: "a" } });
      fireEvent.change(searchInput, { target: { value: "ab" } });
      fireEvent.change(searchInput, { target: { value: "abc" } });

      jest.advanceTimersByTime(300);

      expect(mockProps.onSearchChange).toHaveBeenCalledTimes(1);
      expect(mockProps.onSearchChange).toHaveBeenCalledWith("abc");

      jest.useRealTimers();
    });

    it("handles empty categories array gracefully", () => {
      render(<VaultFilters {...mockProps} categories={[]} />);

      const categorySelect = screen.getByLabelText("Filter by category");
      expect(categorySelect).toBeInTheDocument();
      expect(screen.getByText("All Categories")).toBeInTheDocument();
    });
  });
});
