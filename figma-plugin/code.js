// This file runs in the Figma plugin sandbox
// It handles communication between the UI and Figma's API

// Show the plugin UI
figma.showUI(__html__, { width: 300, height: 200 });

// Listen for messages from the UI
figma.ui.onmessage = msg => {
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
};
