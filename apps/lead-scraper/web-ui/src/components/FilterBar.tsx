import clsx from "clsx";
import type { FilterType, SortType } from "../types";

interface FilterBarProps {
  currentFilter: FilterType;
  currentSort: SortType;
  onFilterChange: (filter: FilterType) => void;
  onSortChange: (sort: SortType) => void;
}

const filterButtons: { label: string; value: FilterType }[] = [
  { label: "All", value: "all" },
  { label: "Not Contacted", value: "not-contacted" },
  { label: "Hot Leads", value: "hot" },
  { label: "New (24h)", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Irrelevant", value: "irrelevant" },
  { label: "Relevant", value: "relevant" },
];

const sortButtons: { label: string; value: SortType }[] = [
  { label: "By Score", value: "score" },
  { label: "By Date", value: "date" },
];

export function FilterBar({
  currentFilter,
  currentSort,
  onFilterChange,
  onSortChange,
}: FilterBarProps) {
  return (
    <div className="bg-twitter-card border border-twitter-border rounded-xl p-5 mb-5">
      {/* Filter buttons */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <label className="text-sm font-semibold text-twitter-muted">
          Filter:
        </label>
        {filterButtons.map((button) => (
          <button
            key={button.value}
            onClick={() => onFilterChange(button.value)}
            className={clsx(
              "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
              currentFilter === button.value
                ? "bg-twitter-primary text-white shadow-lg shadow-twitter-primary/20 scale-105"
                : "bg-twitter-secondary text-twitter-text border border-twitter-border hover:bg-twitter-hover hover:scale-105",
            )}
          >
            {button.label}
          </button>
        ))}
      </div>

      {/* Sort buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-semibold text-twitter-muted">
          Sort:
        </label>
        {sortButtons.map((button) => (
          <button
            key={button.value}
            onClick={() => onSortChange(button.value)}
            className={clsx(
              "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
              currentSort === button.value
                ? "bg-twitter-primary text-white shadow-lg shadow-twitter-primary/20 scale-105"
                : "bg-twitter-secondary text-twitter-text border border-twitter-border hover:bg-twitter-hover hover:scale-105",
            )}
          >
            {button.label}
          </button>
        ))}
      </div>
    </div>
  );
}
