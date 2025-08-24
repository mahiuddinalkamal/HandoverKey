import React from "react";
import { VaultEntry } from "../services/vault";
import {
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  KeyIcon,
  LockClosedIcon,
  TagIcon,
  ClipboardDocumentListIcon,
  EllipsisHorizontalIcon,
} from "@heroicons/react/24/outline";

interface VaultEntryCardProps {
  entry: VaultEntry;
  onEdit: (entry: VaultEntry) => void;
  onDelete: (id: string) => void;
  onTagClick?: (tag: string) => void;
}

const VaultEntryCard: React.FC<VaultEntryCardProps> = ({
  entry,
  onEdit,
  onDelete,
  onTagClick,
}) => {
  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case "passwords":
        return <KeyIcon className="h-5 w-5" />;
      case "documents":
        return <DocumentTextIcon className="h-5 w-5" />;
      case "notes":
        return <ClipboardDocumentListIcon className="h-5 w-5" />;
      case "keys":
        return <LockClosedIcon className="h-5 w-5" />;
      case "other":
        return <EllipsisHorizontalIcon className="h-5 w-5" />;
      default:
        return <DocumentTextIcon className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case "passwords":
        return "bg-red-50 text-red-700 border-red-200";
      case "documents":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "notes":
        return "bg-green-50 text-green-700 border-green-200";
      case "keys":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "other":
        return "bg-orange-50 text-orange-700 border-orange-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const handleTagClick = (tag: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (onTagClick) {
      onTagClick(tag);
    }
  };

  return (
    <div className="group bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-gray-300 transition-all duration-200 transform hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg border transition-colors duration-200 ${getCategoryColor(entry.category)}`}
          >
            {getCategoryIcon(entry.category)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors duration-200">
              {entry.category
                ? entry.category.charAt(0).toUpperCase() +
                  entry.category.slice(1)
                : "Untitled"}
            </h3>
            <p className="text-sm text-gray-500 font-mono">
              ID: {entry.id.slice(0, 8)}...
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(entry);
            }}
            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
            title="Edit entry"
            aria-label="Edit entry"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(entry.id);
            }}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
            title="Delete entry"
            aria-label="Delete entry"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span className="font-medium">Version {entry.version}</span>
          <span>{new Date(entry.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>

      {entry.tags && entry.tags.length > 0 && (
        <div className="mt-4 flex items-start gap-2">
          <TagIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="flex flex-wrap gap-1.5">
            {entry.tags.slice(0, 3).map((tag, index) => (
              <button
                key={index}
                onClick={(e) => handleTagClick(tag, e)}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors duration-200 cursor-pointer"
                title={`Filter by tag: ${tag}`}
                aria-label={`Filter by tag: ${tag}`}
              >
                {tag}
              </button>
            ))}
            {entry.tags.length > 3 && (
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                title={`Additional tags: ${entry.tags.slice(3).join(", ")}`}
              >
                +{entry.tags.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <LockClosedIcon className="h-3 w-3" />
            {entry.algorithm}
          </span>
          <span>Created {new Date(entry.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};

export default VaultEntryCard;
