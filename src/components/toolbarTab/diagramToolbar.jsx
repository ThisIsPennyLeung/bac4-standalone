import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import useStore, { DEFAULT_METADATA } from '../../store';

const levels = [
  { value: 'context', label: 'Context' },
  { value: 'container', label: 'Container' },
  { value: 'component', label: 'Component' },
  { value: 'code', label: 'Code' },
];

const DiagramToolbar = () => {
  const { diagrams, currentDiagram, addDiagram, switchDiagram, deleteDiagram } = useStore();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const optionRefs = useRef([]);

  const closeMenu = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsidePointer = (event) => {
      if (!menuRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) closeMenu();
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [open]);

  const createDiagram = (level) => {
    addDiagram(DEFAULT_METADATA.name, level);
    closeMenu(true);
  };

  const handleMenuKeyDown = (event, index) => {
    let nextIndex = null;
    if (event.key === 'ArrowDown') nextIndex = (index + 1) % levels.length;
    if (event.key === 'ArrowUp') nextIndex = (index - 1 + levels.length) % levels.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = levels.length - 1;
    if (nextIndex !== null) {
      event.preventDefault();
      optionRefs.current[nextIndex]?.focus();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu(true);
    }
  };

  const handleDelete = (diagram) => {
    if (window.confirm(`Delete diagram "${diagram.name}"? This cannot be undone.`)) deleteDiagram(diagram.id);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Diagrams</h2>
        <p className="text-xs text-gray-500">Switch between focused C4 views</p>
      </div>

      <div className="mt-4 space-y-2">
        {diagrams.map((diagram) => {
          const active = diagram.id === currentDiagram;
          return (
            <div key={diagram.id} className="flex items-stretch gap-1">
              <button
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => switchDiagram(diagram.id)}
                className={`flex-1 text-left rounded-lg border px-3 py-2 transition-colors ${
                  active ? 'border-blue-300 bg-blue-50 text-blue-900' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="block text-sm font-medium truncate">{diagram.name}</span>
                <span className="block text-xs capitalize text-gray-500">{diagram.level}</span>
              </button>
              <button
                type="button"
                aria-label={`Delete ${diagram.name}`}
                onClick={() => handleDelete(diagram)}
                className="rounded-lg border border-gray-200 px-2 text-gray-500 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="relative mt-4">
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls="diagram-level-menu"
          onClick={() => setOpen((visible) => !visible)}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && open) {
              event.preventDefault();
              closeMenu(true);
              return;
            }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              setOpen(true);
              requestAnimationFrame(() => optionRefs.current[event.key === 'ArrowDown' ? 0 : levels.length - 1]?.focus());
            }
          }}
          className="w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
        >
          Add Diagram
        </button>
        {open && (
          <div ref={menuRef} id="diagram-level-menu" role="menu" aria-label="Choose diagram level" className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {levels.map((level, index) => (
              <button
                key={level.value}
                ref={(element) => { optionRefs.current[index] = element; }}
                type="button"
                role="menuitem"
                onClick={() => createDiagram(level.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    createDiagram(level.value);
                    return;
                  }
                  handleMenuKeyDown(event, index);
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              >
                {level.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagramToolbar;
