# Figma Plugin API - Available Functions

This document lists the main functions available in the Figma Plugin API that we can expose through the MCP server.

## Global `figma` Object

The main API is accessed through the global `figma` object available in plugin code.

---

## 1. Selection & Current Context

### Selection
- `figma.currentPage.selection` - Array of currently selected nodes
- `figma.on('selectionchange', callback)` - Listen for selection changes

### Current Page
- `figma.currentPage` - Get/set the current page
- `figma.setCurrentPageAsync(page)` - Switch to a different page
- `figma.root` - Access the document root

---

## 2. Creating Nodes

### Basic Shapes
- `figma.createRectangle()` - Create a rectangle
- `figma.createEllipse()` - Create an ellipse/circle
- `figma.createPolygon()` - Create a polygon
- `figma.createStar()` - Create a star shape
- `figma.createLine()` - Create a line
- `figma.createVector()` - Create a vector path

### Containers
- `figma.createFrame()` - Create a frame (container)
- `figma.createGroup()` - Create a group
- `figma.createPage()` - Create a new page
- `figma.createSection()` - Create a section

### Text
- `figma.createText()` - Create a text layer
- `figma.createShapeWithText()` - Create shape with text inside

### Components
- `figma.createComponent()` - Create a component
- `figma.createComponentSet()` - Create a component set
- `figma.createComponentFromNode(node)` - Convert node to component
- `figma.createInstance(component)` - Create component instance

### Other
- `figma.createSlice()` - Create a slice (export region)
- `figma.createSticky()` - Create sticky note (FigJam)
- `figma.createConnector()` - Create connector line (FigJam)
- `figma.createTable()` - Create table (FigJam)

---

## 3. Node Manipulation

### Grouping & Organization
- `figma.group(nodes, parent, index?)` - Group nodes together
- `figma.ungroup(node)` - Ungroup a group node

### Boolean Operations
- `figma.union(nodes, parent)` - Combine shapes with union
- `figma.subtract(nodes, parent)` - Subtract top shapes from bottom
- `figma.intersect(nodes, parent)` - Keep only overlapping areas
- `figma.exclude(nodes, parent)` - Remove overlapping areas
- `figma.flatten(nodes)` - Flatten to vector

---

## 4. Node Properties (Common)

All nodes support these properties:

### Identification
- `node.id` - Unique identifier
- `node.name` - Layer name
- `node.type` - Node type (e.g., "FRAME", "TEXT", "RECTANGLE")

### Hierarchy
- `node.parent` - Parent node
- `node.children` - Child nodes (for container types)
- `node.remove()` - Delete the node

### Position & Size
- `node.x`, `node.y` - Position coordinates
- `node.width`, `node.height` - Dimensions
- `node.resize(width, height)` - Resize node
- `node.resizeWithoutConstraints(width, height)` - Resize ignoring constraints

### Visibility & Locking
- `node.visible` - Visibility state
- `node.locked` - Lock state

---

## 5. Frame/Container Specific

- `frame.appendChild(child)` - Add child node
- `frame.insertChild(index, child)` - Insert at index
- `frame.findOne(callback)` - Find first matching child
- `frame.findAll(callback)` - Find all matching children
- `frame.children` - Array of child nodes

---

## 6. Text Node Specific

### Content
- `textNode.characters` - Get/set text content
- `textNode.insertCharacters(start, characters)` - Insert text
- `textNode.deleteCharacters(start, end)` - Delete text range

### Styling (requires loading font first)
- `textNode.fontName` - Font family and style
- `textNode.fontSize` - Font size
- `textNode.textAlignHorizontal` - Horizontal alignment
- `textNode.textAlignVertical` - Vertical alignment
- `textNode.textDecoration` - Underline/strikethrough
- `textNode.letterSpacing` - Letter spacing
- `textNode.lineHeight` - Line height

### Font Loading
- `figma.loadFontAsync(fontName)` - Must load before editing text

---

## 7. Styling

### Fill & Stroke
- `node.fills` - Array of fill paints
- `node.strokes` - Array of stroke paints
- `node.strokeWeight` - Stroke width
- `node.strokeAlign` - Stroke alignment (INSIDE/OUTSIDE/CENTER)

### Effects
- `node.effects` - Array of effects (shadows, blurs)

### Corner Radius (for rectangles/frames)
- `node.cornerRadius` - Corner radius
- `node.topLeftRadius`, `node.topRightRadius`, etc. - Individual corners

---

## 8. Export

- `node.exportAsync(settings)` - Export node as image
  - Settings: `format` (PNG, JPG, SVG, PDF), `scale`, `constraint`

---

## 9. Document Information

- `figma.root` - Document root
- `figma.root.name` - File name
- `figma.root.children` - All pages
- `figma.currentPage` - Active page
- `figma.viewport` - Viewport info (center, zoom)

---

## 10. UI & Notifications

### User Feedback
- `figma.notify(message, options?)` - Show notification toast
  - Options: `timeout` (ms), `error` (boolean)

### Plugin UI
- `figma.showUI(html, options?)` - Show plugin UI
- `figma.ui.postMessage(message)` - Send message to UI
- `figma.ui.onmessage = callback` - Receive message from UI
- `figma.ui.resize(width, height)` - Resize UI window
- `figma.closePlugin(message?)` - Close the plugin

---

## 11. Events

- `figma.on('selectionchange', callback)` - Selection changed
- `figma.on('currentpagechange', callback)` - Page changed
- `figma.on('close', callback)` - Plugin closing
- `figma.on('run', callback)` - Plugin starting
- `figma.once(event, callback)` - One-time event
- `figma.off(event, callback)` - Remove listener

---

## 12. Viewport & Navigation

- `figma.viewport.center` - Current viewport center
- `figma.viewport.zoom` - Current zoom level
- `figma.viewport.scrollAndZoomIntoView(nodes)` - Focus on nodes

---

## 13. Plugin Data & Storage

- `node.setPluginData(key, value)` - Store data on node
- `node.getPluginData(key)` - Retrieve stored data
- `node.setSharedPluginData(namespace, key, value)` - Shared storage
- `node.getSharedPluginData(namespace, key)` - Retrieve shared data

---

## 14. Undo/Redo

- `figma.commitUndo()` - Save undo point
- `figma.triggerUndo()` - Undo last action

---

## Priority Functions for MCP Integration

Based on common use cases, we should prioritize:

1. **Selection**: Get/set current selection
2. **Text Creation**: Create and edit text layers
3. **Shape Creation**: Create basic shapes (rectangles, frames)
4. **Node Properties**: Read/write name, position, size, visibility
5. **Export**: Export selected nodes as images
6. **Document Info**: Get page info, layer structure
7. **Notifications**: Send feedback to user

These will provide the most value for Claude Desktop to interact with Figma.
