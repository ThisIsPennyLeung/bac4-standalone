import { useRef, useState } from 'react';
import ElementToolbar from './toolbarTab/elementToolbar';

const tabs = [{ id: 'elements', label: 'Elements', Panel: ElementToolbar }];

const Toolbar = () => {
  const [activeTab, setActiveTab] = useState('elements');
  const tabRefs = useRef([]);

  const activateTab = (id) => setActiveTab(id);

  const handleTabKeyDown = (event, index) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activateTab(tabs[index].id);
      return;
    }

    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const nextIndex = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 p-4">
      <div role="tablist" aria-label="Toolbar sections" className="flex border-b border-gray-200 mb-4">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            ref={(element) => { tabRefs.current[0] = element; }}
            type="button"
            role="tab"
            id={`toolbar-${id}-tab`}
            tabIndex={activeTab === id ? 0 : -1}
            aria-selected={activeTab === id}
            aria-controls={`toolbar-${id}-panel`}
            onClick={() => activateTab(id)}
            onKeyDown={(event) => handleTabKeyDown(event, 0)}
            className={`px-3 py-2 text-sm font-medium border-b-2 ${
              activeTab === id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tabs.map(({ id, Panel }) => (
        <div
          key={id}
          role="tabpanel"
          id={`toolbar-${id}-panel`}
          aria-labelledby={`toolbar-${id}-tab`}
          hidden={activeTab !== id}
        >
          <Panel />
        </div>
      ))}
    </aside>
  );
};

export default Toolbar;
