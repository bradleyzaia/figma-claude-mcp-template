# Figma Claude MCP Template

## Project Overview

This repository provides a **Model Context Protocol (MCP) server template** that bridges **Claude Desktop** and **Figma**, enabling AI-powered design automation and interaction through a WebSocket-connected Figma plugin.

### Current Status

**Development Phase**: Pre-Alpha (v0.1.0)

**Implemented**:
- ✓ Basic MCP server architecture with dual transport (stdio + WebSocket)
- ✓ Figma plugin skeleton with WebSocket connectivity
- ✓ Project structure and build system

**In Progress**:
- 🔄 Core Figma interaction tools (see [docs/executionplan.md](docs/executionplan.md))

**Planned**:
- ⏳ Selection & navigation tools (Phase 1)
- ⏳ Node scanning & property reading (Phase 2)
- ⏳ Text operations (Phase 3)
- ⏳ Node property modification (Phase 4)
- ⏳ Event listeners & real-time sync (Phase 5)

For detailed implementation plans, see [docs/executionplan.md](docs/executionplan.md).

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
  version: "0.1.0"
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

### Claude Desktop Configuration

Add to your `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "figma-mcp-server": {
      "command": "node",
      "args": ["/path/to/figma-claude-mcp-template/build/index.js"]
    }
  }
}
```

**Important**:
- Replace `/path/to/` with your actual path
- Restart Claude Desktop after config changes
- Don't run `npm start` manually - Claude Desktop manages the server

---

## File Structure

```
figma-claude-mcp-template/
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
│   └── executionplan.md         # Feature implementation roadmap
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

### Distribution (Planned)

> **Note**: These features are planned for future releases (v1.0.0+)

1. **NPM Package**: Publish as `figma-claude-mcp-template`
2. **Figma Plugin**: Submit to Figma Community
3. **Documentation**: Comprehensive setup guide

### Installation Steps

```bash
# 1. Clone the template
git clone https://github.com/bradleyzaia/figma-claude-mcp-template.git
cd figma-claude-mcp-template

# 2. Install dependencies
npm install

# 3. Build the project
npm run build
```

**4. Configure Claude Desktop**

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "figma-mcp-server": {
      "command": "node",
      "args": ["/absolute/path/to/figma-claude-mcp-template/build/index.js"]
    }
  }
}
```

Replace `/absolute/path/to/` with your actual project path.

**5. Install Figma Plugin**

1. Open Figma Desktop
2. Go to **Plugins** → **Development** → **Import plugin from manifest**
3. Select `figma-plugin/manifest.json` from your project directory
4. Run the plugin and click **Connect**

**6. Test the Connection**

1. Restart Claude Desktop (to load the new MCP config)
2. Open the Figma plugin and click "Connect"
3. Ask Claude Desktop: "Use the ping tool to test the Figma connection"
4. You should see a successful round-trip response!


---

## Known Limitations

1. **Stdio Limitation**: Cannot push events from server to Claude (request-response only)
2. **Font Requirement**: Must load fonts before editing text
3. **Sandbox Restrictions**: Figma plugin has limited API access
4. **Single Instance**: Only one Figma plugin connection at a time
5. **No File Operations**: Cannot open/save Figma files programmatically

---

## Contributing

This is an open-source template project. Contributions welcome!

**Getting Started**:
1. Fork the repository at [github.com/bradleyzaia/figma-claude-mcp-template](https://github.com/bradleyzaia/figma-claude-mcp-template)
2. Create feature branch from `main`
3. Implement changes following the code style below
4. Submit pull request

**Code Style**:
- TypeScript with strict mode
- Conventional commits
- Comprehensive JSDoc comments

---

## License

MIT License - Feel free to use this template for your own projects!
