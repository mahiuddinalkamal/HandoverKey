import React from "react";
import { VaultEntry } from "../services/vault";

interface VaultStatsProps {
  entries: VaultEntry[];
  filteredEntries: VaultEntry[];
  isFiltered: boolean;
}

interface StatCardProps {
  title: string;
  value: number;
  filteredValue?: number;
  isFiltered: boolean;
  icon?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  filteredValue,
  isFiltered,
  icon,
}) => {
  const displayValue =
    isFiltered && filteredValue !== undefined ? filteredValue : value;
  const showComparison =
    isFiltered && filteredValue !== undefined && filteredValue !== value;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 transition-all duration-200 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {icon && <div className="text-gray-400">{icon}</div>}
            <div className="text-2xl font-bold text-gray-900">
              {displayValue}
            </div>
          </div>
          <div className="text-sm text-gray-600">{title}</div>
          {showComparison && (
            <div className="text-xs text-gray-500 mt-1">of {value} total</div>
          )}
        </div>
      </div>
    </div>
  );
};

const VaultStats: React.FC<VaultStatsProps> = ({
  entries,
  filteredEntries,
  isFiltered,
}) => {
  // Calculate total stats
  const totalEntries = entries.length;
  const totalCategories = new Set(
    entries.map((entry) => entry.category).filter(Boolean),
  ).size;
  const totalTags = new Set(entries.flatMap((entry) => entry.tags || [])).size;

  // Calculate filtered stats
  const filteredEntriesCount = filteredEntries.length;
  const filteredCategories = new Set(
    filteredEntries.map((entry) => entry.category).filter(Boolean),
  ).size;
  const filteredTags = new Set(
    filteredEntries.flatMap((entry) => entry.tags || []),
  ).size;

  return (
    <div className="mt-6 mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Entries"
          value={totalEntries}
          filteredValue={filteredEntriesCount}
          isFiltered={isFiltered}
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        />
        <StatCard
          title="Categories"
          value={totalCategories}
          filteredValue={filteredCategories}
          isFiltered={isFiltered}
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          }
        />
        <StatCard
          title="Unique Tags"
          value={totalTags}
          filteredValue={filteredTags}
          isFiltered={isFiltered}
          icon={
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          }
        />
      </div>

      {isFiltered && (
        <div className="mt-3 text-center">
          <p className="text-sm text-gray-600">
            Showing filtered results
            {filteredEntriesCount !== totalEntries && (
              <span className="ml-1 text-blue-600 font-medium">
                ({filteredEntriesCount} of {totalEntries} entries)
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default VaultStats;
