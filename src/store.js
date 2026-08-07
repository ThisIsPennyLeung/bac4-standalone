import { create } from 'zustand';

export const DEFAULT_METADATA = {
  name: 'New C4 Model',
  version: '1.0',
  author: 'Solution Architect',
};

const LEVELS = new Set(['context', 'container', 'component', 'code']);
const DEFAULT_POSITION = { x: 0, y: 0 };

// Helper function to get the correct store property name for a type
const getPropertyName = (type) => {
  const mapping = {
    'system': 'systems',
    'container': 'containers',
    'component': 'components',
    'person': 'people',
    'externalSystem': 'externalSystems',
  };
  return mapping[type] || `${type}s`;
};

const ELEMENT_TYPES = [
  'system',
  'container',
  'component',
  'person',
  'externalSystem',
];
const COLLECTION_NAMES = ELEMENT_TYPES.map(getPropertyName);

const createId = (prefix) => (
  `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
);

const isPosition = (position) => (
  Number.isFinite(position?.x) && Number.isFinite(position?.y)
);

const positionOrDefault = (position) => {
  if (isPosition(position)) {
    return { x: position.x, y: position.y };
  }

  return { ...DEFAULT_POSITION };
};

const createDiagram = (name = DEFAULT_METADATA.name, level = 'context') => ({
  id: createId('diagram'),
  name: typeof name === 'string' && name.trim() ? name.trim() : DEFAULT_METADATA.name,
  level: LEVELS.has(level) ? level : 'context',
  elements: [],
  relationships: [],
});

const getStoredElements = (state) => [
  ...state.systems,
  ...state.containers,
  ...state.components,
  ...state.people,
  ...state.externalSystems,
];

const elementIdsIn = (diagrams) => {
  const elementIds = new Set();

  diagrams.forEach((diagram) => {
    diagram.elements.forEach((element) => elementIds.add(element.id));
  });

  return elementIds;
};

const relationshipIdsIn = (diagrams) => {
  const relationshipIds = new Set();

  diagrams.forEach((diagram) => {
    diagram.relationships.forEach((relationship) => relationshipIds.add(relationship.id));
  });

  return relationshipIds;
};

const withoutPosition = (element) => {
  const content = { ...element };
  delete content.position;
  return content;
};

const collectGarbage = (state) => {
  const referencedElementIds = elementIdsIn(state.diagrams);
  const referencedRelationshipIds = relationshipIdsIn(state.diagrams);

  return {
    systems: state.systems.filter((element) => referencedElementIds.has(element.id)),
    containers: state.containers.filter((element) => referencedElementIds.has(element.id)),
    components: state.components.filter((element) => referencedElementIds.has(element.id)),
    people: state.people.filter((element) => referencedElementIds.has(element.id)),
    externalSystems: state.externalSystems.filter((element) => referencedElementIds.has(element.id)),
    relationships: state.relationships.filter((relationship) => (
      referencedRelationshipIds.has(relationship.id)
    )),
  };
};

const normalizeCollections = (model) => {
  const seenElementIds = new Set();
  const collections = {};

  ELEMENT_TYPES.forEach((type) => {
    const propertyName = getPropertyName(type);
    const elements = Array.isArray(model?.[propertyName]) ? model[propertyName] : [];

    collections[propertyName] = elements.flatMap((element) => {
      if (
        !element ||
        typeof element !== 'object' ||
        typeof element.id !== 'string' ||
        !element.id ||
        seenElementIds.has(element.id)
      ) {
        return [];
      }

      seenElementIds.add(element.id);
      return [{ ...withoutPosition(element), type }];
    });
  });

  const elementIds = new Set(getStoredElements(collections).map((element) => element.id));
  const seenRelationshipIds = new Set();
  const relationships = Array.isArray(model?.relationships) ? model.relationships : [];

  const normalizedRelationships = relationships.flatMap((relationship) => {
    if (
      !relationship ||
      typeof relationship !== 'object' ||
      typeof relationship.id !== 'string' ||
      !relationship.id ||
      seenRelationshipIds.has(relationship.id) ||
      !elementIds.has(relationship.from) ||
      !elementIds.has(relationship.to)
    ) {
      return [];
    }

    seenRelationshipIds.add(relationship.id);
    return [{ ...relationship }];
  });

  return {
    ...collections,
    relationships: normalizedRelationships,
    elementIds,
  };
};

const normalizeMembers = (diagram, normalized) => {
  const seenElementIds = new Set();
  const elements = (Array.isArray(diagram.elements) ? diagram.elements : []).flatMap((member) => {
    if (
      !member ||
      typeof member.id !== 'string' ||
      !normalized.elementIds.has(member.id) ||
      seenElementIds.has(member.id)
    ) {
      return [];
    }

    seenElementIds.add(member.id);
    return [{
      id: member.id,
      position: positionOrDefault(member.position),
    }];
  });

  const activeElementIds = new Set(elements.map((element) => element.id));
  const seenRelationshipIds = new Set();
  const relationships = (Array.isArray(diagram.relationships) ? diagram.relationships : []).flatMap((member) => {
    const relationship = normalized.relationships.find(
      (candidate) => candidate.id === member?.id
    );

    if (
      !relationship ||
      seenRelationshipIds.has(relationship.id) ||
      !activeElementIds.has(relationship.from) ||
      !activeElementIds.has(relationship.to)
    ) {
      return [];
    }

    seenRelationshipIds.add(relationship.id);
    return [{ id: relationship.id }];
  });

  return { elements, relationships };
};

const normalizeModel = (model) => {
  const normalized = normalizeCollections(model);
  const metadata = {
    ...DEFAULT_METADATA,
    ...(model?.metadata && typeof model.metadata === 'object' ? model.metadata : {}),
  };
  const seenDiagramIds = new Set();
  const diagramInput = Array.isArray(model?.diagrams) ? model.diagrams : [];

  const diagrams = diagramInput.flatMap((diagram) => {
    if (
      !diagram ||
      typeof diagram !== 'object' ||
      typeof diagram.id !== 'string' ||
      !diagram.id ||
      seenDiagramIds.has(diagram.id) ||
      !LEVELS.has(diagram.level)
    ) {
      return [];
    }

    seenDiagramIds.add(diagram.id);
    const members = normalizeMembers(diagram, normalized);

    return [{
      id: diagram.id,
      name: typeof diagram.name === 'string' && diagram.name.trim()
        ? diagram.name.trim()
        : DEFAULT_METADATA.name,
      level: diagram.level,
      ...members,
    }];
  });

  const fallbackDiagram = {
    id: createId('diagram'),
    name: typeof metadata.name === 'string' && metadata.name.trim()
      ? metadata.name.trim()
      : DEFAULT_METADATA.name,
    level: LEVELS.has(model?.currentLevel) ? model.currentLevel : 'context',
    elements: getStoredElements(normalized).map((element) => ({
      id: element.id,
      position: positionOrDefault(element.position),
    })),
    relationships: normalized.relationships.map((relationship) => ({
      id: relationship.id,
    })),
  };
  const validDiagrams = diagrams.length ? diagrams : [fallbackDiagram];
  const activeDiagram = validDiagrams.find(
    (diagram) => diagram.id === model?.currentDiagram
  ) || validDiagrams[0];
  const state = {
    metadata: { ...metadata, name: activeDiagram.name },
    currentLevel: activeDiagram.level,
    currentDiagram: activeDiagram.id,
    diagrams: validDiagrams,
    systems: normalized.systems,
    containers: normalized.containers,
    components: normalized.components,
    people: normalized.people,
    externalSystems: normalized.externalSystems,
    relationships: normalized.relationships,
    selectedElement: null,
    selectedEdge: null,
    warnings: [],
  };

  return { ...state, ...collectGarbage(state) };
};

const initialDiagram = createDiagram();

const useStore = create((set, get) => ({
  // Debug mode - set to true during development to enable logging
  debugMode: false,

  // Project metadata
  metadata: { ...DEFAULT_METADATA },

  // Current diagram and C4 level
  currentLevel: initialDiagram.level,
  currentDiagram: initialDiagram.id,
  diagrams: [initialDiagram],

  // Selected element for editing
  selectedElement: null,

  // Selected edge for editing
  selectedEdge: null,

  // Elements by type
  systems: [],
  containers: [],
  components: [],
  people: [],
  externalSystems: [],

  // Relationships
  relationships: [],

  // Validation warnings
  warnings: [],

  // Actions
  setMetadata: (nextMetadata) => {
    set((state) => {
      const name = typeof nextMetadata?.name === 'string' && nextMetadata.name.trim()
        ? nextMetadata.name.trim()
        : state.metadata.name;

      return {
        metadata: { ...state.metadata, ...nextMetadata, name },
        diagrams: state.diagrams.map((diagram) => (
          diagram.id === state.currentDiagram ? { ...diagram, name } : diagram
        )),
      };
    });
  },

  // Add diagram
  addDiagram: (name = DEFAULT_METADATA.name, level = get().currentLevel) => {
    if (!LEVELS.has(level)) {
      return null;
    }

    const newDiagram = createDiagram(name, level);
    set((state) => ({
      diagrams: [...state.diagrams, newDiagram],
      currentDiagram: newDiagram.id,
      currentLevel: newDiagram.level,
      metadata: { ...state.metadata, name: newDiagram.name },
      selectedElement: null,
      selectedEdge: null,
    }));

    return newDiagram;
  },

  // Switch active diagram
  switchDiagram: (id) => {
    const diagram = get().diagrams.find((candidate) => candidate.id === id);

    if (!diagram) {
      return false;
    }

    set((state) => ({
      currentDiagram: diagram.id,
      currentLevel: diagram.level,
      metadata: { ...state.metadata, name: diagram.name },
      selectedElement: null,
      selectedEdge: null,
    }));

    return true;
  },

  // Delete diagram
  deleteDiagram: (id) => {
    const state = get();

    if (!state.diagrams.some((diagram) => diagram.id === id)) {
      return false;
    }

    const diagrams = state.diagrams.filter((diagram) => diagram.id !== id);
    const remainingDiagrams = diagrams.length ? diagrams : [createDiagram()];
    const activeDiagram = id === state.currentDiagram
      ? remainingDiagrams[0]
      : remainingDiagrams.find((diagram) => diagram.id === state.currentDiagram)
        || remainingDiagrams[0];
    const nextState = { ...state, diagrams: remainingDiagrams };

    set({
      ...collectGarbage(nextState),
      diagrams: remainingDiagrams,
      currentDiagram: activeDiagram.id,
      currentLevel: activeDiagram.level,
      metadata: { ...state.metadata, name: activeDiagram.name },
      selectedElement: null,
      selectedEdge: null,
      warnings: [],
    });

    return true;
  },

  setSelectedElement: (element) => {
    const state = get();
    if (state.debugMode) {
      console.log('[BAC4 Debug] setSelectedElement called:', element ? { id: element.id, type: element.type } : null);
    }
    set({ selectedElement: element, selectedEdge: null });
  },

  setSelectedEdge: (edge) => {
    const state = get();
    if (state.debugMode) {
      console.log('[BAC4 Debug] setSelectedEdge called:', edge ? { id: edge.id } : null);
    }
    set({ selectedEdge: edge, selectedElement: null });
  },

  // Add element
  addElement: (type, element = {}) => {
    const propertyName = getPropertyName(type);

    if (!COLLECTION_NAMES.includes(propertyName)) {
      return null;
    }

    const { position, ...content } = element;
    const newElement = {
      id: createId(type),
      type,
      ...content,
    };

    set((state) => ({
      [propertyName]: [...state[propertyName], newElement],
      diagrams: state.diagrams.map((diagram) => {
        if (diagram.id !== state.currentDiagram) {
          return diagram;
        }

        return {
          ...diagram,
          elements: [
            ...diagram.elements,
            { id: newElement.id, position: positionOrDefault(position) },
          ],
        };
      }),
    }));

    return newElement;
  },

  // Update element position in active diagram
  updateCurrentDiagramElementPosition: (id, position) => {
    if (!isPosition(position)) {
      return false;
    }

    set((state) => ({
      diagrams: state.diagrams.map((diagram) => {
        if (diagram.id !== state.currentDiagram) {
          return diagram;
        }

        return {
          ...diagram,
          elements: diagram.elements.map((element) => (
            element.id === id
              ? { ...element, position: { x: position.x, y: position.y } }
              : element
          )),
        };
      }),
      selectedElement: state.selectedElement?.id === id
        ? { ...state.selectedElement, position: { x: position.x, y: position.y } }
        : state.selectedElement,
    }));

    return true;
  },

  // Update element
  updateElement: (type, id, updates) => {
    const state = get();
    if (state.debugMode) {
      console.log('[BAC4 Debug] updateElement called:', { type, id, updates });
    }

    const propertyName = getPropertyName(type);

    if (!COLLECTION_NAMES.includes(propertyName)) {
      return false;
    }

    const semanticUpdates = { ...(updates || {}) };
    delete semanticUpdates.position;

    set((state) => {
      const updatedElements = state[propertyName].map((element) => (
        element.id === id ? { ...element, ...semanticUpdates } : element
      ));
      const updatedElement = updatedElements.find((element) => element.id === id);
      const activeDiagram = state.diagrams.find(
        (diagram) => diagram.id === state.currentDiagram
      );
      const diagramElement = activeDiagram?.elements.find((element) => element.id === id);

      if (state.debugMode && updatedElement) {
        console.log('[BAC4 Debug] Element updated:', updatedElement);
      }

      return {
        [propertyName]: updatedElements,
        selectedElement: state.selectedElement?.id === id && updatedElement
          ? { ...updatedElement, position: diagramElement?.position }
          : state.selectedElement,
      };
    });

    return true;
  },

  // Delete element
  deleteElement: (type, id) => {
    set((state) => {
      const diagrams = state.diagrams.map((diagram) => {
        if (diagram.id !== state.currentDiagram) {
          return diagram;
        }

        const elements = diagram.elements.filter((element) => element.id !== id);
        const relationships = diagram.relationships.filter((member) => {
          const relationship = state.relationships.find(
            (candidate) => candidate.id === member.id
          );

          return relationship && relationship.from !== id && relationship.to !== id;
        });

        return { ...diagram, elements, relationships };
      });
      const nextState = { ...state, diagrams };

      return {
        ...collectGarbage(nextState),
        diagrams,
        selectedElement: null,
        selectedEdge: null,
      };
    });
  },

  // Add relationship
  addRelationship: (relationship) => {
    const state = get();
    const activeDiagram = state.diagrams.find(
      (diagram) => diagram.id === state.currentDiagram
    );
    const activeElementIds = new Set(
      activeDiagram?.elements.map((element) => element.id)
    );

    if (!activeElementIds.has(relationship?.from) || !activeElementIds.has(relationship?.to)) {
      return null;
    }

    const newRelationship = {
      id: createId('rel'),
      ...relationship,
    };

    set((currentState) => ({
      relationships: [...currentState.relationships, newRelationship],
      diagrams: currentState.diagrams.map((diagram) => {
        if (diagram.id !== currentState.currentDiagram) {
          return diagram;
        }

        return {
          ...diagram,
          relationships: [...diagram.relationships, { id: newRelationship.id }],
        };
      }),
    }));

    return newRelationship;
  },

  // Update relationship
  updateRelationship: (id, updates) => {
    const state = get();
    if (state.debugMode) {
      console.log('[BAC4 Debug] updateRelationship called:', { id, updates });
    }

    set((state) => {
      const updatedRelationships = state.relationships.map((relationship) => (
        relationship.id === id ? { ...relationship, ...updates } : relationship
      ));
      const updatedRelationship = updatedRelationships.find(
        (relationship) => relationship.id === id
      );

      if (state.debugMode && updatedRelationship) {
        console.log('[BAC4 Debug] Relationship updated:', updatedRelationship);
      }

      return {
        relationships: updatedRelationships,
        selectedEdge: state.selectedEdge?.id === id
          ? updatedRelationship
          : state.selectedEdge,
      };
    });
  },

  // Delete relationship
  deleteRelationship: (id) => {
    set((state) => {
      const diagrams = state.diagrams.map((diagram) => {
        if (diagram.id !== state.currentDiagram) {
          return diagram;
        }

        return {
          ...diagram,
          relationships: diagram.relationships.filter(
            (relationship) => relationship.id !== id
          ),
        };
      });
      const nextState = { ...state, diagrams };

      return {
        ...collectGarbage(nextState),
        diagrams,
        selectedEdge: null,
      };
    });
  },

  // Reuse a shared element in the active diagram
  replaceElementInCurrentDiagram: (oldId, replacementId) => {
    set((state) => {
      const replacementElement = getStoredElements(state).find(
        (element) => element.id === replacementId
      );
      const activeDiagram = state.diagrams.find(
        (diagram) => diagram.id === state.currentDiagram
      );
      const oldElement = activeDiagram?.elements.find((element) => element.id === oldId);

      if (
        !replacementElement ||
        !oldElement ||
        activeDiagram.elements.some((element) => element.id === replacementId)
      ) {
        return state;
      }

      const diagrams = state.diagrams.map((diagram) => {
        if (diagram.id !== state.currentDiagram) {
          return diagram;
        }

        return {
          ...diagram,
          elements: diagram.elements.map((element) => (
            element.id === oldId
              ? { id: replacementId, position: oldElement.position }
              : element
          )),
          relationships: diagram.relationships.filter((member) => {
            const relationship = state.relationships.find(
              (candidate) => candidate.id === member.id
            );

            return relationship && relationship.from !== oldId && relationship.to !== oldId;
          }),
        };
      });
      const nextState = { ...state, diagrams };

      return {
        ...collectGarbage(nextState),
        diagrams,
        selectedElement: {
          ...replacementElement,
          position: oldElement.position,
        },
        selectedEdge: null,
      };
    });
  },

  // Reuse a shared relationship in the active diagram
  replaceRelationshipInCurrentDiagram: (oldId, replacementId) => {
    set((state) => {
      const activeDiagram = state.diagrams.find(
        (diagram) => diagram.id === state.currentDiagram
      );
      const replacementRelationship = state.relationships.find(
        (relationship) => relationship.id === replacementId
      );
      const activeElementIds = new Set(
        activeDiagram?.elements.map((element) => element.id)
      );

      if (
        !replacementRelationship ||
        !activeDiagram?.relationships.some((relationship) => relationship.id === oldId) ||
        activeDiagram.relationships.some((relationship) => relationship.id === replacementId) ||
        !activeElementIds.has(replacementRelationship.from) ||
        !activeElementIds.has(replacementRelationship.to)
      ) {
        return state;
      }

      const diagrams = state.diagrams.map((diagram) => {
        if (diagram.id !== state.currentDiagram) {
          return diagram;
        }

        return {
          ...diagram,
          relationships: diagram.relationships.map((relationship) => (
            relationship.id === oldId ? { id: replacementId } : relationship
          )),
        };
      });
      const nextState = { ...state, diagrams };

      return {
        ...collectGarbage(nextState),
        diagrams,
        selectedEdge: replacementRelationship,
        selectedElement: null,
      };
    });
  },

  // Get all elements
  getAllElements: () => {
    return getStoredElements(get());
  },

  // Get element by id
  getElementById: (id) => {
    return getStoredElements(get()).find((element) => element.id === id);
  },

  // Get elements in the active diagram
  getAllCurrentDiagramElements: () => {
    const state = get();
    const activeDiagram = state.diagrams.find(
      (diagram) => diagram.id === state.currentDiagram
    );
    const elementsById = new Map(
      getStoredElements(state).map((element) => [element.id, element])
    );

    return (activeDiagram?.elements || []).flatMap((member) => {
      const element = elementsById.get(member.id);

      if (!element) {
        return [];
      }

      return [{ ...element, position: { ...member.position } }];
    });
  },

  // Get visible elements based on active diagram
  getVisibleElements: () => {
    return get().getAllCurrentDiagramElements();
  },

  // Get relationships in the active diagram
  getCurrentDiagramRelationships: () => {
    const state = get();
    const activeDiagram = state.diagrams.find(
      (diagram) => diagram.id === state.currentDiagram
    );
    const relationshipsById = new Map(
      state.relationships.map((relationship) => [relationship.id, relationship])
    );
    const activeElementIds = new Set(
      activeDiagram?.elements.map((element) => element.id)
    );

    return (activeDiagram?.relationships || []).flatMap((member) => {
      const relationship = relationshipsById.get(member.id);

      if (
        !relationship ||
        !activeElementIds.has(relationship.from) ||
        !activeElementIds.has(relationship.to)
      ) {
        return [];
      }

      return [relationship];
    });
  },

  // Clear active diagram
  clearAll: () => {
    set((state) => {
      const diagrams = state.diagrams.map((diagram) => {
        if (diagram.id !== state.currentDiagram) {
          return diagram;
        }

        return { ...diagram, elements: [], relationships: [] };
      });
      const nextState = { ...state, diagrams };

      return {
        ...collectGarbage(nextState),
        diagrams,
        selectedElement: null,
        selectedEdge: null,
        warnings: [],
      };
    });
  },

  // Import model
  importModel: (model) => {
    set(normalizeModel(model));
  },

  // Export model
  exportModel: () => {
    const state = get();

    return {
      metadata: state.metadata,
      currentDiagram: state.currentDiagram,
      diagrams: state.diagrams.map((diagram) => ({
        id: diagram.id,
        name: diagram.name,
        level: diagram.level,
        elements: diagram.elements.map((element) => ({
          id: element.id,
          position: { ...element.position },
        })),
        relationships: diagram.relationships.map((relationship) => ({
          id: relationship.id,
        })),
      })),
      systems: state.systems.map(withoutPosition),
      containers: state.containers.map(withoutPosition),
      components: state.components.map(withoutPosition),
      people: state.people.map(withoutPosition),
      externalSystems: state.externalSystems.map(withoutPosition),
      relationships: state.relationships,
    };
  },

  // Export active diagram as a standalone model
  exportCurrentDiagramModel: () => {
    const state = get();
    const elements = state.getAllCurrentDiagramElements();
    const elementIds = new Set(elements.map((element) => element.id));

    return {
      metadata: state.metadata,
      systems: elements.filter((element) => element.type === 'system'),
      containers: elements.filter((element) => element.type === 'container'),
      components: elements.filter((element) => element.type === 'component'),
      people: elements.filter((element) => element.type === 'person'),
      externalSystems: elements.filter((element) => element.type === 'externalSystem'),
      relationships: state.getCurrentDiagramRelationships().filter((relationship) => (
        elementIds.has(relationship.from) && elementIds.has(relationship.to)
      )),
    };
  },

  // Validate model
  validateModel: () => {
    const state = get();
    const warnings = [];

    // Check for containers without parent system
    state.containers.forEach((container) => {
      if (container.parentSystem && !state.systems.find((s) => s.id === container.parentSystem)) {
        warnings.push({
          type: 'warning',
          message: `Container "${container.name}" references non-existent parent system`,
          elementId: container.id,
        });
      }
    });

    // Check for components without parent container
    state.components.forEach((component) => {
      if (component.parentContainer && !state.containers.find((c) => c.id === component.parentContainer)) {
        warnings.push({
          type: 'warning',
          message: `Component "${component.name}" references non-existent parent container`,
          elementId: component.id,
        });
      }
    });

    // Check for orphaned relationships
    const elements = state.getAllElements();
    const elementIds = new Set(elements.map((element) => element.id));

    state.relationships.forEach((relationship) => {
      if (!elementIds.has(relationship.from)) {
        warnings.push({
          type: 'error',
          message: `Relationship references non-existent source element: ${relationship.from}`,
          elementId: relationship.id,
        });
      }
      if (!elementIds.has(relationship.to)) {
        warnings.push({
          type: 'error',
          message: `Relationship references non-existent target element: ${relationship.to}`,
          elementId: relationship.id,
        });
      }
    });

    // Check complexity
    const visibleElements = get().getVisibleElements();
    if (visibleElements.length > 15) {
      warnings.push({
        type: 'info',
        message: `Current view has ${visibleElements.length} elements. Consider splitting into multiple diagrams for clarity.`,
      });
    }

    set({ warnings });
    return warnings;
  },
}));

// Expose store for E2E testing (only in development/test environments)
if (typeof window !== 'undefined') {
  window.__ZUSTAND_STORE__ = useStore;
}

export default useStore;
