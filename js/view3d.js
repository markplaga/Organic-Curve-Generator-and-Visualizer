
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

    // Material for ribs
    // Material for ribs (Moved inside loop for individual colors)
    // const material = new THREE.MeshPhongMaterial({ ... });

    // Create rib segments (rings)
    for (let k = 0; k < nests.length - 1; k++) {
        const outerCurve = nests[k];
        const innerCurve = nests[k + 1];

        // 1. Create Shape with Hole
        const shape = new THREE.Shape();

        // Outer loop
        const p0 = outerCurve[0].p1;
        shape.moveTo(p0.x, -p0.y); // Flip Y to match SVG coordinate system vs 3D
        outerCurve.forEach(seg => {
            shape.bezierCurveTo(seg.c1.x, -seg.c1.y, seg.c2.x, -seg.c2.y, seg.p2.x, -seg.p2.y);
        });

        // Inner loop (hole)
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
        // ExtrudeGeometry creates groups: group 0 = front/back caps, group 1 = sides (when no bevel)
        const colorStart = new THREE.Color(state.colorStart);
        const colorEnd = new THREE.Color(state.colorEnd);
        const colorSides = new THREE.Color(state.colorSides);

        // Calculate Bounding Box of the Outer Curve for Normalization
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

        // Create two materials: one for caps (with vertex colors), one for sides (solid color)
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

        // Debug: Log geometry groups to understand the structure
        console.log('Geometry groups:', geometry.groups);

        // Ensure material indices are correctly set:
        // ExtrudeGeometry creates: Group 0 (materialIndex 0) = caps, Group 1 (materialIndex 1) = sides
        // We pass materials in order: [capMaterial, sideMaterial] so index 0 = caps, index 1 = sides
        const mesh = new THREE.Mesh(geometry, [capMaterial, sideMaterial]);

        // 3. Transformations

        // Pivot Interpolation
        // Interpolate distance between pivotStart and pivotEnd
        const t_rib = k / Math.max(1, nests.length - 2);
        const pivotDist = state.pivotStart + (state.pivotEnd - state.pivotStart) * t_rib;

        // Get Pivot Point and Normal on OUTER curve
        const props = getPathPropertiesAt(outerCurve, pivotDist);
        if (props) {
            const pivot = { x: props.point.x, y: -props.point.y, z: 0 };
            const normal = { x: props.normal.x, y: -props.normal.y, z: 0 };

            // a. Apply Z-Rise translation (linked to thickness)
            const zStep = k * state.thickness;

            // b. Apply Rotation
            // We want to rotate around the axis (normal) at the pivot point
            const angleRad = (k * state.baseRotation * Math.PI) / 180;

            // Step-by-step transformation:
            // 1. Center geometry at pivot: Translate by -pivot
            // 2. Rotate around normal axis
            // 3. Translate back to pivot + vertical offset

            mesh.geometry.translate(-pivot.x, -pivot.y, 0); // Move pivot to origin


            const axis = new THREE.Vector3(0, 0, 1);
            mesh.rotateOnAxis(axis, angleRad);

            mesh.position.set(pivot.x, pivot.y, zStep);
        }

        ribsGroup.add(mesh);
    }

    // Auto-center camera if needed or just let OrbitControls handle it
}
