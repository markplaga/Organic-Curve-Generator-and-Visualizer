
import {
    state, subscribe, addPoint, updatePoint, setConvergence, deletePoint,
    setStartScale, setEndScale, setMinSize,
    setViewMode, setThickness, setBaseRotation, setPivotStart, setPivotEnd,
    setColorStart, setColorEnd, setColorSides, setGradientCenter
} from './state.js';
import { getCatmullRomBezierPath, generateNests, pathToSvgD, interpolateColor } from './math.js';
import { generateExportString, downloadSvg } from './export.js';
import { init3D, update3D, resize3D } from './view3d.js';

// DOM Elements
const svgEl = document.getElementById('main-svg');
const curveGroup = document.getElementById('curve-group');

const uiLayer = document.getElementById('ui-layer');
const gradient = document.getElementById('gradient-fill');
const inputs = {
    startScale: document.getElementById('start-scale-slider'),
    startScaleVal: document.getElementById('start-scale-val'),
    endScale: document.getElementById('end-scale-slider'),
    endScaleVal: document.getElementById('end-scale-val'),
    minSize: document.getElementById('min-size-input'),
    ptX: document.getElementById('pt-x'),
    ptY: document.getElementById('pt-y'),
    deleteBtn: document.getElementById('delete-pt-btn'),
    downloadBtn: document.getElementById('export-btn'),
    coords: document.getElementById('coordinate-readout'),
    // 3D Controls
    view2d: document.getElementById('view-2d-btn'),
    view3d: document.getElementById('view-3d-btn'),
    canvas2d: document.getElementById('canvas-container'),
    canvas3d: document.getElementById('canvas3d-container'),
    controls3d: document.getElementById('controls-3d'),
    thickness: document.getElementById('thickness-slider'),
    thicknessVal: document.getElementById('thickness-val'),
    rotation: document.getElementById('rotation-slider'),
    rotationVal: document.getElementById('rotation-val'),
    pivotStart: document.getElementById('pivot-start-slider'),
    pivotStartVal: document.getElementById('pivot-start-val'),
    pivotEnd: document.getElementById('pivot-end-slider'),
    pivotEndVal: document.getElementById('pivot-end-val'),
    gradientCenter: document.getElementById('gradient-center-slider'),
    gradientCenterVal: document.getElementById('gradient-center-val'),
    // Colors
    colorStart: document.getElementById('color-start-picker'),
    colorEnd: document.getElementById('color-end-picker'),
    colorSides: document.getElementById('color-sides-picker')
};

// --- Viewport / Coordinate System ---
import { setViewport } from './state.js';

function updateViewBox(s) {
    if (!s.viewport) return; // Guard
    const { x, y, w, h } = s.viewport;
    svgEl.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
}
// Initial viewBox set via state defaults in render


// --- Main Render Loop ---
function render(state) {
    // 1. Calculate Geometry
    const baseCurve = getCatmullRomBezierPath(state.points);
    const nests = generateNests(baseCurve, state.convergence, state.startScale, state.endScale, state.minSize);

    // 2. View Mode Toggle Logic
    if (state.viewMode === '3d') {
        inputs.canvas2d.classList.add('hidden');
        inputs.canvas3d.classList.remove('hidden');
        inputs.controls3d.classList.remove('hidden');
        inputs.view3d.classList.add('active');
        inputs.view2d.classList.remove('active');
        requestAnimationFrame(() => resize3D());
        update3D(nests, state);
    } else {
        inputs.canvas2d.classList.remove('hidden');
        inputs.canvas3d.classList.add('hidden');
        inputs.controls3d.classList.add('hidden');
        inputs.view2d.classList.add('active');
        inputs.view3d.classList.remove('active');
    }

    // 3. Render 2D Curves (SVG)
    curveGroup.innerHTML = ''; // Clear

    nests.forEach((nest, index) => {
        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', pathToSvgD(nest));
        pathEl.setAttribute('fill', 'none');

        // Emphasize Logic
        pathEl.setAttribute('stroke', 'url(#gradient-fill)');
        pathEl.setAttribute('stroke-width', '1.5'); // 1.5px on screen
        pathEl.setAttribute('vector-effect', 'non-scaling-stroke'); // Keep crisp

        curveGroup.appendChild(pathEl);
    });

    // Update Gradient Stops
    if (gradient) {
        const stops = gradient.getElementsByTagName('stop');
        if (stops.length >= 2) {
            stops[0].style.stopColor = state.colorStart;
            stops[1].style.stopColor = state.colorEnd;
        }
    }

    // 3. Render UI Handles (Points, Convergence)
    uiLayer.innerHTML = '';

    // Base Points
    state.points.forEach((pt, idx) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', pt.x);
        circle.setAttribute('cy', pt.y);
        circle.setAttribute('r', 0.15); // visual size in inches
        circle.setAttribute('fill', idx === state.selectedPointIndex ? '#ff0' : '#fff');
        circle.setAttribute('stroke', 'rgba(0,0,0,0.5)');
        circle.setAttribute('stroke-width', '0.02');
        circle.classList.add('handle-point');
        circle.dataset.index = idx;
        uiLayer.appendChild(circle);
    });

    // Convergence Point
    const cp = state.convergence;
    const gC = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gC.classList.add('handle-convergence');
    gC.innerHTML = `
        <line x1="${cp.x - 0.2}" y1="${cp.y}" x2="${cp.x + 0.2}" y2="${cp.y}" stroke="#f55" stroke-width="0.05" />
        <line x1="${cp.x}" y1="${cp.y - 0.2}" x2="${cp.x}" y2="${cp.y + 0.2}" stroke="#f55" stroke-width="0.05" />
        <circle cx="${cp.x}" cy="${cp.y}" r="0.3" fill="transparent" /> 
    `;
    uiLayer.appendChild(gC);


    // 4. Update UI Panel Inputs
    updateUIControls(state);

    // 5. Update Viewport
    updateViewBox(state);
}

function updateUIControls(s) {
    if (document.activeElement !== inputs.startScale) inputs.startScale.value = s.startScale;
    inputs.startScaleVal.innerText = s.startScale.toFixed(2);
    if (document.activeElement !== inputs.endScale) inputs.endScale.value = s.endScale;
    inputs.endScaleVal.innerText = s.endScale.toFixed(2);
    inputs.minSize.value = s.minSize;

    // 3D Controls
    inputs.thickness.value = s.thickness;
    inputs.thicknessVal.innerText = s.thickness.toFixed(2);

    inputs.rotation.value = s.baseRotation;
    inputs.rotationVal.innerText = s.baseRotation + '°';
    inputs.pivotStart.value = s.pivotStart;
    inputs.pivotStartVal.innerText = s.pivotStart.toFixed(2);
    inputs.pivotEnd.value = s.pivotEnd;
    inputs.pivotEndVal.innerText = s.pivotEnd.toFixed(2);
    inputs.gradientCenter.value = s.gradientCenter;
    inputs.gradientCenterVal.innerText = s.gradientCenter.toFixed(2);

    if (s.selectedPointIndex !== -1) {
        const pt = s.points[s.selectedPointIndex];
        inputs.ptX.value = pt.x.toFixed(2);
        inputs.ptY.value = pt.y.toFixed(2);
        inputs.ptX.disabled = false;
        inputs.ptY.disabled = false;
        inputs.deleteBtn.disabled = false;
    } else {
        inputs.ptX.value = '';
        inputs.ptY.value = '';
        inputs.ptX.disabled = true;
        inputs.ptY.disabled = true;
        inputs.deleteBtn.disabled = true;
    }
}


// --- Interaction Logic ---

// Coordinate Helper: MouseEvent -> SVG Coordinates (Inches)
// Coordinate Helper: MouseEvent -> SVG Coordinates (Inches)
function getMousePt(evt) {
    const pt = svgEl.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    return pt.matrixTransform(svgEl.getScreenCTM().inverse());
}

// --- Zoom & Pan Logic ---

svgEl.addEventListener('wheel', e => {
    e.preventDefault();
    const zoomSpeed = 0.05;
    const direction = e.deltaY > 0 ? 1 : -1;
    const scale = 1 + direction * zoomSpeed;

    const pt = getMousePt(e); // Mouse position in SVG coords

    // New Width/Height
    const w = state.viewport.w * scale;
    const h = state.viewport.h * scale;

    // New X/Y to keep pt stationary:
    // pt.x = viewport.x + (pt.x_percent * viewport.w)
    // We want pt.x to remain same relative to screen, so calculate new Viewport X/Y.
    // NewX = pt.x - (pt.x - OldX) * scale

    const x = pt.x - (pt.x - state.viewport.x) * scale;
    const y = pt.y - (pt.y - state.viewport.y) * scale;

    setViewport({ x, y, w, h });
}, { passive: false });

// Panning with Middle Click or Space + Drag
let isPanning = false;
let panStart = { x: 0, y: 0 };
let viewStart = { x: 0, y: 0 };

svgEl.addEventListener('mousedown', e => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) { // Middle click or Shift+Left
        isPanning = true;
        panStart = { x: e.clientX, y: e.clientY };
        viewStart = { ...state.viewport };
        e.preventDefault(); // Prevent text selection etc
        return;
    }
    // ... existing mousedown logic ...

    const pt = getMousePt(e);

    // Check hit test
    // 1. Convergence Point
    const distC = Math.hypot(pt.x - state.convergence.x, pt.y - state.convergence.y);
    if (distC < 0.4) {
        state.isDragging = true;
        state.dragTarget = 'convergence';
        state.dragIndex = -1;
        return;
    }

    // 2. Points
    let hitIndex = -1;
    let minDist = 0.4; // Hit radius
    state.points.forEach((p, i) => {
        const d = Math.hypot(pt.x - p.x, pt.y - p.y);
        if (d < minDist) {
            minDist = d;
            hitIndex = i;
        }
    });

    if (hitIndex !== -1) {
        state.isDragging = true;
        state.dragTarget = 'point';
        state.dragIndex = hitIndex;
        state.selectedPointIndex = hitIndex;
        render(state); // Update selection visual
        return;
    }

    // 3. Background Click -> Add Point? 
    // Usually logic implies if we didn't hit anything, we might be adding a point.
    // Or deselection.
    // Let's implement click-to-add in 'click' event to separate drag from click.
    state.selectedPointIndex = -1;
    render(state);
});

svgEl.addEventListener('mousemove', e => {
    const coords = getMousePt(e);
    inputs.coords.innerText = `${coords.x.toFixed(2)}", ${coords.y.toFixed(2)}"`;

    if (isPanning) {
        // Calculate delta in SVG units
        // Since viewBox scales, we need to map pixel delta to SVG delta.
        // Or simpler:
        // DeltaPx = Current - Start
        // SVG_Width / Screen_Width = Ratio
        // SVG_Delta = DeltaPx * Ratio

        const dxPx = e.clientX - panStart.x;
        const dyPx = e.clientY - panStart.y;

        const outputRect = svgEl.getBoundingClientRect();
        const ratioX = state.viewport.w / outputRect.width;
        const ratioY = state.viewport.h / outputRect.height;

        const newX = viewStart.x - dxPx * ratioX;
        const newY = viewStart.y - dyPx * ratioY;

        setViewport({ ...state.viewport, x: newX, y: newY });
        return;
    }

    if (!state.isDragging) return;

    if (state.dragTarget === 'convergence') {
        setConvergence(coords.x, coords.y);
    } else if (state.dragTarget === 'point') {
        updatePoint(state.dragIndex, coords.x, coords.y);
    }
});

window.addEventListener('mouseup', () => {
    state.isDragging = false;
    state.dragTarget = null;
    state.dragIndex = -1;
    isPanning = false;
});

svgEl.addEventListener('dblclick', e => {
    // Delete point if hit
    const pt = getMousePt(e);
    let hitIndex = -1;
    let minDist = 0.4;
    state.points.forEach((p, i) => {
        const d = Math.hypot(pt.x - p.x, pt.y - p.y);
        if (d < minDist) {
            minDist = d;
            hitIndex = i;
        }
    });

    if (hitIndex !== -1) {
        deletePoint(hitIndex);
    } else {
        // If background dblclick, maybe Add point? 
        // Or simple click adds point.
        // Let's use single click on background to Add Point. 
        // Need to distinguish Drag vs Click.
    }
});

// Click for adding points (need to be careful not to conflict with drag start)
// Using a simple flag
let mouseDownPos = null;
svgEl.addEventListener('mousedown', e => { mouseDownPos = { x: e.clientX, y: e.clientY }; });
svgEl.addEventListener('click', e => {
    if (!mouseDownPos) return;
    const dist = Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y);
    if (dist > 5) return; // It was a drag

    const pt = getMousePt(e);

    // Check if we hit anything (don't add point on top of existing)
    const distC = Math.hypot(pt.x - state.convergence.x, pt.y - state.convergence.y);
    if (distC < 0.4) return;

    for (let p of state.points) {
        if (Math.hypot(pt.x - p.x, pt.y - p.y) < 0.4) return;
    }

    addPoint(pt.x, pt.y);
});


// --- UI Inputs Wiring ---
inputs.startScale.addEventListener('input', e => setStartScale(parseFloat(e.target.value)));
inputs.endScale.addEventListener('input', e => setEndScale(parseFloat(e.target.value)));
inputs.minSize.addEventListener('change', e => setMinSize(parseFloat(e.target.value)));

inputs.ptX.addEventListener('change', e => {
    if (state.selectedPointIndex !== -1) {
        updatePoint(state.selectedPointIndex, parseFloat(e.target.value), state.points[state.selectedPointIndex].y);
    }
});
inputs.ptY.addEventListener('change', e => {
    if (state.selectedPointIndex !== -1) {
        updatePoint(state.selectedPointIndex, state.points[state.selectedPointIndex].x, parseFloat(e.target.value));
    }
});
inputs.deleteBtn.addEventListener('click', () => {
    if (state.selectedPointIndex !== -1) deletePoint(state.selectedPointIndex);
});

// 3D UI Wiring
inputs.view2d.addEventListener('click', () => setViewMode('2d'));
inputs.view3d.addEventListener('click', () => setViewMode('3d'));
inputs.thickness.addEventListener('input', e => setThickness(parseFloat(e.target.value)));
inputs.rotation.addEventListener('input', e => setBaseRotation(parseFloat(e.target.value)));
inputs.pivotStart.addEventListener('input', e => setPivotStart(parseFloat(e.target.value)));
inputs.pivotEnd.addEventListener('input', e => setPivotEnd(parseFloat(e.target.value)));
inputs.gradientCenter.addEventListener('input', e => setGradientCenter(parseFloat(e.target.value)));

inputs.colorStart.addEventListener('input', e => setColorStart(e.target.value));
inputs.colorEnd.addEventListener('input', e => setColorEnd(e.target.value));
inputs.colorSides.addEventListener('input', e => setColorSides(e.target.value));

inputs.downloadBtn.addEventListener('click', () => {
    const baseCurve = getCatmullRomBezierPath(state.points);
    const nests = generateNests(baseCurve, state.convergence, state.startScale, state.endScale, state.minSize);
    const svgs = generateExportString(nests);
    downloadSvg(svgs);
});


// Init
// Helper functions moved to math.js

init3D('canvas3d-container');
subscribe(render);
render(state);
