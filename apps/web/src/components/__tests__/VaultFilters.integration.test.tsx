import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import VaultFilters from "../VaultFilters";

// Integration test to verify VaultFilters works correctly with parent components
describe("VaultFilters Integration", () => {
  it("integrates correctly with parent component state management", async () => {
    let searchTerm = "";
    let selectedCategory = "";

    const handleSearchChange = (term: string) => {
      searchTerm = term;
    };

    const handleCategoryChange = (category: string) => {
      selectedCategory = category;
    };

    const handleClearFilters = () => {
      searchTerm = "";
      selectedCategory = "";
    };

    const categories = ["passwords", "documents", "notes"];

    const { rerender } = render(
      <VaultFilters
        searchTerm={searchTerm}
        selectedCategory={selectedCategory}
        categories={categories}
        onSearchChange={handleSearchChange}
        onCategoryChange={handleCategoryChange}
        onClearFilters={handleClearFilters}
      />,
    );

    // Test search functionality
    const searchInput = screen.getByPlaceholderText(
      "Search entries by ID, category, or tags...",
    );
    fireEvent.change(searchInput, { target: { value: "test search" } });

    // Wait for debounce
    await waitFor(
      () => {
        expect(searchTerm).toBe("test search");
      },
      { timeout: 500 },
    );

    // Re-render with updated state
    rerender(
      <VaultFilters
        searchTerm={searchTerm}
        selectedCategory={selectedCategory}
        categories={categories}
        onSearchChange={handleSearchChange}
        onCategoryChange={handleCategoryChange}
        onClearFilters={handleClearFilters}
      />,
    );

    // Verify search term is displayed
    expect(searchInput).toHaveValue("test search");
    expect(screen.getByText('Search: "test search"')).toBeInTheDocument();

    // Test category selection
    const categorySelect = screen.getByLabelText("Filter by category");
    fireEvent.change(categorySelect, { target: { value: "passwords" } });

    expect(selectedCategory).toBe("passwords");

    // Re-render with updated state
    rerender(
      <VaultFilters
        searchTerm={searchTerm}
        selectedCategory={selectedCategory}
        categories={categories}
        onSearchChange={handleSearchChange}
        onCategoryChange={handleCategoryChange}
        onClearFilters={handleClearFilters}
      />,
    );

    // Verify both filters are active
    expect(screen.getByText('Search: "test search"')).toBeInTheDocument();
    expect(screen.getByText("Category: Passwords")).toBeInTheDocument();

    // Test clear all filters
    const clearAllButton = screen.getByLabelText("Clear all filters");
    fireEvent.click(clearAllButton);

    expect(searchTerm).toBe("");
    expect(selectedCategory).toBe("");
  });

  it("handles rapid state changes without conflicts", async () => {
    jest.useFakeTimers();

    let searchTerm = "";
    const handleSearchChange = (term: string) => {
      searchTerm = term;
    };

    const { rerender } = render(
      <VaultFilters
        searchTerm={searchTerm}
        selectedCategory=""
        categories={["passwords"]}
        onSearchChange={handleSearchChange}
        onCategoryChange={() => {}}
        onClearFilters={() => {}}
      />,
    );

    const searchInput = screen.getByPlaceholderText(
      "Search entries by ID, category, or tags...",
    );

    // Simulate rapid typing
    fireEvent.change(searchInput, { target: { value: "a" } });
    fireEvent.change(searchInput, { target: { value: "ab" } });
    fireEvent.change(searchInput, { target: { value: "abc" } });

    // Fast-forward through debounce period
    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(searchTerm).toBe("abc");
    });

    // Update component with new search term
    rerender(
      <VaultFilters
        searchTerm={searchTerm}
        selectedCategory=""
        categories={["passwords"]}
        onSearchChange={handleSearchChange}
        onCategoryChange={() => {}}
        onClearFilters={() => {}}
      />,
    );

    expect(searchInput).toHaveValue("abc");

    jest.useRealTimers();
  });

  it("maintains accessibility during state changes", () => {
    const mockProps = {
      searchTerm: "test",
      selectedCategory: "passwords",
      categories: ["passwords", "documents"],
      onSearchChange: jest.fn(),
      onCategoryChange: jest.fn(),
      onClearFilters: jest.fn(),
    };

    render(<VaultFilters {...mockProps} />);

    // Verify all accessibility features are present
    expect(screen.getByLabelText("Search vault entries")).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by category")).toBeInTheDocument();
    expect(screen.getByLabelText("Clear all filters")).toBeInTheDocument();
    expect(screen.getByLabelText("Clear search filter")).toBeInTheDocument();
    expect(screen.getByLabelText("Clear category filter")).toBeInTheDocument();

    // Verify ARIA labels are maintained during interactions
    const searchInput = screen.getByLabelText("Search vault entries");
    const categorySelect = screen.getByLabelText("Filter by category");

    expect(searchInput).toHaveAttribute("aria-label", "Search vault entries");
    expect(categorySelect).toHaveAttribute("aria-label", "Filter by category");
  });
});
