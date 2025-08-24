import React, { useState, useRef, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface TagManagerProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  maxTags?: number;
  placeholder?: string;
  className?: string;
}

const TagManager: React.FC<TagManagerProps> = ({
  tags,
  onChange,
  suggestions = [],
  maxTags,
  placeholder = "Add a tag...",
  className = "",
}) => {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input and exclude already selected tags
  const filteredSuggestions = suggestions
    .filter(
      (suggestion) =>
        suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
        !tags.includes(suggestion),
    )
    .slice(0, 10); // Limit to 10 suggestions for performance

  // Reset suggestion selection when filtered suggestions change
  useEffect(() => {
    setSelectedSuggestionIndex(-1);
  }, [filteredSuggestions.length]);

  const addTag = (tagToAdd: string) => {
    const trimmedTag = tagToAdd.trim();

    // Validate tag
    if (!trimmedTag) return;
    if (tags.includes(trimmedTag)) return; // Prevent duplicates
    if (maxTags && tags.length >= maxTags) return; // Respect max tags limit

    // Add tag and clear input
    onChange([...tags, trimmedTag]);
    setInputValue("");
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowSuggestions(value.length > 0 && filteredSuggestions.length > 0);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "Enter":
        e.preventDefault();
        if (
          selectedSuggestionIndex >= 0 &&
          filteredSuggestions[selectedSuggestionIndex]
        ) {
          addTag(filteredSuggestions[selectedSuggestionIndex]);
        } else if (inputValue.trim()) {
          addTag(inputValue);
        }
        break;

      case "ArrowDown":
        e.preventDefault();
        if (showSuggestions && filteredSuggestions.length > 0) {
          setSelectedSuggestionIndex((prev) =>
            prev < filteredSuggestions.length - 1 ? prev + 1 : 0,
          );
        }
        break;

      case "ArrowUp":
        e.preventDefault();
        if (showSuggestions && filteredSuggestions.length > 0) {
          setSelectedSuggestionIndex((prev) =>
            prev > 0 ? prev - 1 : filteredSuggestions.length - 1,
          );
        }
        break;

      case "Escape":
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;

      case "Backspace":
        // Remove last tag if input is empty
        if (!inputValue && tags.length > 0) {
          removeTag(tags[tags.length - 1]);
        }
        break;
    }
  };

  const handleInputFocus = () => {
    if (inputValue && filteredSuggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for suggestion clicks
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }, 150);
  };

  const handleSuggestionClick = (suggestion: string) => {
    addTag(suggestion);
    inputRef.current?.focus();
  };

  const handleAddButtonClick = () => {
    if (inputValue.trim()) {
      addTag(inputValue);
    }
  };

  const isMaxTagsReached = maxTags && tags.length >= maxTags;

  return (
    <div className={`relative ${className}`}>
      {/* Tags Display */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-2 text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-full"
                aria-label={`Remove tag: ${tag}`}
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input and Add Button */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder={
              isMaxTagsReached ? `Maximum ${maxTags} tags reached` : placeholder
            }
            disabled={!!isMaxTagsReached}
            aria-label="Tag input"
            aria-describedby="tag-help"
          />

          {/* Suggestions Dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto"
              role="listbox"
              aria-label="Tag suggestions"
            >
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
                    index === selectedSuggestionIndex
                      ? "bg-blue-50 text-blue-900"
                      : ""
                  }`}
                  role="option"
                  aria-selected={index === selectedSuggestionIndex}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleAddButtonClick}
          disabled={!inputValue.trim() || !!isMaxTagsReached}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
          aria-label="Add tag"
        >
          Add
        </button>
      </div>

      {/* Help Text */}
      <p id="tag-help" className="mt-1 text-xs text-gray-500">
        {maxTags && (
          <>
            {tags.length}/{maxTags} tags used.{" "}
          </>
        )}
        Press Enter to add, click × to remove, or use arrow keys to navigate
        suggestions.
      </p>
    </div>
  );
};

export default TagManager;
