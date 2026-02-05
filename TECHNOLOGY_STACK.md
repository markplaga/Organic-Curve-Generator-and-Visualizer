# Technology Stack & Architecture

This project is built as a lightweight, framework-less web application, prioritizing performance, precision, and ease of deployment.

## Core Technologies

- **Vanilla JavaScript (ES6+)**: The logic is written in pure JavaScript using **ES Modules** for clean separation of concerns.
- **HTML5 & CSS3**: Utilizes modern UI patterns including CSS variables, Flexbox/Grid layout, and glassmorphic design elements.
- **Scalable Vector Graphics (SVG)**: The primary engine for both the interactive editor and the final export. SVG allows for sub-pixel precision and direct mapping to physical units (inches).

## Architecture & Implementation

### 1. State Management
- **Reactive State**: A centralized state object manages point data, scaling parameters, and viewport status.
- **Observer Pattern**: A custom `subscribe`/`notify` mechanism ensures that any state change (dragging a point, moving a slider) triggers an immediate, efficient re-render of the SVG.

### 2. Mathematics & Geometry
- **Spline Logic**: Implements a custom Catmull-Rom spline algorithm. Each segment is converted to a Cubic Bezier path (`C` command in SVG `d` attribute) for native browser rendering.
- **Affine Transformations**: Scaling logic uses vector math to project points towards the convergence coordinate `C` using the formula: `P' = C + s * (P - C)`.
- **Bounding Box Calculation**: Uses the convex hull of control points for fast, reliable calculation of shape dimensions, used for termination logic and export viewport fitting.

### 3. User Interaction
- **Matrix Transformations**: Zooming and panning are handled by calculating inverse transformation matrices for the SVG's `ScreenCTM`, ensuring mouse interactions are always accurately mapped to the internal inch-based coordinate system.
- **Event Handling**: Robust handling of mouse and wheel events for a desktop-class editing experience.

### 4. File Organization
- `index.html`: Entry point and UI structure.
- `style.css`: All visual styling and layout.
- `js/main.js`: Main application loop, event listeners, and UI binding.
- `js/state.js`: Data structures and state mutation logic.
- `js/math.js`: Pure geometric functions and path string generation.
- `js/export.js`: Logic for generating and downloading the final SVG file.
