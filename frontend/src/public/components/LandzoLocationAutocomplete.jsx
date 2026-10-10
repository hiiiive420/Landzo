import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { listPublicPropertyLocationSuggestions } from "../../api/publicProperties.api";

const normalizeSuggestion = (value) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export const LandzoLocationAutocomplete = () => {
  const [value, setValue] = useState("");
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [popupPosition, setPopupPosition] = useState(null);
  const fieldRef = useRef(null);
  const inputRef = useRef(null);
  const popupRef = useRef(null);
  const suppressFocusOpenRef = useRef(false);
  const listId = useId();

  const suggestions = useMemo(() => {
    const seen = new Set();
    const search = normalizeSuggestion(value);

    return results.filter((result) => {
      if (typeof result !== "string" || !result.trim()) {
        return false;
      }

      const normalized = normalizeSuggestion(result);

      if (!normalized.startsWith(search) || seen.has(normalized)) {
        return false;
      }

      seen.add(normalized);
      return true;
    });
  }, [results, value]);

  useEffect(() => {
    const search = value.trim();

    if (!isOpen || !search) {
      return undefined;
    }

    const controller = new AbortController();

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await listPublicPropertyLocationSuggestions(
          { search, limit: 8 },
          { signal: controller.signal },
        );

        if (!controller.signal.aborted) {
          setResults(Array.isArray(response.data) ? response.data : []);
          setActiveIndex(-1);
        }
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
          setHasError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 200);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isOpen, value]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const closeOnOutsidePointer = (event) => {
      if (
        fieldRef.current?.contains(event.target) ||
        popupRef.current?.contains(event.target)
      ) {
        return;
      }

      setIsOpen(false);
      setIsLoading(false);
      setActiveIndex(-1);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen || !fieldRef.current) {
      return undefined;
    }

    const updatePopupPosition = () => {
      const bounds = fieldRef.current?.getBoundingClientRect();

      if (!bounds) {
        return;
      }

      const viewportWidth = document.documentElement.clientWidth;
      const width = Math.min(bounds.width, Math.max(0, viewportWidth - 16));
      const left = Math.min(
        Math.max(8, bounds.left),
        Math.max(8, viewportWidth - width - 8),
      );
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const spaceBelow = Math.max(0, viewportHeight - bounds.bottom - 12);
      const spaceAbove = Math.max(0, bounds.top - 12);
      const opensAbove = spaceBelow < 120 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        80,
        Math.min(220, opensAbove ? spaceAbove : spaceBelow),
      );

      setPopupPosition({
        left,
        top: opensAbove ? Math.max(8, bounds.top - maxHeight - 5) : bounds.bottom + 5,
        width,
        maxHeight,
      });
    };

    updatePopupPosition();
    window.addEventListener("resize", updatePopupPosition);
    window.addEventListener("scroll", updatePopupPosition, true);
    window.visualViewport?.addEventListener("resize", updatePopupPosition);
    window.visualViewport?.addEventListener("scroll", updatePopupPosition);

    const observer = "ResizeObserver" in window
      ? new ResizeObserver(updatePopupPosition)
      : null;

    if (observer) {
      observer.observe(fieldRef.current);
    }

    return () => {
      window.removeEventListener("resize", updatePopupPosition);
      window.removeEventListener("scroll", updatePopupPosition, true);
      window.visualViewport?.removeEventListener("resize", updatePopupPosition);
      window.visualViewport?.removeEventListener("scroll", updatePopupPosition);
      observer?.disconnect();
    };
  }, [isOpen]);

  const selectSuggestion = (suggestion) => {
    if (document.activeElement !== inputRef.current) {
      suppressFocusOpenRef.current = true;
      inputRef.current?.focus({ preventScroll: true });
    }

    setValue(suggestion);
    setIsOpen(false);
    setIsLoading(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape" && isOpen) {
      event.preventDefault();
      setIsOpen(false);
      setIsLoading(false);
      setActiveIndex(-1);
      return;
    }

    if (!suggestions.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
    } else if (
      event.key === "Enter" &&
      isOpen &&
      activeIndex >= 0
    ) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    }
  };

  const popup = isOpen && popupPosition
    ? createPortal(
      <div
        className="landzo-location-suggestions"
        id={listId}
        ref={popupRef}
        role={suggestions.length ? "listbox" : "status"}
        style={{
          left: popupPosition.left,
          top: popupPosition.top,
          width: popupPosition.width,
          maxHeight: popupPosition.maxHeight,
        }}
      >
        {suggestions.length ? suggestions.map((suggestion, index) => (
          <button
            aria-selected={index === activeIndex}
            className="landzo-location-suggestion"
            id={`${listId}-option-${index}`}
            key={normalizeSuggestion(suggestion)}
            onClick={() => selectSuggestion(suggestion)}
            onMouseEnter={() => setActiveIndex(index)}
            role="option"
            type="button"
          >
            {suggestion}
          </button>
        )) : (
          <div className="landzo-location-suggestions-message">
            {isLoading
              ? "Searching locations..."
              : hasError
                ? "Location suggestions are unavailable."
                : "No matching locations"}
          </div>
        )}
      </div>,
      document.body,
    )
    : null;

  return (
    <>
      <label className="landzo-home-location-field" ref={fieldRef}>
        <span>Location</span>
        <input
          aria-activedescendant={
            activeIndex >= 0 && suggestions[activeIndex]
              ? `${listId}-option-${activeIndex}`
              : undefined
          }
          aria-autocomplete="list"
          aria-controls={isOpen ? listId : undefined}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          autoComplete="off"
          name="location"
          onChange={(event) => {
            const nextValue = event.target.value;
            const hasQuery = Boolean(nextValue.trim());

            setValue(nextValue);
            setIsOpen(hasQuery);
            setIsLoading(hasQuery);
            setHasError(false);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            if (suppressFocusOpenRef.current) {
              suppressFocusOpenRef.current = false;
              return;
            }

            if (value.trim()) {
              setIsOpen(true);
              setIsLoading(true);
              setHasError(false);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Select location"
          ref={inputRef}
          role="combobox"
          type="text"
          value={value}
        />
      </label>
      {popup}
    </>
  );
};
