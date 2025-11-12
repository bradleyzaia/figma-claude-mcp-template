# Feature Implementation Roadmap

**Project**: Figma/Claude MCP Server
**Status**: Pre-Alpha (v0.1.0)
**Last Updated**: 2025-11-12

This document outlines the planned implementation of MCP tools that enable Claude to interact with Figma through the plugin architecture described in [../README.md](../README.md).

---

## Implementation Status Overview

| Phase | Status | Tools Count | Description |
|-------|--------|-------------|-------------|
| Phase 1 | ⏳ Planned | 2 | Selection & Navigation Tools |
| Phase 2 | ⏳ Planned | 3 | Node Scanning & Property Reading |
| Phase 3 | ⏳ Planned | 3 | Text Operations |
| Phase 4 | ⏳ Planned | 3 | Node Property Modification |
| Phase 5 | ⏳ Planned | 2 | Event Listeners & Real-time Sync |

**Legend**: ✓ Complete | 🔄 In Progress | ⏳ Planned | ❌ Blocked

---

## Planned Feature Implementation

### Phase 1: Core Selection & Navigation Tools ⏳

#### Tool: `get_selection`
**Purpose**: Get currently selected nodes in Figma

**Implementation**:
```javascript
// Figma Plugin (code.js)
const selection = figma.currentPage.selection;
const selectionData = selection.map(node => ({
  id: node.id,
  name: node.name,
  type: node.type,
  x: node.x,
  y: node.y,
  width: node.width,
  height: node.height
}));
```

**MCP Tool Schema**:
```json
{
  "name": "get_selection",
  "description": "Get information about currently selected Figma nodes",
  "inputSchema": {
    "type": "object",
    "properties": {
      "includeChildren": {
        "type": "boolean",
        "description": "Include child nodes in response"
      }
    }
  }
}
```

**Response Format**:
```json
{
  "content": [{
    "type": "text",
    "text": "Selected: 3 nodes\n\n1. Frame 'Hero Section' (id: 1:234)\n..."
  }]
}
```

#### Tool: `set_selection`
**Purpose**: Select specific nodes by ID or name

**Figma Implementation**:
```javascript
const nodesToSelect = ids.map(id => figma.getNodeById(id));
figma.currentPage.selection = nodesToSelect;
```

---

### Phase 2: Node Scanning & Property Reading ⏳

#### Tool: `scan_frame`
**Purpose**: Get all child nodes of a frame/container

**Figma Implementation**:
```javascript
// Get frame by ID or from selection
const frame = figma.getNodeById(frameId);

// Scan children
const children = frame.children.map(child => ({
  id: child.id,
  name: child.name,
  type: child.type,
  visible: child.visible,
  locked: child.locked
}));
```

**Tool Parameters**:
- `frameId` (optional): Specific frame ID to scan
- `depth` (optional): How many levels deep to scan (default: 1)
- `filter` (optional): Filter by node type (e.g., "TEXT", "FRAME")

#### Tool: `find_nodes`
**Purpose**: Search for nodes matching criteria

**Figma Implementation**:
```javascript
// Using findOne or findAll
const results = frame.findAll(node => {
  return node.name.includes(searchTerm) &&
         node.type === nodeType &&
         node.visible === true;
});
```

**Search Criteria**:
- Name (string match, regex)
- Type (TEXT, FRAME, RECTANGLE, etc.)
- Visibility state
- Custom properties

#### Tool: `get_node_properties`
**Purpose**: Get detailed properties of specific node(s)

**Properties Returned**:
```typescript
{
  id: string,
  name: string,
  type: NodeType,
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number,
  visible: boolean,
  locked: boolean,
  opacity: number,
  fills: Paint[],
  strokes: Paint[],
  effects: Effect[],
  parent: { id, name, type },
  children?: NodeInfo[]  // if container
}
```

---

### Phase 3: Text Operations ⏳

#### Tool: `get_text_content`
**Purpose**: Read text from text nodes

**Figma Implementation**:
```javascript
if (node.type === "TEXT") {
  const content = node.characters;
  const styling = {
    fontName: node.fontName,
    fontSize: node.fontSize,
    textAlign: node.textAlignHorizontal
  };
}
```

**Response**:
```json
{
  "nodeId": "1:234",
  "nodeName": "Title",
  "text": "Welcome to Our App",
  "fontFamily": "Inter",
  "fontWeight": "Bold",
  "fontSize": 24
}
```

#### Tool: `set_text_content`
**Purpose**: Update text in text nodes

**Figma Implementation**:
```javascript
// Must load font first!
await figma.loadFontAsync(node.fontName);
node.characters = newText;
```

**Safety Considerations**:
- Font must be loaded before editing
- Handle font loading errors gracefully
- Preserve formatting when possible

#### Tool: `create_text_node`
**Purpose**: Create new text layer

**Implementation Flow**:
1. Create text node: `figma.createText()`
2. Load font: `figma.loadFontAsync(fontName)`
3. Set properties: `characters`, `fontSize`, `fills`
4. Position: `x`, `y`
5. Add to parent: `parent.appendChild(textNode)`

---

### Phase 4: Node Property Modification ⏳

#### Tool: `rename_node`
**Purpose**: Change node name

**Figma Implementation**:
```javascript
const node = figma.getNodeById(nodeId);
node.name = newName;
```

**Bulk Rename Support**:
```javascript
// Rename multiple nodes with pattern
nodes.forEach((node, index) => {
  node.name = `${prefix} ${index + 1}`;
});
```

#### Tool: `set_node_visibility`
**Purpose**: Show/hide nodes

```javascript
node.visible = isVisible;
```

#### Tool: `set_node_lock`
**Purpose**: Lock/unlock nodes

```javascript
node.locked = isLocked;
```

---

### Phase 5: Event Listeners & Real-time Sync ⏳

#### Implementation: Event Broadcasting

**Figma Plugin Side**:
```javascript
// Listen for selection changes
figma.on('selectionchange', () => {
  const selection = figma.currentPage.selection;
  // Send to MCP server via WebSocket
  ws.send(JSON.stringify({
    type: 'event',
    event: 'selectionchange',
    data: serializeSelection(selection)
  }));
});

// Listen for page changes
figma.on('currentpagechange', () => {
  ws.send(JSON.stringify({
    type: 'event',
    event: 'pagechange',
    data: { pageName: figma.currentPage.name }
  }));
});
```

**MCP Server Side**:
```javascript
// Store WebSocket connection reference
let figmaConnection = null;

wss.on("connection", (ws) => {
  figmaConnection = ws;

  ws.on("message", (message) => {
    const data = JSON.parse(message.toString());
    if (data.type === 'event') {
      // Broadcast event to Claude Desktop
      // (Note: stdio transport is unidirectional)
      // Store event in buffer for next tool call response
      eventBuffer.push(data);
    }
  });
});
```

**Challenges**:
- Stdio transport is request-response only (no server→client push)
- Need to poll for events or include in tool responses
- WebSocket can push events to Figma in real-time

---

## Data Flow Diagrams

### Tool Call Flow (Claude → Figma)

```
1. User → Claude Desktop
   "Get the selected text layers"

2. Claude Desktop → MCP Server (stdio)
   {
     "method": "tools/call",
     "params": {
       "name": "get_selection",
       "arguments": { "filter": "TEXT" }
     }
   }

3. MCP Server → Figma Plugin (WebSocket)
   {
     "type": "tool_request",
     "tool": "get_selection",
     "args": { "filter": "TEXT" }
   }

4. Figma Plugin (code.js)
   - Executes: figma.currentPage.selection
   - Filters: node.type === "TEXT"
   - Serializes data

5. Figma Plugin → MCP Server (WebSocket)
   {
     "type": "tool_response",
     "data": [
       { id: "1:234", name: "Title", text: "..." },
       { id: "1:235", name: "Subtitle", text: "..." }
     ]
   }

6. MCP Server → Claude Desktop (stdio)
   {
     "content": [{
       "type": "text",
       "text": "Found 2 text layers:\n1. Title: '...'\n2. Subtitle: '...'"
     }]
   }

7. Claude → User
   "I found 2 text layers in your selection..."
```

### Event Flow (Figma → Claude)

```
1. User selects node in Figma

2. Figma Plugin
   figma.on('selectionchange') triggered

3. Figma Plugin → MCP Server (WebSocket)
   {
     "type": "event",
     "event": "selectionchange",
     "data": { selectedIds: ["1:234"] }
   }

4. MCP Server
   - Stores event in buffer
   - (Cannot push to Claude via stdio)

5. Next tool call includes event context
   OR: polling tool "get_recent_events"
```

---

## Communication Protocols

### WebSocket Message Format

**Request from MCP Server to Figma**:
```json
{
  "id": "request-uuid",
  "type": "tool_request",
  "tool": "get_selection",
  "args": {
    "includeChildren": true
  }
}
```

**Response from Figma to MCP Server**:
```json
{
  "id": "request-uuid",
  "type": "tool_response",
  "success": true,
  "data": {
    "selection": [...]
  }
}
```

**Error Response**:
```json
{
  "id": "request-uuid",
  "type": "tool_response",
  "success": false,
  "error": "No selection found"
}
```

### MCP Protocol (stdio)

**Tool List Request**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

**Tool List Response**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "get_selection",
        "description": "...",
        "inputSchema": {...}
      }
    ]
  }
}
```

**Tool Call**:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_selection",
    "arguments": {}
  }
}
```

---

## Error Handling Strategy

### Figma Plugin Errors

1. **Font Loading Errors**
   ```javascript
   try {
     await figma.loadFontAsync(fontName);
   } catch (error) {
     return { error: `Font not available: ${fontName}` };
   }
   ```

2. **Node Not Found**
   ```javascript
   const node = figma.getNodeById(id);
   if (!node) {
     return { error: `Node ${id} not found` };
   }
   ```

3. **Permission Errors**
   ```javascript
   if (node.locked) {
     return { error: `Node is locked: ${node.name}` };
   }
   ```

### MCP Server Errors

1. **WebSocket Connection**
   ```javascript
   if (!figmaConnection || figmaConnection.readyState !== WebSocket.OPEN) {
     throw new Error("Figma plugin not connected");
   }
   ```

2. **Timeout Handling**
   ```javascript
   const response = await Promise.race([
     waitForFigmaResponse(requestId),
     timeout(5000)
   ]);
   ```

3. **Tool Not Found**
   ```javascript
   if (!TOOL_HANDLERS[toolName]) {
     throw new Error(`Unknown tool: ${toolName}`);
   }
   ```

---

## State Management

### Server State

```typescript
interface ServerState {
  // WebSocket connection to Figma
  figmaConnection: WebSocket | null;

  // Pending requests awaiting response
  pendingRequests: Map<string, PendingRequest>;

  // Event buffer for Figma events
  eventBuffer: FigmaEvent[];

  // Connection status
  isConnected: boolean;
}
```

### Request Tracking

```typescript
interface PendingRequest {
  id: string;
  toolName: string;
  timestamp: number;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}
```

---

## Security Considerations

1. **Network Access**
   - WebSocket server only on localhost (127.0.0.1)
   - No external network access required
   - Figma plugin cannot access arbitrary domains

2. **Data Sanitization**
   - Validate all incoming WebSocket messages
   - Sanitize node names and text content
   - Prevent injection attacks in text operations

3. **Permission Model**
   - Figma plugin runs in sandbox
   - Cannot access filesystem
   - Cannot make arbitrary network requests
   - Limited to Figma API surface

4. **Authentication**
   - No authentication required (localhost only)
   - Could add token-based auth for production

---

## Performance Optimization

### 1. Batch Operations

Instead of:
```javascript
// Bad: Multiple round trips
for (const id of nodeIds) {
  const node = await getNode(id);
}
```

Do:
```javascript
// Good: Single batch request
const nodes = await getNodes(nodeIds);
```

### 2. Lazy Loading

```javascript
// Only load full properties when requested
{
  id: "1:234",
  name: "Frame",
  type: "FRAME",
  _hasChildren: true  // Flag, don't load children yet
}
```

### 3. Caching

```javascript
// Cache frequently accessed nodes
const nodeCache = new Map<string, NodeData>();
```

### 4. Selective Serialization

```javascript
// Don't serialize everything
function serializeNode(node, options) {
  const data = { id: node.id, name: node.name };

  if (options.includePosition) {
    data.x = node.x;
    data.y = node.y;
  }

  if (options.includeSize) {
    data.width = node.width;
    data.height = node.height;
  }

  return data;
}
```