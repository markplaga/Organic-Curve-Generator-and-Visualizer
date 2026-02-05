
// State Management
export const state = {
    // Array of points {x, y} in inches
    points: [
        { x: 2, y: 5 },
        { x: 5, y: 2 },
        { x: 8, y: 5 },
        { x: 5, y: 8 } // Initial Diamond/Circle shape
    ],

    // Convergence Point
    convergence: { x: 5, y: 5 },

    // Parameters
    startScale: 0.9,
    endScale: 0.9,
    minSize: 1.0, // inches
    emphasizeBase: false,

    // 3D parameters
    viewMode: '2d', // '2d' | '3d'
    thickness: 0.11, // material thickness in inches
    zRise: 0.05,    // vertical step per rib in inches
    baseRotation: 0, // base rotation angle in degrees
    pivotStart: 0,   // pivot position along curve (0.0 to 1.0)
    pivotEnd: 0.2,   // pivot position along curve (0.0 to 1.0)
    gradientCenter: 0.5, // position of gradient center (0.0 = left, 1.0 = right)

    // Colors
    colorStart: '#646cff', // Default Primary Blue
    colorEnd: '#ff4488',   // Default Pink/Red
    colorSides: '#3d2817', // Default Dark Brown for extrusion sides

    // Editor State
    selectedPointIndex: -1,
    isDragging: false,
    dragTarget: null, // 'point' | 'convergence'
    dragIndex: -1,

    // Viewport
    viewport: { x: 0, y: 0, w: 20, h: 15 },

    // Pixels Per Inch (Display scaling)
    ppi: 40, // Zoom level implementation
    pan: { x: 0, y: 0 }
};

// Simple Event Bus for updates
const listeners = [];

export function subscribe(callback) {
    listeners.push(callback);
}

export function notify() {
    listeners.forEach(cb => cb(state));
}

export function setViewport(viewport) {
    state.viewport = viewport;
    notify();
}

// Actions
export function addPoint(x, y) {
    // Insert point at nearest segment (simplified to end for now, or sophisticated later)
    // For closed loops, inserting between nearest spatial neighbors is best.

    if (state.points.length < 3) {
        state.points.push({ x, y });
    } else {
        // Find insert index based on distance to segments
        let minDist = Infinity;
        let insertIdx = -1;

        for (let i = 0; i < state.points.length; i++) {
            const p1 = state.points[i];
            const p2 = state.points[(i + 1) % state.points.length];
            // dist to segment
            const d = distToSegment({ x, y }, p1, p2);
            if (d < minDist) {
                minDist = d;
                insertIdx = i + 1;
            }
        }
        state.points.splice(insertIdx, 0, { x, y });
    }
    notify();
}

export function updatePoint(index, x, y) {
    if (index >= 0 && index < state.points.length) {
        state.points[index] = { x, y };
        notify();
    }
}

export function setConvergence(x, y) {
    state.convergence = { x, y };
    notify();
}

export function deletePoint(index) {
    if (state.points.length > 3) {
        state.points.splice(index, 1);
        state.selectedPointIndex = -1;
        notify();
    }
}

export function setStartScale(val) {
    state.startScale = val;
    notify();
}

export function setEndScale(val) {
    state.endScale = val;
    notify();
}

export function setMinSize(val) {
    state.minSize = val;
    notify();
}

export function setEmphasis(val) {
    state.emphasizeBase = val;
    notify();
}

export function setViewMode(mode) {
    state.viewMode = mode;
    notify();
}

export function setThickness(val) {
    state.thickness = val;
    notify();
}

export function setZRise(val) {
    state.zRise = val;
    notify();
}

export function setBaseRotation(val) {
    state.baseRotation = val;
    notify();
}

export function setPivotStart(val) {
    state.pivotStart = val;
    notify();
}

export function setPivotEnd(val) {
    state.pivotEnd = val;
    notify();
}

export function setGradientCenter(val) {
    state.gradientCenter = val;
    notify();
}

export function setColorStart(val) {
    state.colorStart = val;
    notify();
}

export function setColorEnd(val) {
    state.colorEnd = val;
    notify();
}

export function setColorSides(val) {
    state.colorSides = val;
    notify();
}

// Helper
function distToSegment(p, v, w) {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const finalX = v.x + t * (w.x - v.x);
    const finalY = v.y + t * (w.y - v.y);
    return Math.hypot(p.x - finalX, p.y - finalY);
}
