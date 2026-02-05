# Project State: Organic Curve Generator

The **Organic Curve Generator** is a specialized web application designed to create nested, organic shapes suitable for laser cutting and artistic design.

## Core Features

- **Dynamic Curve Creation**: 
  - Users create a base shape by placing points on a 2D canvas.
  - The application automatically generates a smooth, closed-loop curve using Catmull-Rom splines (converted to Cubic Bezier segments).
- **Concentric Nesting**:
  - Automatically generates multiple internal/external "nested" curves.
  - Curves are scaled towards a user-definable **Convergence Point**.
  - Users can adjust the **Start Scale** (outermost transition) and **End Scale** (innermost transition).
- **Interactive Editor**:
  - **Point Manipulation**: Drag points to reshape the curve in real-time.
  - **Point Management**: Left-click to add points; Double-click or use the UI panel to delete points.
  - **Convergence Control**: Drag the crosshair to change the "vanishing point" of the nested shapes.
- **Advanced Viewport**:
  - **Smooth Zooming**: Scroll wheel zooming centered at the mouse cursor.
  - **Panning**: Support for middle-click or Shift+drag panning.
  - **Unit-Based Coordinates**: All measurements and readouts are in physical inches (in).
- **Production Export**:
  - **SVG Download**: Generates a high-precision SVG file.
  - **Laser Ready**: Exported paths have no fill and a fixed 0.01" stroke width (black), ideal for laser software.
- **UI & Experience**:
  - Real-time previews of all changes.
  - Coordinate readout for precision placement.
  - "Emphasize Base" mode for clear visualization of the primary geometry.
