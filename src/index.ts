#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import cors from "cors";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { randomUUID } from "crypto";

const WS_PORT = 3000;
const REQUEST_TIMEOUT = 5000; // 5 seconds

// ============================================================================
// TypeScript Interfaces for WebSocket Protocol
// ============================================================================

/**
 * Request sent from MCP server to Figma plugin
 */
interface FigmaToolRequest {
  id: string;
  type: "tool_request";
  tool: string;
  args: Record<string, any>;
}

/**
 * Response sent from Figma plugin to MCP server
 */
interface FigmaToolResponse {
  id: string;
  type: "tool_response";
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Event sent from Figma plugin to MCP server (future use)
 */
interface FigmaEvent {
  type: "event";
  event: string;
  data: any;
}

/**
 * Union type for all WebSocket messages
 */
type WebSocketMessage = FigmaToolRequest | FigmaToolResponse | FigmaEvent;

/**
 * Pending request tracking
 */
interface PendingRequest {
  id: string;
  toolName: string;
  timestamp: number;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

// ============================================================================
// Server State Management
// ============================================================================

/**
 * Global server state
 */
const serverState = {
  figmaConnection: null as WebSocket | null,
  pendingRequests: new Map<string, PendingRequest>(),
  isConnected: false,
};

/**
 * Check if Figma plugin is connected
 */
function isFigmaConnected(): boolean {
  return serverState.figmaConnection !== null &&
         serverState.figmaConnection.readyState === WebSocket.OPEN;
}

// ============================================================================
// Tool-to-WebSocket Bridge
// ============================================================================

/**
 * Send a tool request to Figma plugin and wait for response
 * @param toolName - Name of the tool to execute
 * @param args - Tool arguments
 * @returns Promise that resolves with the tool response data
 * @throws Error if Figma is not connected or request times out
 */
async function sendToFigma(toolName: string, args: Record<string, any>): Promise<any> {
  // Check connection
  if (!isFigmaConnected()) {
    throw new Error("Figma plugin is not connected. Please open Figma and run the MCP plugin.");
  }

  // Generate unique request ID
  const requestId = randomUUID();

  // Create promise that will be resolved when response arrives
  return new Promise((resolve, reject) => {
    // Set up timeout
    const timeout = setTimeout(() => {
      // Clean up
      serverState.pendingRequests.delete(requestId);
      reject(new Error(`Request timeout: Figma did not respond within ${REQUEST_TIMEOUT}ms`));
    }, REQUEST_TIMEOUT);

    // Store pending request
    serverState.pendingRequests.set(requestId, {
      id: requestId,
      toolName,
      timestamp: Date.now(),
      resolve,
      reject,
      timeout,
    });

    // Send request to Figma via WebSocket
    const request: FigmaToolRequest = {
      id: requestId,
      type: "tool_request",
      tool: toolName,
      args,
    };

    try {
      serverState.figmaConnection!.send(JSON.stringify(request));
      console.error(`Sent tool request to Figma: ${toolName} (id: ${requestId})`);
    } catch (error) {
      // Clean up on send error
      clearTimeout(timeout);
      serverState.pendingRequests.delete(requestId);
      reject(new Error(`Failed to send request to Figma: ${error}`));
    }
  });
}

/**
 * Handle response from Figma plugin
 * @param response - Tool response from Figma
 */
function handleFigmaResponse(response: FigmaToolResponse): void {
  const pending = serverState.pendingRequests.get(response.id);

  if (!pending) {
    console.error(`Received response for unknown request: ${response.id}`);
    return;
  }

  // Clean up timeout
  clearTimeout(pending.timeout);
  serverState.pendingRequests.delete(response.id);

  // Resolve or reject the promise
  if (response.success) {
    console.error(`Tool ${pending.toolName} succeeded (id: ${response.id})`);
    pending.resolve(response.data);
  } else {
    console.error(`Tool ${pending.toolName} failed: ${response.error} (id: ${response.id})`);
    pending.reject(new Error(response.error || "Unknown error from Figma"));
  }
}

// Create MCP server instance
const server = new Server(
  {
    name: "figma-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "ping",
        description: "Test the MCP server connection. Returns a pong message with timestamp.",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Optional message to echo back"
            }
          }
        }
      }
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "ping") {
      // Test the full round-trip: Claude → MCP → WebSocket → Figma → WebSocket → MCP → Claude
      const message = (args as any)?.message || "Hello from Claude Desktop!";

      // Send request to Figma
      const result = await sendToFigma("ping", { message });

      return {
        content: [
          {
            type: "text",
            text: `🏓 PONG! Full round-trip successful!\n\n` +
                  `Your message: "${message}"\n` +
                  `Figma response: ${result.message}\n` +
                  `Figma timestamp: ${result.timestamp}\n` +
                  `Figma version: ${result.figmaVersion}\n` +
                  `MCP Server: figma-mcp-server v1.0.0`
          }
        ]
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    // Return user-friendly error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error executing tool "${name}": ${errorMessage}`
        }
      ],
      isError: true
    };
  }
});

// Start WebSocket server for Figma plugin
async function startWebSocketServer() {
  const app = express();
  app.use(cors());

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({ status: "ok", server: "figma-mcp-server" });
  });

  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  wss.on("connection", (ws) => {
    console.error("Figma plugin connected via WebSocket");

    // Store connection reference
    serverState.figmaConnection = ws;
    serverState.isConnected = true;

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString()) as WebSocketMessage;
        console.error(`Received from Figma: ${data.type}`);

        // Route message based on type
        if (data.type === "tool_response") {
          // Handle tool response from Figma
          handleFigmaResponse(data as FigmaToolResponse);
        } else if (data.type === "event") {
          // Handle Figma events (future use)
          console.error(`Figma event: ${(data as FigmaEvent).event}`, (data as FigmaEvent).data);
        } else {
          console.error("Unknown message type from Figma:", data);
        }
      } catch (error) {
        console.error("Error parsing message from Figma:", error);
      }
    });

    ws.on("close", () => {
      console.error("Figma plugin disconnected");
      serverState.figmaConnection = null;
      serverState.isConnected = false;

      // Reject all pending requests
      for (const [id, pending] of serverState.pendingRequests.entries()) {
        clearTimeout(pending.timeout);
        pending.reject(new Error("Figma plugin disconnected"));
        serverState.pendingRequests.delete(id);
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    // Send welcome message
    ws.send(JSON.stringify({ type: "welcome", message: "Connected to MCP server" }));
  });

  httpServer.listen(WS_PORT, () => {
    console.error(`WebSocket server for Figma plugin running on ws://localhost:${WS_PORT}`);
  });
}

// Start the server
async function main() {
  // Check mode: use --websocket flag for WebSocket-only mode (for testing)
  const useWebSocketOnly = process.argv.includes('--websocket');

  if (useWebSocketOnly) {
    // Standalone WebSocket mode for testing/development
    console.error("Starting Figma MCP server in WebSocket-only mode...");
    await startWebSocketServer();
    console.error("Server ready for Figma plugin connections");
  } else {
    // Dual mode: Stdio for Claude Desktop + WebSocket for Figma plugin
    // This allows Claude Desktop to communicate with Figma through the same process
    console.error("Starting Figma MCP server in dual mode (stdio + WebSocket)...");

    // Start WebSocket server for Figma plugin connection
    await startWebSocketServer();
    console.error("WebSocket server started for Figma plugin");

    // Connect to Claude Desktop via stdio
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Stdio transport connected for Claude Desktop");
    console.error("Server ready: Claude Desktop ←→ MCP Server ←→ Figma Plugin");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
