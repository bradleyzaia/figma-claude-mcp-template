# Testing Guide

This guide will help you test the complete setup: MCP Server + Figma Plugin + Claude Code.

## Prerequisites

1. Figma Desktop app installed
2. Claude Desktop app installed (with Claude Code)
3. Node.js installed

## Step-by-Step Testing

### Phase 1: Test MCP Server (Standalone Mode)

1. **Start the WebSocket server:**
   ```bash
   cd /Users/x/Desktop/text-asset-mcp2
   npm start
   ```

   You should see:
   ```
   Starting Figma MCP server in WebSocket mode...
   Server ready for Figma plugin connections
   WebSocket server for Figma plugin running on ws://localhost:3000
   ```

2. **Keep this terminal open** - the server needs to be running for the Figma plugin to connect.

### Phase 2: Test Figma Plugin Connection

1. **Open Figma Desktop app**

2. **Import the plugin:**
   - Go to **Plugins** > **Development** > **Import plugin from manifest...**
   - Navigate to `/Users/x/Desktop/text-asset-mcp2/figma-plugin/`
   - Select `manifest.json`
   - Click **Open**

3. **Run the plugin:**
   - In any Figma file, go to **Plugins** > **Development** > **Figma MCP Client**
   - The plugin UI should appear with:
     - Status: "Ready to connect"
     - Gray status indicator
     - "Connect to MCP Server" button

4. **Test the connection:**
   - Click **Connect to MCP Server**
   - Watch the status change to "Connecting..." (orange indicator)
   - If successful, status should change to "Connected" (green indicator)
   - Check the terminal where the server is running - you should see:
     ```
     Figma plugin connected via WebSocket
     Received from Figma: {"type":"ping","from":"figma-plugin"}
     ```

5. **Test disconnect:**
   - Click **Disconnect** button
   - Status should change back to "Disconnected" (gray indicator)
   - Terminal should show: `Figma plugin disconnected`

### Phase 3: Test Claude Code Connection

1. **Restart Claude Desktop app** (required after config changes)

2. **Open Claude Code** in your terminal or through Claude Desktop

3. **Check if the MCP server is loaded:**
   - Claude Code should automatically connect to the MCP server via stdio
   - The server will run in stdio mode when invoked by Claude

4. **Note:** When Claude Code is using the MCP server, it runs in stdio mode (not WebSocket mode). To use both simultaneously, you would need to run the WebSocket server separately.

## Connection Modes

The MCP server supports two modes:

### Stdio Mode (for Claude Code)
- Automatically activated when invoked by Claude Code
- Uses standard input/output for communication
- No WebSocket server running

### Standalone Mode (for Figma Plugin)
- Activated when running `npm start` directly
- Runs WebSocket server on port 3000
- Figma plugin connects via WebSocket

## Troubleshooting

### Figma Plugin Cannot Connect

**Problem:** Status shows "Connection error" or stays on "Connecting..."

**Solutions:**
1. Ensure the server is running (`npm start`)
2. Check that port 3000 is not in use: `lsof -i :3000`
3. Check server terminal for error messages
4. Try reloading the plugin in Figma

### Claude Code Doesn't See the Server

**Problem:** MCP server not available in Claude Code

**Solutions:**
1. Verify config file: `cat ~/Library/Application\ Support/Claude/claude_desktop_config.json`
2. Check the path in the config matches your installation
3. Restart Claude Desktop app completely (quit and reopen)
4. Check Claude Code logs for MCP connection errors

### Port 3000 Already in Use

**Problem:** Server fails to start with "EADDRINUSE" error

**Solutions:**
1. Find what's using port 3000: `lsof -i :3000`
2. Kill the process: `kill -9 <PID>`
3. Or change the port in `src/index.ts` (update `WS_PORT` constant)

## Current Limitations

- Server can run in either stdio mode (Claude Code) OR WebSocket mode (Figma), not both simultaneously
- No MCP tool functions implemented yet (coming in next phase)
- Figma plugin doesn't yet interact with Figma API (coming in next phase)

## Success Criteria

✅ **Phase 1 Success:** Server starts and shows "WebSocket server running"
✅ **Phase 2 Success:** Figma plugin connects and shows green "Connected" status
✅ **Phase 3 Success:** Claude Code recognizes the figma-mcp-server in its MCP servers list

## Next Development Steps

After confirming all phases work:
1. Add MCP tool functions to the server
2. Implement Figma API integration in the plugin
3. Create bidirectional communication between Claude Code and Figma
