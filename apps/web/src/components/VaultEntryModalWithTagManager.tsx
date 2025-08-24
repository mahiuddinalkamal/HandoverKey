import React, { useState, useEffect } from "react";
import { VaultEntry, VaultEntryData, vaultApi } from "../services/vault";
import { XMarkIcon } from "@heroicons/react/24/outline";
import TagManager from "./TagManager";
import { encryptData } from "../services/encryption";

interface VaultEntryModalProps {
  entry?: VaultEntry | null;
  onClose: () => void;
  onSave: () => void;
  existingTags?: string[]; // For autocomplete suggestions
}

const VaultEntryModalWithTagManager: React.FC<VaultEntryModalProps> = ({
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const categories = [
    { value: "passwords", label: "Passwords" },
    { value: "documents", label: "Documents" },
    { value: "notes", label: "Notes" },
    { value: "keys", label: "Keys" },
    { value: "other", label: "Other" },
  ];

  useEffect(() => {
    if (entry) {
      // For editing, we would need to decrypt the data first
      // This is a simplified version - in reality, you'd decrypt client-side
      setFormData({
        data: "[Encrypted Data - Enter new data to replace]",
        category: entry.category || "passwords",
        tags: entry.tags || [],
      });
    }
  }, [entry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.data.trim()) {
      setError("Data is required");
      return;
    }

    if (!password.trim()) {
      setError("Password is required for encryption");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Use proper AES-256-GCM encryption with PBKDF2 key derivation
      const encryptionResult = await encryptData(formData.data, password);

      const entryData: VaultEntryData = {
        encryptedData: encryptionResult.encryptedData,
        iv: encryptionResult.iv,
        salt: encryptionResult.salt,
        algorithm: encryptionResult.algorithm,
        category: formData.category,
        tags: formData.tags,
      };

      if (entry) {
        await vaultApi.updateEntry(entry.id, entryData);
      } else {
        await vaultApi.createEntry(entryData);
      }

      // Clear sensitive data from memory
      setPassword("");
      setFormData({ ...formData, data: "" });

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry. Please try again.");
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Encryption Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter password for encryption"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              This password will be used to encrypt your data with AES-256-GCM encryption.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data
            </label>
            <textarea
              value={formData.data}
              onChange={(e) =>
                setFormData({ ...formData, data: e.target.value })
              }
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your sensitive data here. It will be encrypted before storage."
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Your data will be encrypted client-side with AES-256-GCM before being sent to the server.
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
              placeholder="Add tags to organize your entry..."
            />
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

export default VaultEntryModalWithTagManager;
