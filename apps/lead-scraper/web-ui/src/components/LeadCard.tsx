import clsx from "clsx";
import { motion } from "framer-motion";
import type { Lead } from "../types";
import { Badge } from "./Badge";
import { PainPoint } from "./PainPoint";

interface LeadCardProps {
  lead: Lead;
  onMarkContacted: (leadId: string) => void;
  onMarkIrrelevant: (leadId: string) => void;
  onUnmarkIrrelevant: (leadId: string) => void;
  index: number;
}

export function LeadCard({
  lead,
  onMarkContacted,
  onMarkIrrelevant,
  onUnmarkIrrelevant,
  index,
}: LeadCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-twitter-card border border-twitter-border rounded-xl p-5 hover:border-twitter-primary transition-all duration-200 hover:shadow-lg hover:shadow-twitter-primary/10"
    >
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-twitter-text mb-2 leading-tight">
          {lead.title}
        </h3>
        <div className="flex gap-4 text-sm text-twitter-muted mb-3">
          <span>r/{lead.subreddit}</span>
          <span>by u/{lead.author}</span>
          <span>{formatDate(lead.scrapedAt)}</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {lead.isHotLead && <Badge variant="hot">🔥 HOT</Badge>}
          {lead.reachedOut && <Badge variant="contacted">✓ Contacted</Badge>}
          {lead.isIrrelevant && (
            <Badge variant="irrelevant">✗ Irrelevant</Badge>
          )}
          <Badge variant="score">Score: {lead.score || 0}</Badge>
        </div>
      </div>

      {/* Reasoning */}
      {lead.reasoning && (
        <div className="text-sm text-twitter-muted leading-relaxed mb-4">
          {lead.reasoning}
        </div>
      )}

      {/* Pain Points */}
      {lead.painPoints && lead.painPoints.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-twitter-muted mb-2">
            Pain Points:
          </h4>
          {lead.painPoints.map((pp, idx) => (
            <PainPoint key={idx} painPoint={pp} />
          ))}
        </div>
      )}

      {/* Irrelevance Info */}
      {lead.isIrrelevant && lead.irrelevanceReason && (
        <div className="bg-twitter-danger/10 border border-twitter-danger rounded-lg p-3 mb-4">
          <div className="text-xs font-semibold text-twitter-danger mb-1">
            Marked Irrelevant:
          </div>
          <div className="text-sm text-twitter-text">
            {lead.irrelevanceReason}
          </div>
        </div>
      )}

      {/* Contact Notes */}
      {lead.reachedOut && lead.outreachNotes && (
        <div className="bg-twitter-success/10 border border-twitter-success rounded-lg p-3 mb-4">
          <div className="text-xs font-semibold text-twitter-success mb-1">
            Contact Notes:
          </div>
          <div className="text-sm text-twitter-text">{lead.outreachNotes}</div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-twitter-border">
        <button
          onClick={() => window.open(lead.postUrl, "_blank")}
          className="px-4 py-2 bg-twitter-primary hover:bg-twitter-primary-hover text-white rounded-full text-sm font-semibold transition-all hover:scale-105 shadow-lg shadow-twitter-primary/20"
        >
          Open Post
        </button>

        {!lead.reachedOut && (
          <button
            onClick={() => onMarkContacted(lead.id)}
            className={clsx(
              "px-4 py-2 rounded-full text-sm font-semibold transition-all hover:scale-105",
              "bg-twitter-success/10 text-twitter-success border border-twitter-success hover:bg-twitter-success/20",
            )}
          >
            Mark Contacted
          </button>
        )}

        {!lead.isIrrelevant ? (
          <button
            onClick={() => onMarkIrrelevant(lead.id)}
            className={clsx(
              "px-4 py-2 rounded-full text-sm font-semibold transition-all hover:scale-105",
              "bg-twitter-danger/10 text-twitter-danger border border-twitter-danger hover:bg-twitter-danger/20",
            )}
          >
            Mark Irrelevant
          </button>
        ) : (
          <button
            onClick={() => onUnmarkIrrelevant(lead.id)}
            className={clsx(
              "px-4 py-2 rounded-full text-sm font-semibold transition-all hover:scale-105",
              "bg-twitter-secondary text-twitter-text border border-twitter-border hover:bg-twitter-hover",
            )}
          >
            Unmark Irrelevant
          </button>
        )}
      </div>
    </motion.div>
  );
}
