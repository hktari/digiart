"use client";

import { X } from "lucide-react";

interface Tag {
  id: string;
  name: string;
  slug: string;
  _count: {
    releaseTags: number;
  };
}

interface TagFilterProps {
  tags: Tag[];
  selectedTags: string[];
  onTagToggle: (tagSlug: string) => void;
  onClearAll: () => void;
}

export function TagFilter({
  tags,
  selectedTags,
  onTagToggle,
  onClearAll,
}: TagFilterProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-700">Filter by tags</h3>
        {selectedTags.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-fuchsia-600 hover:text-fuchsia-700 font-medium"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const isSelected = selectedTags.includes(tag.slug);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onTagToggle(tag.slug)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                ${
                  isSelected
                    ? "bg-fuchsia-600 text-white hover:bg-fuchsia-700"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                }
              `}
            >
              {tag.name}
              <span
                className={`text-xs ${isSelected ? "text-fuchsia-200" : "text-neutral-500"}`}
              >
                {tag._count.releaseTags}
              </span>
              {isSelected && <X className="w-3 h-3" />}
            </button>
          );
        })}
      </div>

      {selectedTags.length > 0 && (
        <p className="text-xs text-neutral-500">
          {selectedTags.length} tag{selectedTags.length !== 1 ? "s" : ""}{" "}
          selected
        </p>
      )}
    </div>
  );
}
