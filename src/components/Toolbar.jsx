import { useRef, useState } from 'react';
import DiagramToolbar from './toolbarTab/diagramToolbar';
import ElementToolbar from './toolbarTab/elementToolbar';

const tabs = [
  { id: 'diagrams', label: 'Diagrams', Panel: DiagramToolbar },
  { id: 'elements', label: 'Elements', Panel: ElementToolbar },
];

const Toolbar = () => {
  const [activeTab, setActiveTab] = useState('elements');
  const tabRefs = useRef({});

  const handleTabKeyDown = (event, index) => {
    let nextIndex = null;
    if (event.key === 'ArrowLeft') nextIndex = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;

    if (nextIndex !== null) {
      event.preventDefault();
      tabRefs.current[tabs[nextIndex].id]?.focus();
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setActiveTab(tabs[index].id);
    }
  };

  const activePanel = tabs.find((tab) => tab.id === activeTab)?.Panel;
  const ActivePanel = activePanel || ElementToolbar;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-4">
      <div role="tablist" aria-label="Toolbar sections" className="flex border-b border-gray-200 mb-4">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => {
              tabRefs.current[tab.id] = element;
            }}
            type="button"
            role="tab"
            id={`toolbar-${tab.id}-tab`}
            aria-selected={activeTab === tab.id}
            aria-controls={`toolbar-${tab.id}-panel`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            className={`px-3 py-2 text-sm font-medium border-b-2 ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`toolbar-${activeTab}-panel`}
        aria-labelledby={`toolbar-${activeTab}-tab`}
      >
        <ActivePanel />
      </div>
    </aside>
  );
};

export default Toolbar;
