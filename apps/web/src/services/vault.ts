import api from "./api";

export interface VaultEntryData {
  encryptedData: string;
  iv: string;
  algorithm: string;
  category?: string;
  tags?: string[];
}

export interface VaultEntry extends VaultEntryData {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export const vaultApi = {
  createEntry: async (entry: VaultEntryData) => {
    const response = await api.post("/api/v1/vault/entries", entry);
    return response.data;
  },

  getEntries: async (filters?: {
    category?: string;
    tag?: string;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.category) params.append("category", filters.category);
    if (filters?.tag) params.append("tag", filters.tag);
    if (filters?.search) params.append("search", filters.search);

    const response = await api.get(
      `/api/v1/vault/entries?${params.toString()}`,
    );
    return response.data as VaultEntry[];
  },

  getEntry: async (id: string) => {
    const response = await api.get(`/api/v1/vault/entries/${id}`);
    return response.data as VaultEntry;
  },

  updateEntry: async (id: string, entry: VaultEntryData) => {
    const response = await api.put(`/api/v1/vault/entries/${id}`, entry);
    return response.data;
  },

  deleteEntry: async (id: string) => {
    const response = await api.delete(`/api/v1/vault/entries/${id}`);
    return response.data;
  },
};
