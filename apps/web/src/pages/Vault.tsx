import React, { useState, useEffect } from "react";
import { vaultApi, VaultEntry } from "../services/vault";
import VaultEntryCard from "../components/VaultEntryCard";
import VaultEntryModal from "../components/VaultEntryModal";
import VaultFilters from "../components/VaultFilters";
import VaultStats from "../components/VaultStats";
import { PlusIcon } from "@heroicons/react/24/outline";

const Vault: React.FC = () => {
  const [entries, setEntries] = useState<VaultEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<VaultEntry | null>(null);

  const categories = ["passwords", "documents", "notes", "keys", "other"];

  useEffect(() => {
    loadEntries();
  }, [selectedCategory, searchTerm]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const filters = {
        ...(selectedCategory && { category: selectedCategory }),
        ...(searchTerm && { search: searchTerm }),
      };
      const data = await vaultApi.getEntries(filters);
      setEntries(data);
    } catch (error) {
      console.error("Failed to load vault entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEntry = () => {
    setEditingEntry(null);
    setIsModalOpen(true);
  };

  const handleEditEntry = (entry: VaultEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleDeleteEntry = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this entry?")) {
      try {
        await vaultApi.deleteEntry(id);
        await loadEntries();
      } catch (error) {
        console.error("Failed to delete entry:", error);
      }
    }
  };

  const handleTagClick = (tag: string) => {
    setSearchTerm(tag);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
    loadEntries();
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
  };

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      !searchTerm ||
      entry.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.tags?.some((tag) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase()),
      );

    const matchesCategory =
      !selectedCategory || entry.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vault</h1>
            <p className="mt-2 text-gray-600">
              Manage your encrypted digital assets
            </p>
          </div>
          <button
            onClick={handleCreateEntry}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Add Entry
          </button>
        </div>

        {/* Search and Filters */}
        <VaultFilters
          searchTerm={searchTerm}
          selectedCategory={selectedCategory}
          categories={categories}
          onSearchChange={setSearchTerm}
          onCategoryChange={setSelectedCategory}
          onClearFilters={handleClearFilters}
        />

        {/* Stats */}
        <VaultStats
          entries={entries}
          filteredEntries={filteredEntries}
          isFiltered={!!(searchTerm || selectedCategory)}
        />

        {/* Entries Grid */}
        <div className="mt-8">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">No entries found</div>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedCategory
                  ? "Try adjusting your search or filters"
                  : "Create your first vault entry to get started"}
              </p>
              {!searchTerm && !selectedCategory && (
                <button onClick={handleCreateEntry} className="btn-primary">
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Your First Entry
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEntries.map((entry) => (
                <VaultEntryCard
                  key={entry.id}
                  entry={entry}
                  onEdit={handleEditEntry}
                  onDelete={handleDeleteEntry}
                  onTagClick={handleTagClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <VaultEntryModal
          entry={editingEntry}
          onClose={handleModalClose}
          onSave={handleModalClose}
        />
      )}
    </div>
  );
};

export default Vault;
