// Logic Editor Store - State management for logic graphs

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  LogicGraph,
  LogicNode,
  LogicConnection,
  LogicVariable,
  LogicNodeCategory,
  LogicNodeSubType,
  DebugState,
} from './types';
import { getNodeDefinition } from './nodeDefinitions';

interface LogicEditorStore {
  // State
  graphs: LogicGraph[];
  currentGraphId: string | null;
  selectedNodeIds: string[];
  clipboard: LogicNode[] | null;
  debugState: DebugState;

  // Graph Management
  createGraph: (name: string, eventBindingId?: string) => string;
  deleteGraph: (graphId: string) => void;
  setCurrentGraph: (graphId: string | null) => void;
  updateGraph: (graphId: string, updates: Partial<LogicGraph>) => void;
  getGraph: (graphId: string) => LogicGraph | undefined;
  getCurrentGraph: () => LogicGraph | undefined;

  // Node Management
  addNode: (type: LogicNodeCategory, subType: LogicNodeSubType, x: number, y: number) => string | null;
  deleteNodes: (nodeIds: string[]) => void;
  updateNode: (nodeId: string, updates: Partial<LogicNode>) => void;
  updateNodePosition: (nodeId: string, x: number, y: number) => void;
  getNode: (nodeId: string) => LogicNode | undefined;

  // Connection Management
  addConnection: (
    sourceNode: string,
    sourceOutput: string,
    targetNode: string,
    targetInput: string
  ) => string | null;
  deleteConnection: (connectionId: string) => void;
  deleteConnectionsForNode: (nodeId: string) => void;
  validateConnection: (
    sourceNode: string,
    sourceOutput: string,
    targetNode: string,
    targetInput: string
  ) => boolean;

  // Variable Management
  addVariable: (name: string, type: 'int' | 'float' | 'string' | 'bool', defaultValue: any) => string;
  deleteVariable: (variableId: string) => void;
  updateVariable: (variableId: string, updates: Partial<LogicVariable>) => void;
  getVariables: () => LogicVariable[];

  // Selection
  selectNodes: (nodeIds: string[]) => void;
  addToSelection: (nodeId: string) => void;
  removeFromSelection: (nodeId: string) => void;
  clearSelection: () => void;

  // Clipboard
  copyNodes: () => void;
  pasteNodes: (offsetX?: number, offsetY?: number) => void;
  cutNodes: () => void;

  // Debug
  startDebug: () => void;
  stopDebug: () => void;
  stepDebug: () => void;
  toggleBreakpoint: (nodeId: string) => void;
  setDebugNodeValue: (nodeId: string, portId: string, value: any) => void;

  // Import/Export
  exportGraph: (graphId: string) => string;
  importGraph: (json: string) => string | null;
}

const initialDebugState: DebugState = {
  isDebugging: false,
  currentNodeId: null,
  executionPath: [],
  nodeValues: {},
  breakpoints: [],
  isPaused: false,
};

export const useLogicEditorStore = create<LogicEditorStore>((set, get) => ({
  // Initial State
  graphs: [],
  currentGraphId: null,
  selectedNodeIds: [],
  clipboard: null,
  debugState: initialDebugState,

  // Graph Management
  createGraph: (name, eventBindingId) => {
    const id = uuidv4();
    const newGraph: LogicGraph = {
      id,
      name,
      description: '',
      nodes: [],
      connections: [],
      variables: [],
      eventBindingId,
    };
    set(state => ({
      graphs: [...state.graphs, newGraph],
      currentGraphId: id,
    }));
    return id;
  },

  deleteGraph: (graphId) => {
    set(state => ({
      graphs: state.graphs.filter(g => g.id !== graphId),
      currentGraphId: state.currentGraphId === graphId ? null : state.currentGraphId,
    }));
  },

  setCurrentGraph: (graphId) => {
    set({ currentGraphId: graphId, selectedNodeIds: [] });
  },

  updateGraph: (graphId, updates) => {
    set(state => ({
      graphs: state.graphs.map(g =>
        g.id === graphId ? { ...g, ...updates } : g
      ),
    }));
  },

  getGraph: (graphId) => {
    return get().graphs.find(g => g.id === graphId);
  },

  getCurrentGraph: () => {
    const { graphs, currentGraphId } = get();
    return graphs.find(g => g.id === currentGraphId);
  },

  // Node Management
  addNode: (type, subType, x, y) => {
    const graph = get().getCurrentGraph();
    if (!graph) return null;

    const definition = getNodeDefinition(subType);
    if (!definition) return null;

    const id = uuidv4();
    const newNode: LogicNode = {
      id,
      type,
      subType,
      label: definition.label,
      position: { x, y },
      params: { ...definition.defaultParams },
      inputs: definition.inputs.map((input, idx) => ({
        ...input,
        id: `${id}-in-${idx}`,
      })),
      outputs: definition.outputs.map((output, idx) => ({
        ...output,
        id: `${id}-out-${idx}`,
      })),
    };

    set(state => ({
      graphs: state.graphs.map(g =>
        g.id === graph.id
          ? { ...g, nodes: [...g.nodes, newNode] }
          : g
      ),
    }));

    return id;
  },

  deleteNodes: (nodeIds) => {
    const graph = get().getCurrentGraph();
    if (!graph) return;

    // Also delete connections involving these nodes
    const connectionsToDelete = graph.connections.filter(
      c => nodeIds.includes(c.sourceNode) || nodeIds.includes(c.targetNode)
    );

    set(state => ({
      graphs: state.graphs.map(g =>
        g.id === graph.id
          ? {
              ...g,
              nodes: g.nodes.filter(n => !nodeIds.includes(n.id)),
              connections: g.connections.filter(
                c => !connectionsToDelete.some(cd => cd.id === c.id)
              ),
            }
          : g
      ),
      selectedNodeIds: state.selectedNodeIds.filter(id => !nodeIds.includes(id)),
    }));
  },

  updateNode: (nodeId, updates) => {
    const graph = get().getCurrentGraph();
    if (!graph) return;

    set(state => ({
      graphs: state.graphs.map(g =>
        g.id === graph.id
          ? {
              ...g,
              nodes: g.nodes.map(n =>
                n.id === nodeId ? { ...n, ...updates } : n
              ),
            }
          : g
      ),
    }));
  },

  updateNodePosition: (nodeId, x, y) => {
    get().updateNode(nodeId, { position: { x, y } });
  },

  getNode: (nodeId) => {
    const graph = get().getCurrentGraph();
    return graph?.nodes.find(n => n.id === nodeId);
  },

  // Connection Management
  addConnection: (sourceNode, sourceOutput, targetNode, targetInput) => {
    const graph = get().getCurrentGraph();
    if (!graph) return null;

    // Validate connection
    if (!get().validateConnection(sourceNode, sourceOutput, targetNode, targetInput)) {
      return null;
    }

    // Check if connection already exists
    const exists = graph.connections.some(
      c =>
        c.sourceNode === sourceNode &&
        c.sourceOutput === sourceOutput &&
        c.targetNode === targetNode &&
        c.targetInput === targetInput
    );
    if (exists) return null;

    // Remove existing connection to the same input (only one connection per input)
    const filteredConnections = graph.connections.filter(
      c => !(c.targetNode === targetNode && c.targetInput === targetInput)
    );

    // Determine connection type
    const sourceNodeObj = graph.nodes.find(n => n.id === sourceNode);
    const sourcePort = sourceNodeObj?.outputs.find(o => o.id === sourceOutput);
    const connectionType = sourcePort?.type === 'execution' ? 'execution' : 'data';

    const id = uuidv4();
    const newConnection: LogicConnection = {
      id,
      sourceNode,
      sourceOutput,
      targetNode,
      targetInput,
      type: connectionType,
    };

    set(state => ({
      graphs: state.graphs.map(g =>
        g.id === graph.id
          ? { ...g, connections: [...filteredConnections, newConnection] }
          : g
      ),
    }));

    return id;
  },

  deleteConnection: (connectionId) => {
    const graph = get().getCurrentGraph();
    if (!graph) return;

    set(state => ({
      graphs: state.graphs.map(g =>
        g.id === graph.id
          ? { ...g, connections: g.connections.filter(c => c.id !== connectionId) }
          : g
      ),
    }));
  },

  deleteConnectionsForNode: (nodeId) => {
    const graph = get().getCurrentGraph();
    if (!graph) return;

    set(state => ({
      graphs: state.graphs.map(g =>
        g.id === graph.id
          ? {
              ...g,
              connections: g.connections.filter(
                c => c.sourceNode !== nodeId && c.targetNode !== nodeId
              ),
            }
          : g
      ),
    }));
  },

  validateConnection: (sourceNode, sourceOutput, targetNode, targetInput) => {
    const graph = get().getCurrentGraph();
    if (!graph) return false;

    // Can't connect to self
    if (sourceNode === targetNode) return false;

    const sourceNodeObj = graph.nodes.find(n => n.id === sourceNode);
    const targetNodeObj = graph.nodes.find(n => n.id === targetNode);
    if (!sourceNodeObj || !targetNodeObj) return false;

    const sourcePort = sourceNodeObj.outputs.find(o => o.id === sourceOutput);
    const targetPort = targetNodeObj.inputs.find(i => i.id === targetInput);
    if (!sourcePort || !targetPort) return false;

    // Type compatibility check
    if (sourcePort.type === 'execution' && targetPort.type !== 'execution') return false;
    if (sourcePort.type !== 'execution' && targetPort.type === 'execution') return false;

    // 'any' type is compatible with everything except execution
    if (sourcePort.type === 'any' || targetPort.type === 'any') {
      return sourcePort.type !== 'execution' && targetPort.type !== 'execution';
    }

    // Same type or compatible types
    return sourcePort.type === targetPort.type;
  },

  // Variable Management
  addVariable: (name, type, defaultValue) => {
    const graph = get().getCurrentGraph();
    if (!graph) return '';

    const id = uuidv4();
    const newVariable: LogicVariable = {
      id,
      name,
      type,
      defaultValue,
    };

    set(state => ({
      graphs: state.graphs.map(g =>
        g.id === graph.id
          ? { ...g, variables: [...g.variables, newVariable] }
          : g
      ),
    }));

    return id;
  },

  deleteVariable: (variableId) => {
    const graph = get().getCurrentGraph();
    if (!graph) return;

    set(state => ({
      graphs: state.graphs.map(g =>
        g.id === graph.id
          ? { ...g, variables: g.variables.filter(v => v.id !== variableId) }
          : g
      ),
    }));
  },

  updateVariable: (variableId, updates) => {
    const graph = get().getCurrentGraph();
    if (!graph) return;

    set(state => ({
      graphs: state.graphs.map(g =>
        g.id === graph.id
          ? {
              ...g,
              variables: g.variables.map(v =>
                v.id === variableId ? { ...v, ...updates } : v
              ),
            }
          : g
      ),
    }));
  },

  getVariables: () => {
    const graph = get().getCurrentGraph();
    return graph?.variables || [];
  },

  // Selection
  selectNodes: (nodeIds) => {
    set({ selectedNodeIds: nodeIds });
  },

  addToSelection: (nodeId) => {
    set(state => ({
      selectedNodeIds: state.selectedNodeIds.includes(nodeId)
        ? state.selectedNodeIds
        : [...state.selectedNodeIds, nodeId],
    }));
  },

  removeFromSelection: (nodeId) => {
    set(state => ({
      selectedNodeIds: state.selectedNodeIds.filter(id => id !== nodeId),
    }));
  },

  clearSelection: () => {
    set({ selectedNodeIds: [] });
  },

  // Clipboard
  copyNodes: () => {
    const graph = get().getCurrentGraph();
    const { selectedNodeIds } = get();
    if (!graph || selectedNodeIds.length === 0) return;

    const nodesToCopy = graph.nodes.filter(n => selectedNodeIds.includes(n.id));
    set({ clipboard: JSON.parse(JSON.stringify(nodesToCopy)) });
  },

  pasteNodes: (offsetX = 50, offsetY = 50) => {
    const graph = get().getCurrentGraph();
    const { clipboard } = get();
    if (!graph || !clipboard || clipboard.length === 0) return;

    const idMap: Record<string, string> = {};
    const newNodes: LogicNode[] = clipboard.map(node => {
      const newId = uuidv4();
      idMap[node.id] = newId;
      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + offsetX,
          y: node.position.y + offsetY,
        },
        inputs: node.inputs.map((input, idx) => ({
          ...input,
          id: `${newId}-in-${idx}`,
        })),
        outputs: node.outputs.map((output, idx) => ({
          ...output,
          id: `${newId}-out-${idx}`,
        })),
      };
    });

    set(state => ({
      graphs: state.graphs.map(g =>
        g.id === graph.id
          ? { ...g, nodes: [...g.nodes, ...newNodes] }
          : g
      ),
      selectedNodeIds: newNodes.map(n => n.id),
    }));
  },

  cutNodes: () => {
    const { selectedNodeIds } = get();
    get().copyNodes();
    get().deleteNodes(selectedNodeIds);
  },

  // Debug
  startDebug: () => {
    const graph = get().getCurrentGraph();
    if (!graph) return;

    // Find trigger nodes to start from
    const triggerNodes = graph.nodes.filter(n => n.type === 'trigger');
    const startNodeId = triggerNodes.length > 0 ? triggerNodes[0].id : null;

    set({
      debugState: {
        ...initialDebugState,
        isDebugging: true,
        currentNodeId: startNodeId,
        executionPath: startNodeId ? [startNodeId] : [],
      },
    });
  },

  stopDebug: () => {
    set({ debugState: initialDebugState });
  },

  stepDebug: () => {
    const { debugState } = get();
    const graph = get().getCurrentGraph();
    if (!graph || !debugState.isDebugging || !debugState.currentNodeId) return;

    // Find next node via execution connections
    const currentNode = graph.nodes.find(n => n.id === debugState.currentNodeId);
    if (!currentNode) return;

    // Find execution output
    const execOutput = currentNode.outputs.find(o => o.type === 'execution');
    if (!execOutput) {
      // No execution output, stop
      set(state => ({
        debugState: { ...state.debugState, currentNodeId: null },
      }));
      return;
    }

    // Find connection from this output
    const connection = graph.connections.find(
      c => c.sourceNode === currentNode.id && c.sourceOutput === execOutput.id
    );

    if (connection) {
      const nextNodeId = connection.targetNode;
      const isPaused = debugState.breakpoints.includes(nextNodeId);

      set(state => ({
        debugState: {
          ...state.debugState,
          currentNodeId: nextNodeId,
          executionPath: [...state.debugState.executionPath, nextNodeId],
          isPaused,
        },
      }));
    } else {
      // No next node
      set(state => ({
        debugState: { ...state.debugState, currentNodeId: null },
      }));
    }
  },

  toggleBreakpoint: (nodeId) => {
    set(state => ({
      debugState: {
        ...state.debugState,
        breakpoints: state.debugState.breakpoints.includes(nodeId)
          ? state.debugState.breakpoints.filter(id => id !== nodeId)
          : [...state.debugState.breakpoints, nodeId],
      },
    }));
  },

  setDebugNodeValue: (nodeId, portId, value) => {
    set(state => ({
      debugState: {
        ...state.debugState,
        nodeValues: {
          ...state.debugState.nodeValues,
          [nodeId]: {
            ...state.debugState.nodeValues[nodeId],
            [portId]: value,
          },
        },
      },
    }));
  },

  // Import/Export
  exportGraph: (graphId) => {
    const graph = get().graphs.find(g => g.id === graphId);
    if (!graph) return '';
    return JSON.stringify(graph, null, 2);
  },

  importGraph: (json) => {
    try {
      const graph = JSON.parse(json) as LogicGraph;
      // Generate new ID to avoid conflicts
      const newId = uuidv4();
      const importedGraph: LogicGraph = {
        ...graph,
        id: newId,
        name: `${graph.name} (导入)`,
      };

      set(state => ({
        graphs: [...state.graphs, importedGraph],
        currentGraphId: newId,
      }));

      return newId;
    } catch (e) {
      console.error('Failed to import graph:', e);
      return null;
    }
  },
}));
