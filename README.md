# Figma/Claude MCP Server Template
# Technical Scope

## Project Overview

This repository implements a **Model Context Protocol (MCP) server** that bridges **Claude Desktop** and **Figma**, enabling AI-powered design automation and interaction through a WebSocket-connected Figma plugin.

---

## Architecture Overview

```
┌──────────────────┐         stdio          ┌──────────────────┐         WebSocket        ┌──────────────────┐
│                  │  (Standard I/O IPC)     │                  │     (ws://localhost:3000) │                  │
│  Claude Desktop  │◄───────────────────────►│   MCP Server     │◄────────────────────────►│  Figma Plugin    │
│                  │                         │  (Node.js/TS)    │                          │   (Sandbox)      │
│  - Claude AI     │                         │                  │                          │                  │
│  - MCP Client    │                         │  Dual Transport: │                          │  - Figma API     │
│  - Tool Calling  │                         │  • stdio mode    │                          │  - UI (HTML/JS)  │
│                  │                         │  • WebSocket     │                          │  - Node Access   │
└──────────────────┘                         └──────────────────┘                          └──────────────────┘
```

### Key Components

1. **MCP Server** (`src/index.ts`)
   - Built with `@modelcontextprotocol/sdk`
   - Dual-mode operation: stdio (Claude) + WebSocket (Figma)
   - Tool registry and request handlers
   - Express-based HTTP server for WebSocket

2. **Figma Plugin** (`figma-plugin/`)
   - Runs in Figma's sandboxed environment
   - WebSocket client for MCP server communication
   - Access to Figma Plugin API
   - HTML/CSS/JavaScript UI

3. **Claude Desktop Integration**
   - Configured via `claude_desktop_config.json`
   - Invokes server in stdio mode
   - Discovers and calls MCP tools

---

## Technical Implementation Details

### 1. MCP Server Architecture

#### Transport Layer

**Stdio Transport (Claude Desktop)**
```typescript
// Activated when: No --websocket flag
// Communication: Standard input/output streams (IPC)
// Use case: Claude Desktop invokes server as subprocess
const transport = new StdioServerTransport();
await server.connect(transport);
```

**WebSocket Transport (Figma Plugin)**
```typescript
// Activated when: --websocket flag present
// Communication: WebSocket protocol on port 3000
// Use case: Browser-based Figma plugin connectivity
const wss = new WebSocketServer({ server: httpServer });
httpServer.listen(3000);
```

#### Server Configuration

```typescript
const server = new Server({
  name: "figma-mcp-server",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {}  // Tool calling enabled
  }
});
```

#### Request Handlers

1. **ListToolsRequestSchema**: Returns available tools to Claude
2. **CallToolRequestSchema**: Executes tool calls with parameters

### 2. Figma Plugin Architecture

#### File Structure
```
figma-plugin/
├── manifest.json      # Plugin configuration & permissions
├── code.js           # Main plugin code (Figma API access)
└── ui.html           # Plugin UI (WebSocket client)
```

#### Manifest Configuration
```json
{
  "name": "Figma MCP Client",
  "api": "1.0.0",
  "main": "code.js",
  "ui": "ui.html",
  "networkAccess": {
    "allowedDomains": ["*"],
    "reasoning": "Connects to local MCP server"
  }
}
```

#### Communication Flow

**Plugin Code (code.js)** ←→ **UI (ui.html)** ←→ **MCP Server**

```javascript
// code.js → ui.html
figma.ui.postMessage({ type: 'data', payload: {...} });

// ui.html → code.js
parent.postMessage({ pluginMessage: {...} }, '*');

// ui.html → MCP Server
ws.send(JSON.stringify({ type: 'request', data: {...} }));
```


## Development Workflow

### Building & Running

```bash
# Install dependencies
npm install

# Build TypeScript → JavaScript
npm run build

# Run in WebSocket mode (for Figma plugin)
npm start

# Development mode (auto-rebuild)
npm run dev
```

### Testing Workflow

1. **Start WebSocket Server**
   ```bash
   npm start
   ```

2. **Open Figma Desktop**
   - Import plugin from `figma-plugin/manifest.json`
   - Run plugin, click "Connect"

3. **Test in Claude Desktop**
   - Restart Claude Desktop (loads MCP config)
   - Ask Claude to use figma-mcp-server tools
   - Server runs in stdio mode automatically

### Git Workflow

```
main           ─── Initial release
  │
  ├─ develop   ─── Integration branch
  │   │
  │   ├─ figma-functions  ─── Feature branch (current)
  │   │
  │   └─ other-features
  │
  └─ ...
```

---

## File Structure

```
text-asset-mcp2/
├── src/
│   └── index.ts                 # MCP server source (TypeScript)
├── build/
│   ├── index.js                 # Compiled server (JavaScript)
│   └── index.d.ts               # Type definitions
├── figma-plugin/
│   ├── manifest.json            # Figma plugin config
│   ├── code.js                  # Plugin backend (Figma API)
│   └── ui.html                  # Plugin UI (WebSocket client)
├── docs/
│   ├── EXECUTION_PLAN.md        # This file
│   ├── FIGMA_API_REFERENCE.md   # Figma API function reference
│   ├── TESTING.md               # Testing guide
│   └── SETUP_COMPLETE.md        # Setup instructions
├── package.json                 # Dependencies & scripts
├── tsconfig.json                # TypeScript configuration
├── .gitignore                   # Git ignore rules
└── README.md                    # Project overview
```

---

## Dependencies

### Production Dependencies
```json
{
  "@modelcontextprotocol/sdk": "^1.0.4",  // MCP protocol implementation
  "express": "^4.18.2",                    // HTTP server
  "cors": "^2.8.5",                        // CORS middleware
  "ws": "^8.16.0"                          // WebSocket server
}
```

### Development Dependencies
```json
{
  "@types/node": "^22.10.1",               // Node.js types
  "@types/express": "^4.17.21",            // Express types
  "@types/cors": "^2.8.17",                // CORS types
  "@types/ws": "^8.5.10",                  // WebSocket types
  "typescript": "^5.7.2"                   // TypeScript compiler
}
```

---

## Deployment Strategy

### Local Development
1. Run WebSocket server: `npm start`
2. Install Figma plugin manually
3. Claude Desktop uses local config

### Distribution
1. **NPM Package**: Publish as `@username/figma-mcp-server`
2. **Figma Plugin**: Submit to Figma Community
3. **Documentation**: Comprehensive setup guide

### Installation for End Users
```bash
# Install MCP server
npx @username/figma-mcp-server init

# Installs to user directory
# Adds to Claude Desktop config automatically
```


---

## Known Limitations

1. **Stdio Limitation**: Cannot push events from server to Claude (request-response only)
2. **Font Requirement**: Must load fonts before editing text
3. **Sandbox Restrictions**: Figma plugin has limited API access
4. **Single Instance**: Only one Figma plugin connection at a time
5. **No File Operations**: Cannot open/save Figma files programmatically

---

## Contact & Contribution

This is an open-source project. Contributions welcome!

**Getting Started**:
1. Fork the repository
2. Create feature branch from `develop`
3. Implement changes with tests
4. Submit pull request

**Code Style**:
- TypeScript with strict mode
- ESLint + Prettier
- Conventional commits
- Comprehensive JSDoc comments
