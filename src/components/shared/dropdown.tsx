import { useEffect, useId, useMemo, useRef, useState } from 'react';

const Dropdown = ({ candidates, query, onQueryChange, onSelect, onClose, renderCandidate }) => {
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const id = useId();
  const normalizedQuery = query.trim().toLowerCase();
  const results = useMemo(
    () => candidates.filter((candidate) => candidate.searchText.toLowerCase().includes(normalizedQuery)),
    [candidates, normalizedQuery]
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(results.length - 1, 0)));
  }, [results.length]);

  useEffect(() => {
    const closeOnOutsidePointer = (event) => {
      if (!listRef.current?.contains(event.target)) onClose();
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [onClose]);

  const selectActive = () => {
    const candidate = results[activeIndex];
    if (candidate) onSelect(candidate);
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => results.length ? (index + 1) % results.length : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => results.length ? (index - 1 + results.length) % results.length : 0);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setActiveIndex(Math.max(results.length - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      selectActive();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div ref={listRef} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) onClose();
    }}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded="true"
        aria-controls={`${id}-listbox`}
        aria-activedescendant={results.length ? `${id}-option-${activeIndex}` : undefined}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={onKeyDown}
        className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Search stored content"
      />
      <div id={`${id}-listbox`} role="listbox" className="z-50 mt-1 max-h-56 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
        {results.length ? results.map((candidate, index) => (
          <button
            key={candidate.id}
            id={`${id}-option-${index}`}
            type="button"
            role="option"
            aria-selected={index === activeIndex}
            onMouseDown={(event) => event.preventDefault()}
            onMouseMove={() => setActiveIndex(index)}
            onClick={() => onSelect(candidate)}
            className={`w-full cursor-pointer px-3 py-2 text-left text-sm ${index === activeIndex ? 'bg-blue-50' : ''}`}
          >
            {renderCandidate(candidate)}
          </button>
        )) : (
          <p role="status" className="px-3 py-2 text-sm text-gray-500">No reusable items found</p>
        )}
      </div>
    </div>
  );
};

export default Dropdown;
