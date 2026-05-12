"use client";

import { X } from "lucide-react";
import { type KeyboardEvent, useState } from "react";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  id?: string;
}

export function TagInput({
  tags,
  onChange,
  placeholder = "Add tags...",
  maxTags = 10,
  id,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (tags.length >= maxTags) return;
    if (tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setInputValue("");
      return;
    }

    onChange([...tags, trimmed]);
    setInputValue("");
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 p-2 border rounded-lg focus-within:ring-2 focus-within:ring-fuchsia-500 focus-within:border-transparent">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-fuchsia-100 text-fuchsia-700 text-sm font-medium rounded-md"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tags.indexOf(tag))}
              className="hover:bg-fuchsia-200 rounded-sm p-0.5 transition-colors"
              aria-label={`Remove ${tag}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={tags.length === 0 ? placeholder : ""}
          disabled={tags.length >= maxTags}
          className="flex-1 min-w-[120px] outline-none text-sm text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Press Enter or comma to add tags. {tags.length}/{maxTags} tags
      </p>
    </div>
  );
}
