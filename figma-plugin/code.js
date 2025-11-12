// This file runs in the Figma plugin sandbox
// It handles communication between the UI and Figma's API

// Show the plugin UI
figma.showUI(__html__, { width: 300, height: 200 });

// ============================================================================
// Node Serialization Utilities
// ============================================================================

/**
 * Serialize a Figma node to a plain object
 * @param {SceneNode} node - Figma node to serialize
 * @param {boolean} includeChildren - Whether to include child nodes
 * @returns {Object} Serialized node data
 */
function serializeNode(node, includeChildren = false) {
  const baseData = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: node.visible,
    locked: node.locked,
  };

  // Add position and size for nodes that have them
  if ('x' in node) baseData.x = node.x;
  if ('y' in node) baseData.y = node.y;
  if ('width' in node) baseData.width = node.width;
  if ('height' in node) baseData.height = node.height;

  // Add text content for text nodes
  if (node.type === 'TEXT') {
    baseData.characters = node.characters;
    baseData.fontSize = node.fontSize;
    baseData.fontName = node.fontName;
  }

  // Add children if requested and node has them
  if (includeChildren && 'children' in node) {
    baseData.children = node.children.map(child => serializeNode(child, false));
  }

  return baseData;
}

// ============================================================================
// Tool Handlers
// ============================================================================

/**
 * Registry of tool handlers
 * Each handler receives args and returns result data or throws error
 */
const toolHandlers = {
  /**
   * Test tool - pings back with timestamp
   */
  ping: async (args) => {
    return {
      message: args.message || "Pong from Figma!",
      timestamp: new Date().toISOString(),
      figmaVersion: figma.version,
    };
  },

  // More tools will be added here in future phases
};

/**
 * Execute a tool request
 * @param {string} toolName - Name of the tool to execute
 * @param {Object} args - Tool arguments
 * @returns {Promise<Object>} Tool result data
 * @throws {Error} If tool not found or execution fails
 */
async function executeTool(toolName, args) {
  const handler = toolHandlers[toolName];

  if (!handler) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  return await handler(args);
}

// ============================================================================
// Message Handlers
// ============================================================================

// Listen for messages from the UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === 'check-connection') {
    // Acknowledge ready state
    figma.ui.postMessage({
      type: 'connection-status',
      status: 'ready'
    });
  }

  if (msg.type === 'connect-to-mcp') {
    // Pass connection request to UI (WebSocket connection happens in UI)
    figma.ui.postMessage({
      type: 'start-connection'
    });
  }

  if (msg.type === 'disconnect-from-mcp') {
    // Pass disconnection request to UI
    figma.ui.postMessage({
      type: 'start-disconnection'
    });
  }

  // Handle tool execution requests from MCP server (via UI)
  if (msg.type === 'tool_request') {
    const { id, tool, args } = msg;

    try {
      // Execute the tool
      const data = await executeTool(tool, args);

      // Send success response back to UI (which forwards to MCP server)
      figma.ui.postMessage({
        type: 'tool_response',
        id: id,
        success: true,
        data: data
      });
    } catch (error) {
      // Send error response back to UI
      figma.ui.postMessage({
        type: 'tool_response',
        id: id,
        success: false,
        error: error.message || String(error)
      });
    }
  }
};
