import React, { useState, useEffect, useCallback } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface VaultFiltersProps {
  searchTerm: string;
  selectedCategory: string;
  categories: string[];
  onSearchChange: (term: string) => void;
  onCategoryChange: (category: string) => void;
  onClearFilters: () => void;
}

const VaultFilters: React.FC<VaultFiltersProps> = ({
  searchTerm,
  selectedCategory,
  categories,
  onSearchChange,
  onCategoryChange,
  onClearFilters,
}) => {
  const [localSearchTerm, setLocalSearchTerm] = useState(searchTerm);

  // Debounced search implementation
  const debounceSearch = useCallback(
    (term: string) => {
      const timeoutId = setTimeout(() => {
        onSearchChange(term);
      }, 300); // 300ms debounce delay

      return () => clearTimeout(timeoutId);
    },
    [onSearchChange],
  );

  useEffect(() => {
    const cleanup = debounceSearch(localSearchTerm);
    return cleanup;
  }, [localSearchTerm, debounceSearch]);

  // Sync local state with prop changes
  useEffect(() => {
    setLocalSearchTerm(searchTerm);
  }, [searchTerm]);

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearchTerm(e.target.value);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onCategoryChange(e.target.value);
  };

  const hasActiveFilters = searchTerm || selectedCategory;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search entries by ID, category, or tags..."
            value={localSearchTerm}
            onChange={handleSearchInputChange}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
            aria-label="Search vault entries"
          />
        </div>

        {/* Category Filter */}
        <div className="sm:w-48">
          <select
            value={selectedCategory}
            onChange={handleCategoryChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 border border-gray-300 rounded-md transition-colors duration-200 whitespace-nowrap"
            aria-label="Clear all filters"
          >
            <XMarkIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Clear Filters</span>
            <span className="sm:hidden">Clear</span>
          </button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-600 font-medium">
              Active filters:
            </span>
            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Search: &quot;{searchTerm}&quot;
                <button
                  onClick={() => onSearchChange("")}
                  className="ml-1 hover:text-blue-900"
                  aria-label="Clear search filter"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedCategory && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Category:{" "}
                {selectedCategory.charAt(0).toUpperCase() +
                  selectedCategory.slice(1)}
                <button
                  onClick={() => onCategoryChange("")}
                  className="ml-1 hover:text-green-900"
                  aria-label="Clear category filter"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VaultFilters;
