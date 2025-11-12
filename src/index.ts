#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import http from "http";

const WS_PORT = 3000;

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

  if (name === "ping") {
    const message = (args as any)?.message || "Hello from Claude Desktop!";
    return {
      content: [
        {
          type: "text",
          text: `🏓 PONG! Server is working!\n\nYour message: "${message}"\nTimestamp: ${new Date().toISOString()}\nServer: figma-mcp-server v1.0.0`
        }
      ]
    };
  }

  throw new Error(`Unknown tool: ${name}`);
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

    ws.on("message", (message) => {
      console.error("Received from Figma:", message.toString());
      // Echo back for now
      ws.send(JSON.stringify({ type: "pong", message: "Connection established" }));
    });

    ws.on("close", () => {
      console.error("Figma plugin disconnected");
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
  // Check mode: use --websocket flag for WebSocket mode, otherwise stdio
  const useWebSocket = process.argv.includes('--websocket');

  if (useWebSocket) {
    // Standalone WebSocket mode for Figma plugin
    console.error("Starting Figma MCP server in WebSocket mode...");
    await startWebSocketServer();
    console.error("Server ready for Figma plugin connections");
  } else {
    // Stdio mode for Claude Code
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Figma MCP server running on stdio for Claude Code");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
