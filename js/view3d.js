
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getPathPropertiesAt, interpolateColor } from './math.js';

let scene, camera, renderer, controls;
let container;
let ribsGroup;

export function init3D(containerId) {
    container = document.getElementById(containerId);
    if (!container) return;

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    // Camera
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(10, 10, 15);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableRotate = false; // Disable camera rotation

    // Custom Object Interaction
    let isDragging = false;
    let isPanning = false;
    let previousMousePosition = { x: 0, y: 0 };

    // Prevent context menu on right-click
    container.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    container.addEventListener('pointerdown', (e) => {
        previousMousePosition = { x: e.clientX, y: e.clientY };

        if (e.button === 0) {
            // Left click - rotate
            isDragging = true;
        } else if (e.button === 2) {
            // Right click - pan/move
            isPanning = true;
        }
    });

    container.addEventListener('pointermove', (e) => {
        if (!ribsGroup) return;

        const deltaMove = {
            x: e.clientX - previousMousePosition.x,
            y: e.clientY - previousMousePosition.y
        };

        if (isDragging) {
            // Rotate the sculpture
            const sensitivity = 0.005;
            ribsGroup.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), deltaMove.x * sensitivity);
            ribsGroup.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), deltaMove.y * sensitivity);
        } else if (isPanning) {
            // Pan/move the sculpture
            const panSensitivity = 0.02;
            ribsGroup.position.x += deltaMove.x * panSensitivity;
            ribsGroup.position.y -= deltaMove.y * panSensitivity; // Invert Y for natural movement
        }

        previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    container.addEventListener('pointerup', () => {
        isDragging = false;
        isPanning = false;
    });

    container.addEventListener('pointerleave', () => {
        isDragging = false;
        isPanning = false;
    });

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    ribsGroup = new THREE.Group();
    scene.add(ribsGroup);

    // Handle Resize
    window.addEventListener('resize', onWindowResize);

    animate();
}



export function resize3D() {
    onWindowResize();
}

function onWindowResize() {
    if (!container) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

export function update3D(nests, state) {
    if (!ribsGroup) return;

    // Clear old ribs
    while (ribsGroup.children.length > 0) {
        const child = ribsGroup.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
            // Handle both single material and array of materials
            if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
            } else {
                child.material.dispose();
            }
        }
        ribsGroup.remove(child);
    }

    if (nests.length < 2) return;

    // 1. Calculate Global Pivot from Base Curve (nests[0])
    // User requested "all pivot points to be aligned on top of each other".
    // This means we calculate ONE pivot point from the base (outer) curve,
    // and use that same X,Y location as the center of rotation for ALL layers.
    let globalPivot = { x: 0, y: 0, z: 0 };

    // Use Pivot Start (renamed to Position) to find point on base curve
    const baseCurve = nests[0];
    const props = getPathPropertiesAt(baseCurve, state.pivotStart);
    if (props) {
        globalPivot = { x: props.point.x, y: -props.point.y, z: 0 };
    }

    // Material Colors
    const colorStart = new THREE.Color(state.colorStart);
    const colorEnd = new THREE.Color(state.colorEnd);
    const colorSides = new THREE.Color(state.colorSides);

    // Shared resources for Pivot Visualization (Yellow Spheres)
    // Reduce segments slightly for performance since there will be many
    const pivotGeom = new THREE.SphereGeometry(state.thickness / 2, 8, 8);
    const pivotMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });

    // Create rib segments (rings)
    for (let k = 0; k < nests.length - 1; k++) {
        const outerCurve = nests[k];
        const innerCurve = nests[k + 1];

        // ... (Shape creation omitted for brevity, keeping existing code) ...
        // 1. Create Shape with Hole
        const shape = new THREE.Shape();
        const p0 = outerCurve[0].p1;
        shape.moveTo(p0.x, -p0.y);
        outerCurve.forEach(seg => {
            shape.bezierCurveTo(seg.c1.x, -seg.c1.y, seg.c2.x, -seg.c2.y, seg.p2.x, -seg.p2.y);
        });

        const holePath = new THREE.Path();
        const ph = innerCurve[0].p1;
        holePath.moveTo(ph.x, -ph.y);
        innerCurve.forEach(seg => {
            holePath.bezierCurveTo(seg.c1.x, -seg.c1.y, seg.c2.x, -seg.c2.y, seg.p2.x, -seg.p2.y);
        });
        shape.holes.push(holePath);

        // 2. Extrude
        const extrudeSettings = {
            depth: state.thickness,
            bevelEnabled: false
        };
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

        // --- Setup Materials ---
        // Calculate Bounding Box of the Outer Curve for Normalization (Gradient)
        let minX = Infinity, maxX = -Infinity;
        outerCurve.forEach(seg => {
            minX = Math.min(minX, seg.p1.x, seg.c1.x, seg.c2.x, seg.p2.x);
            maxX = Math.max(maxX, seg.p1.x, seg.c1.x, seg.c2.x, seg.p2.x);
        });
        const width = maxX - minX;

        // Create vertex colors for gradient on caps
        const count = geometry.attributes.position.count;
        const colors = new Float32Array(count * 3);
        const pos = geometry.attributes.position;

        for (let i = 0; i < count; i++) {
            const x = pos.getX(i);
            // Normalize x relative to the shape bounds
            let t = width > 0 ? (x - minX) / width : 0.5;

            // Apply gradient center shift
            const gc = state.gradientCenter;
            if (gc !== 0.5) {
                if (t < gc) {
                    t = (t / gc) * 0.5;
                } else {
                    t = 0.5 + ((t - gc) / (1 - gc)) * 0.5;
                }
            }
            t = Math.max(0, Math.min(1, t));

            // Interpolate gradient
            const r = colorStart.r + (colorEnd.r - colorStart.r) * t;
            const g = colorStart.g + (colorEnd.g - colorStart.g) * t;
            const b = colorStart.b + (colorEnd.b - colorStart.b) * t;

            colors[i * 3] = r;
            colors[i * 3 + 1] = g;
            colors[i * 3 + 2] = b;
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const capMaterial = new THREE.MeshPhongMaterial({
            vertexColors: true,
            specular: 0x111111,
            shininess: 30,
            side: THREE.DoubleSide
        });

        const sideMaterial = new THREE.MeshPhongMaterial({
            color: colorSides,
            specular: 0x111111,
            shininess: 30,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, [capMaterial, sideMaterial]);

        // 3. Transformations with Global Pivot
        const zStep = k * state.thickness;
        const angleRad = (k * state.baseRotation * Math.PI) / 180;

        // ALIGNMENT LOGIC:
        // Calculate the LOCAL pivot for this specific rib (outerCurve)
        // and translate the geometry so this local pivot moves to (0,0).
        // This "stacks" all ribs such that their pivot points are vertically aligned.
        let localPivot = globalPivot; // Default to global if calculation fails
        const localProps = getPathPropertiesAt(outerCurve, state.pivotStart);
        if (localProps) {
            localPivot = { x: localProps.point.x, y: -localProps.point.y, z: 0 };
        }

        // 1. Center geometry at LOCAL pivot: Translate by -localPivot
        mesh.geometry.translate(-localPivot.x, -localPivot.y, 0);

        // 2. Rotate around vertical axis (Z) - Axis is now at (0,0) which corresponds to the Local Pivot
        const axis = new THREE.Vector3(0, 0, 1);
        mesh.rotateOnAxis(axis, angleRad);

        // 3. Translate to Global Pivot World Position + vertical offset
        // This places the stack at the original base pivot location
        mesh.position.set(globalPivot.x, globalPivot.y, zStep);

        ribsGroup.add(mesh);

        // ADD PIVOT MARKER FOR THIS RIB
        const pivotMesh = new THREE.Mesh(pivotGeom, pivotMat);
        // Position at the pivot point X,Y but at the current layer's Z
        // Note: The pivot itself isn't rotated (it's the center!), but we want to show the axis.
        // The axis is vertical line at globalPivot.x, globalPivot.y.
        pivotMesh.position.set(globalPivot.x, globalPivot.y, zStep);
        ribsGroup.add(pivotMesh);
    }

    // Auto-center camera if needed or just let OrbitControls handle it
}
