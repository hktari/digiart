import type { FilterType, Lead, SortType, Stats } from "./types";

const API_BASE = "/api";

export const api = {
  async getStats(): Promise<Stats> {
    const response = await fetch(`${API_BASE}/stats`);
    if (!response.ok) throw new Error("Failed to fetch stats");
    return response.json();
  },

  async getLeads(
    filter: FilterType = "not-contacted",
    sort: SortType = "score",
    limit = 50,
  ): Promise<{ leads: Lead[]; total: number }> {
    const response = await fetch(
      `${API_BASE}/leads?filter=${filter}&sort=${sort}&limit=${limit}`,
    );
    if (!response.ok) throw new Error("Failed to fetch leads");
    return response.json();
  },

  async markAsContacted(leadId: string, notes?: string): Promise<void> {
    const response = await fetch(`${API_BASE}/leads/${leadId}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    if (!response.ok) throw new Error("Failed to mark as contacted");
  },

  async markAsIrrelevant(leadId: string, reason?: string): Promise<void> {
    const response = await fetch(`${API_BASE}/leads/${leadId}/irrelevant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) throw new Error("Failed to mark as irrelevant");
  },

  async unmarkAsIrrelevant(leadId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/leads/${leadId}/irrelevant`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to unmark as irrelevant");
  },

  async draftOutreach(
    leadId: string,
  ): Promise<{ draft: string; leadId: string }> {
    const response = await fetch(`${API_BASE}/leads/${leadId}/draft-outreach`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to draft outreach");
    return response.json();
  },
};
