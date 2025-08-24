import React, { useState, useEffect } from "react";
import { VaultEntry, VaultEntryData, vaultApi } from "../services/vault";
import { XMarkIcon, EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { encryptData } from "../services/encryption";
import TagManager from "./TagManager";

interface VaultEntryModalProps {
  entry?: VaultEntry | null;
  onClose: () => void;
  onSave: () => void;
  existingTags?: string[];
}

const VaultEntryModal: React.FC<VaultEntryModalProps> = ({
  entry,
  onClose,
  onSave,
  existingTags = [],
}) => {
  const [formData, setFormData] = useState({
    data: "",
    category: "passwords",
    tags: [] as string[],
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState("");

  const categories = [
    { value: "passwords", label: "Passwords" },
    { value: "documents", label: "Documents" },
    { value: "notes", label: "Notes" },
    { value: "keys", label: "Keys" },
    { value: "other", label: "Other" },
  ];

  useEffect(() => {
    if (entry) {
      // For editing, we show placeholder text and require new data input
      setFormData({
        data: "",
        category: entry.category || "passwords",
        tags: entry.tags || [],
      });
    } else {
      // Reset form for new entry
      setFormData({
        data: "",
        category: "passwords",
        tags: [],
      });
    }
    // Clear any previous errors and messages
    setError("");
    setFieldErrors({});
    setSuccessMessage("");
    setPassword("");
  }, [entry]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate data
    if (!formData.data.trim()) {
      errors.data = "Data is required";
    }

    // Validate password for encryption
    if (!password.trim()) {
      errors.password = "Password is required for encryption";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters long";
    }

    // Validate category
    if (!formData.category) {
      errors.category = "Category is required";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous messages
    setError("");
    setSuccessMessage("");

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Encrypt data client-side using proper encryption service
      const encryptionResult = await encryptData(formData.data, password);

      const entryData: VaultEntryData = {
        encryptedData: encryptionResult.encryptedData,
        iv: encryptionResult.iv,
        algorithm: encryptionResult.algorithm,
        category: formData.category,
        tags: formData.tags,
      };

      if (entry) {
        await vaultApi.updateEntry(entry.id, entryData);
        setSuccessMessage("Entry updated successfully!");
      } else {
        await vaultApi.createEntry(entryData);
        setSuccessMessage("Entry created successfully!");
      }

      // Clear sensitive data from memory
      setPassword("");
      setFormData({ ...formData, data: "" });

      // Close modal after short delay to show success message
      setTimeout(() => {
        onSave();
      }, 1500);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to save entry. Please try again.";
      setError(errorMessage);
      console.error("Save error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTagsChange = (newTags: string[]) => {
    setFormData({
      ...formData,
      tags: newTags,
    });
    // Clear tag-related errors when tags are updated
    if (fieldErrors.tags) {
      setFieldErrors({ ...fieldErrors, tags: "" });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    // Clear field-specific errors when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors({ ...fieldErrors, [field]: "" });
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    // Clear password errors when user starts typing
    if (fieldErrors.password) {
      setFieldErrors({ ...fieldErrors, password: "" });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {entry ? "Edit Entry" : "Create New Entry"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-green-800 text-sm">{successMessage}</p>
            </div>
          )}

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Category *
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => handleInputChange("category", e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                fieldErrors.category
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300"
              }`}
              aria-describedby={
                fieldErrors.category ? "category-error" : undefined
              }
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            {fieldErrors.category && (
              <p id="category-error" className="mt-1 text-sm text-red-600">
                {fieldErrors.category}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="data"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Data *
            </label>
            <textarea
              id="data"
              value={formData.data}
              onChange={(e) => handleInputChange("data", e.target.value)}
              rows={8}
              className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                fieldErrors.data
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300"
              }`}
              placeholder={
                entry
                  ? "Enter new data to replace the existing encrypted data..."
                  : "Enter your sensitive data here. It will be encrypted before storage."
              }
              aria-describedby={fieldErrors.data ? "data-error" : "data-help"}
            />
            {fieldErrors.data && (
              <p id="data-error" className="mt-1 text-sm text-red-600">
                {fieldErrors.data}
              </p>
            )}
            <p id="data-help" className="mt-1 text-xs text-gray-500">
              {entry
                ? "For security, existing data cannot be displayed. Enter new data to update this entry."
                : "Your data will be encrypted client-side using AES-256-GCM before being sent to the server."}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <TagManager
              tags={formData.tags}
              onChange={handleTagsChange}
              suggestions={existingTags}
              maxTags={10}
              placeholder="Add a tag..."
              className={fieldErrors.tags ? "border-red-300" : ""}
            />
            {fieldErrors.tags && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.tags}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Encryption Password *
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                className={`w-full px-3 py-2 pr-10 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  fieldErrors.password
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300"
                }`}
                placeholder="Enter your password for encryption"
                aria-describedby={
                  fieldErrors.password ? "password-error" : "password-help"
                }
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5" />
                ) : (
                  <EyeIcon className="h-5 w-5" />
                )}
              </button>
            </div>
            {fieldErrors.password && (
              <p id="password-error" className="mt-1 text-sm text-red-600">
                {fieldErrors.password}
              </p>
            )}
            <p id="password-help" className="mt-1 text-xs text-gray-500">
              This password will be used to encrypt your data. Use a strong
              password for better security.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Saving..." : entry ? "Update Entry" : "Create Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VaultEntryModal;
