import { useState } from "react";

import { BLOG_LIMITS } from "./blog.constants.js";

const normalizeTag = (value = "") =>
  String(value).trim();

const hasTag = (tags, candidate) => {
  const normalizedCandidate =
    candidate.toLowerCase();

  return tags.some(
    (tag) =>
      tag.toLowerCase() ===
      normalizedCandidate,
  );
};

export default function TagInput({
  value = [],
  onChange,
  error = "",
}) {
  const [draft, setDraft] =
    useState("");

  const [localError, setLocalError] =
    useState("");

  const addTag = (rawValue) => {
    const tag =
      normalizeTag(rawValue);

    if (!tag) {
      setDraft("");
      return;
    }

    if (
      tag.length >
      BLOG_LIMITS.TAG
    ) {
      setLocalError(
        `Each tag must be ${BLOG_LIMITS.TAG} characters or less.`,
      );

      return;
    }

    if (
      value.length >=
      BLOG_LIMITS.MAX_TAGS
    ) {
      setLocalError(
        `You can add a maximum of ${BLOG_LIMITS.MAX_TAGS} tags.`,
      );

      return;
    }

    if (hasTag(value, tag)) {
      setLocalError(
        "This tag has already been added.",
      );

      setDraft("");
      return;
    }

    setLocalError("");

    onChange?.([
      ...value,
      tag,
    ]);

    setDraft("");
  };

  const removeTag = (tagToRemove) => {
    setLocalError("");

    onChange?.(
      value.filter(
        (tag) =>
          tag !== tagToRemove,
      ),
    );
  };

  const handleKeyDown = (
    event,
  ) => {
    if (
      event.key === "Enter" ||
      event.key === ","
    ) {
      event.preventDefault();
      addTag(draft);
      return;
    }

    if (
      event.key ===
        "Backspace" &&
      !draft &&
      value.length
    ) {
      removeTag(
        value[value.length - 1],
      );
    }
  };

  const displayedError =
    localError || error;

  return (
    <label className="field">
      <span>Tags</span>

      <div
        className={[
          "blog-tag-input",
          displayedError
            ? "has-error"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {value.length ? (
          <div className="blog-tag-list">
            {value.map((tag) => (
              <span
                className="blog-tag"
                key={tag}
              >
                <span>{tag}</span>

                <button
                  type="button"
                  aria-label={`Remove ${tag}`}
                  title={`Remove ${tag}`}
                  onClick={() =>
                    removeTag(tag)
                  }
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}

        <input
          type="text"
          value={draft}
          maxLength={
            BLOG_LIMITS.TAG
          }
          placeholder={
            value.length
              ? "Add another tag"
              : "Type a tag and press Enter"
          }
          onChange={(event) => {
            setDraft(
              event.target.value,
            );

            if (localError) {
              setLocalError("");
            }
          }}
          onKeyDown={
            handleKeyDown
          }
          onBlur={() => {
            if (draft.trim()) {
              addTag(draft);
            }
          }}
        />
      </div>

      <small>
        Press Enter or comma to add.
        {" "}
        {value.length}/
        {BLOG_LIMITS.MAX_TAGS} tags
      </small>

      {displayedError ? (
        <span className="field-error">
          {displayedError}
        </span>
      ) : null}
    </label>
  );
}