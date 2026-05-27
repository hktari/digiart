import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { FilterBar } from "./components/FilterBar";
import { LeadCard } from "./components/LeadCard";
import { Modal } from "./components/Modal";
import { StatsGrid } from "./components/StatsGrid";
import type { FilterType, Lead, SortType, Stats } from "./types";

function App() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [currentFilter, setCurrentFilter] =
    useState<FilterType>("not-contacted");
  const [currentSort, setCurrentSort] = useState<SortType>("score");

  // Modal states
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [irrelevantModalOpen, setIrrelevantModalOpen] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [outreachModalOpen, setOutreachModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [contactNotes, setContactNotes] = useState("");
  const [irrelevantReason, setIrrelevantReason] = useState("");
  const [archiveReason, setArchiveReason] = useState("");
  const [outreachDraft, setOutreachDraft] = useState("");
  const [isDraftingOutreach, setIsDraftingOutreach] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      const data = await api.getStats();
      setStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // Load leads
  const loadLeads = useCallback(async () => {
    try {
      setIsLoadingLeads(true);
      const data = await api.getLeads(currentFilter, currentSort, 50);
      setLeads(data.leads);
    } catch (error) {
      console.error("Error loading leads:", error);
    } finally {
      setIsLoadingLeads(false);
    }
  }, [currentFilter, currentSort]);

  // Initial load
  useEffect(() => {
    loadStats();
    loadLeads();
  }, [loadStats, loadLeads]);

  // Auto-refresh stats every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [loadStats]);

  // Handle filter change
  const handleFilterChange = (filter: FilterType) => {
    setCurrentFilter(filter);
  };

  // Handle sort change
  const handleSortChange = (sort: SortType) => {
    setCurrentSort(sort);
  };

  // Handle mark as contacted
  const handleMarkContacted = (leadId: string) => {
    setSelectedLeadId(leadId);
    setContactNotes("");
    setContactModalOpen(true);
  };

  const confirmMarkContacted = async () => {
    if (!selectedLeadId) return;
    try {
      await api.markAsContacted(selectedLeadId, contactNotes);
      // Remove lead from list immediately
      setLeads((prevLeads) => prevLeads.filter((l) => l.id !== selectedLeadId));
      setContactModalOpen(false);
      setSelectedLeadId(null);
      setContactNotes("");
      // Update stats in background
      loadStats();
    } catch (error) {
      console.error("Error marking as contacted:", error);
      alert("Failed to mark lead as contacted");
    }
  };

  // Handle mark as irrelevant
  const handleMarkIrrelevant = (leadId: string) => {
    setSelectedLeadId(leadId);
    setIrrelevantReason("");
    setIrrelevantModalOpen(true);
  };

  const confirmMarkIrrelevant = async () => {
    if (!selectedLeadId) return;
    try {
      await api.markAsIrrelevant(selectedLeadId, irrelevantReason);
      // Remove lead from list immediately
      setLeads((prevLeads) => prevLeads.filter((l) => l.id !== selectedLeadId));
      setIrrelevantModalOpen(false);
      setSelectedLeadId(null);
      setIrrelevantReason("");
      // Update stats in background
      loadStats();
    } catch (error) {
      console.error("Error marking as irrelevant:", error);
      alert("Failed to mark lead as irrelevant");
    }
  };

  // Handle archive
  const handleArchiveLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    setArchiveReason("");
    setArchiveModalOpen(true);
  };

  const confirmArchiveLead = async () => {
    if (!selectedLeadId) return;
    try {
      await api.archiveLead(selectedLeadId, archiveReason);
      setLeads((prevLeads) => prevLeads.filter((l) => l.id !== selectedLeadId));
      setArchiveModalOpen(false);
      setSelectedLeadId(null);
      setArchiveReason("");
      loadStats();
    } catch (error) {
      console.error("Error archiving lead:", error);
      alert("Failed to archive lead");
    }
  };

  const handleUnarchiveLead = async (leadId: string) => {
    try {
      await api.unarchiveLead(leadId);
      setLeads((prevLeads) => prevLeads.filter((l) => l.id !== leadId));
      loadStats();
    } catch (error) {
      console.error("Error unarchiving lead:", error);
      alert("Failed to unarchive lead");
    }
  };

  // Handle draft outreach
  const handleDraftOutreach = async (leadId: string) => {
    setIsDraftingOutreach(true);
    setOutreachModalOpen(true);
    setOutreachDraft("");
    setCopySuccess(false);
    try {
      const result = await api.draftOutreach(leadId);
      setOutreachDraft(result.draft);
    } catch (error) {
      console.error("Error drafting outreach:", error);
      setOutreachDraft("Failed to generate draft. Please try again.");
    } finally {
      setIsDraftingOutreach(false);
    }
  };

  const handleCopyDraft = async () => {
    try {
      await navigator.clipboard.writeText(outreachDraft);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // fallback: select text
    }
  };

  // Handle unmark as irrelevant
  const handleUnmarkIrrelevant = async (leadId: string) => {
    try {
      await api.unmarkAsIrrelevant(leadId);
      // Remove lead from list immediately (it will move to a different filter)
      setLeads((prevLeads) => prevLeads.filter((l) => l.id !== leadId));
      // Update stats in background
      loadStats();
    } catch (error) {
      console.error("Error unmarking as irrelevant:", error);
      alert("Failed to unmark lead");
    }
  };

  return (
    <div className="min-h-screen bg-twitter-bg text-twitter-text">
      {/* Header */}
      <header className="bg-twitter-card border-b border-twitter-border sticky top-0 z-40 backdrop-blur-sm bg-twitter-card/80">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold text-twitter-primary"
          >
            🎯 Lead Browser
          </motion.h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <StatsGrid stats={stats} isLoading={isLoadingStats} />

        {/* Filters */}
        <FilterBar
          currentFilter={currentFilter}
          currentSort={currentSort}
          onFilterChange={handleFilterChange}
          onSortChange={handleSortChange}
        />

        {/* Leads */}
        <div>
          {isLoadingLeads ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-twitter-primary border-t-transparent"></div>
              <p className="mt-4 text-twitter-muted">Loading leads...</p>
            </div>
          ) : leads.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <h3 className="text-xl font-semibold text-twitter-text mb-2">
                No leads found
              </h3>
              <p className="text-twitter-muted">Try changing your filters</p>
            </motion.div>
          ) : (
            <div className="grid gap-5">
              <AnimatePresence mode="popLayout">
                {leads.map((lead: Lead, index: number) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    index={index}
                    onMarkContacted={handleMarkContacted}
                    onMarkIrrelevant={handleMarkIrrelevant}
                    onUnmarkIrrelevant={handleUnmarkIrrelevant}
                    onDraftOutreach={handleDraftOutreach}
                    onArchiveLead={handleArchiveLead}
                    onUnarchiveLead={handleUnarchiveLead}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>

      {/* Contact Modal */}
      <Modal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        title="Mark as Contacted"
        footer={
          <>
            <button
              onClick={() => setContactModalOpen(false)}
              className="px-4 py-2 bg-twitter-secondary text-twitter-text border border-twitter-border rounded-full text-sm font-semibold hover:bg-twitter-hover transition-all"
            >
              Cancel
            </button>
            <button
              onClick={confirmMarkContacted}
              className="px-4 py-2 bg-twitter-success/10 text-twitter-success border border-twitter-success rounded-full text-sm font-semibold hover:bg-twitter-success/20 transition-all"
            >
              Mark Contacted
            </button>
          </>
        }
      >
        <label className="block text-sm text-twitter-muted mb-2">
          Notes (optional):
        </label>
        <textarea
          value={contactNotes}
          onChange={(e) => setContactNotes(e.target.value)}
          placeholder="Add any notes about the outreach..."
          className="w-full px-4 py-3 bg-twitter-secondary border border-twitter-border rounded-lg text-twitter-text placeholder-twitter-muted focus:outline-none focus:border-twitter-primary resize-none"
          rows={4}
        />
      </Modal>

      {/* Draft Outreach Modal */}
      <Modal
        isOpen={outreachModalOpen}
        onClose={() => setOutreachModalOpen(false)}
        title="Draft Outreach"
        footer={
          <>
            <button
              onClick={() => setOutreachModalOpen(false)}
              className="px-4 py-2 bg-twitter-secondary text-twitter-text border border-twitter-border rounded-full text-sm font-semibold hover:bg-twitter-hover transition-all"
            >
              Close
            </button>
            <button
              onClick={handleCopyDraft}
              disabled={isDraftingOutreach || !outreachDraft}
              className="px-4 py-2 bg-twitter-primary/10 text-twitter-primary border border-twitter-primary rounded-full text-sm font-semibold hover:bg-twitter-primary/20 transition-all disabled:opacity-50"
            >
              {copySuccess ? "✓ Copied!" : "Copy to Clipboard"}
            </button>
          </>
        }
      >
        {isDraftingOutreach ? (
          <div className="flex items-center justify-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-twitter-primary border-t-transparent" />
            <span className="ml-3 text-twitter-muted">Generating draft...</span>
          </div>
        ) : (
          <textarea
            value={outreachDraft}
            onChange={(e) => setOutreachDraft(e.target.value)}
            className="w-full px-4 py-3 bg-twitter-secondary border border-twitter-border rounded-lg text-twitter-text placeholder-twitter-muted focus:outline-none focus:border-twitter-primary resize-none font-mono text-sm"
            rows={14}
          />
        )}
      </Modal>

      {/* Archive Modal */}
      <Modal
        isOpen={archiveModalOpen}
        onClose={() => setArchiveModalOpen(false)}
        title="Archive Lead"
        footer={
          <>
            <button
              onClick={() => setArchiveModalOpen(false)}
              className="px-4 py-2 bg-twitter-secondary text-twitter-text border border-twitter-border rounded-full text-sm font-semibold hover:bg-twitter-hover transition-all"
            >
              Cancel
            </button>
            <button
              onClick={confirmArchiveLead}
              className="px-4 py-2 bg-twitter-muted/10 text-twitter-muted border border-twitter-border rounded-full text-sm font-semibold hover:bg-twitter-hover transition-all"
            >
              🗄 Archive
            </button>
          </>
        }
      >
        <label className="block text-sm text-twitter-muted mb-2">
          Reason (optional):
        </label>
        <textarea
          value={archiveReason}
          onChange={(e) => setArchiveReason(e.target.value)}
          placeholder="Why are you archiving this lead?"
          className="w-full px-4 py-3 bg-twitter-secondary border border-twitter-border rounded-lg text-twitter-text placeholder-twitter-muted focus:outline-none focus:border-twitter-primary resize-none"
          rows={3}
        />
      </Modal>

      {/* Irrelevant Modal */}
      <Modal
        isOpen={irrelevantModalOpen}
        onClose={() => setIrrelevantModalOpen(false)}
        title="Mark as Irrelevant"
        footer={
          <>
            <button
              onClick={() => setIrrelevantModalOpen(false)}
              className="px-4 py-2 bg-twitter-secondary text-twitter-text border border-twitter-border rounded-full text-sm font-semibold hover:bg-twitter-hover transition-all"
            >
              Cancel
            </button>
            <button
              onClick={confirmMarkIrrelevant}
              className="px-4 py-2 bg-twitter-danger/10 text-twitter-danger border border-twitter-danger rounded-full text-sm font-semibold hover:bg-twitter-danger/20 transition-all"
            >
              Mark Irrelevant
            </button>
          </>
        }
      >
        <label className="block text-sm text-twitter-muted mb-2">
          Reason (optional):
        </label>
        <textarea
          value={irrelevantReason}
          onChange={(e) => setIrrelevantReason(e.target.value)}
          placeholder="Why is this lead irrelevant?"
          className="w-full px-4 py-3 bg-twitter-secondary border border-twitter-border rounded-lg text-twitter-text placeholder-twitter-muted focus:outline-none focus:border-twitter-primary resize-none"
          rows={4}
        />
      </Modal>
    </div>
  );
}

export default App;
