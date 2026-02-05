
// Math & Geometry Utils

/**
 * Calculates a point on a Catmull-Rom spline at time t
 * But for SVG, we usually convert Catmull-Rom segments to Cubic Bezier segments.
 * 
 * For a segment P1 -> P2, using P0 and P3 as tension helpers:
 * CP1 = P1 + (P2 - P0) / (6 * tension)  -- typical standard is tension=1 (Catmull-Rom) -> div 6
 * Actually, Catmull-Rom tangent at P1 is (P2 - P0) / 2.
 * So Bezier CP1 = P1 + Tangent1 / 3.
 * Bezier CP2 = P2 - Tangent2 / 3.
 * Tangent2 at P2 is (P3 - P1) / 2.
 */
export function getCatmullRomBezierPath(points) {
    if (points.length < 3) return [];

    const pathCmds = [];
    const n = points.length;

    for (let i = 0; i < n; i++) {
        const p0 = points[(i - 1 + n) % n];
        const p1 = points[i];
        const p2 = points[(i + 1) % n];
        const p3 = points[(i + 2) % n];

        // Catmull-Rom tangents
        // T1 = (P2 - P0) * tension (0.5 for standard catmull-rom)
        const t1x = (p2.x - p0.x) * 0.5;
        const t1y = (p2.y - p0.y) * 0.5;

        const t2x = (p3.x - p1.x) * 0.5;
        const t2y = (p3.y - p1.y) * 0.5;

        // Cubic Bezier Control Points
        // C1 = P1 + T1 / 3
        const c1x = p1.x + t1x / 3;
        const c1y = p1.y + t1y / 3;

        // C2 = P2 - T2 / 3
        const c2x = p2.x - t2x / 3;
        const c2y = p2.y - t2y / 3;

        // Segment: Start P1, C1, C2, End P2
        // We will store as: { p1, c1: {x,y}, c2: {x,y}, p2 }
        /* 
           Note: SVG Path logic usually 'moves' to P1 then curves to P2.
           Since it's a closed loop, we'll construct the d attribute later stringing these together.
        */
        pathCmds.push({
            p1: { ...p1 },
            c1: { x: c1x, y: c1y },
            c2: { x: c2x, y: c2y },
            p2: { ...p2 }
        });
    }

    return pathCmds;
}

/**
 * Generate Nested Curves based on Convergence Point C, Start Scale, and End Scale.
 * Uses Affine Scaling with interpolated scale factor.
 */
export function generateNests(basePath, C, startScale, endScale, minSize) {
    const nests = [];
    nests.push(basePath);

    let currentPath = basePath;
    let safety = 0;

    // Bounds width of base curve for interpolation
    const baseBBox = getPathBBox(basePath);
    const baseWidth = baseBBox.width;

    while (safety < 100) {
        // Calculate current dimension
        const bbox = getPathBBox(currentPath);
        const currentWidth = bbox.width;

        // Check Termination
        if (currentWidth < minSize || bbox.height < minSize) {
            break;
        }

        // Interpolate Scale Factor
        // t goes from 1 (at start) to 0 (at minSize approx)
        // Avoid division by zero
        let t = 0;
        if (baseWidth > minSize) {
            t = (currentWidth - minSize) / (baseWidth - minSize);
        }
        t = Math.max(0, Math.min(1, t)); // Clamp

        const s = endScale + (startScale - endScale) * t;

        // Generate Next Path (Affine Scaling)
        const nextPath = currentPath.map(seg => {
            return {
                p1: scalePt(seg.p1, C, s),
                c1: scalePt(seg.c1, C, s),
                c2: scalePt(seg.c2, C, s),
                p2: scalePt(seg.p2, C, s)
            };
        });

        nests.push(nextPath);
        currentPath = nextPath;
        safety++;
    }

    return nests;
}

function scalePt(P, C, s) {
    return {
        x: C.x + s * (P.x - C.x),
        y: C.y + s * (P.y - C.y)
    };
}

function getPathBBox(pathSegs) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // Approximation using just control points and endpoints is often "good enough" for termination logic
    // but for strict bbox we might want to sample. 
    // Given the requirement "Size exceeds x", using control points hull is a safe over-estimation 
    // (Actual curve is inside Convex Hull).
    // If Hull < minSize, then Curve < minSize.

    for (const seg of pathSegs) {
        minX = Math.min(minX, seg.p1.x, seg.c1.x, seg.c2.x, seg.p2.x);
        maxX = Math.max(maxX, seg.p1.x, seg.c1.x, seg.c2.x, seg.p2.x);
        minY = Math.min(minY, seg.p1.y, seg.c1.y, seg.c2.y, seg.p2.y);
        maxY = Math.max(maxY, seg.p1.y, seg.c1.y, seg.c2.y, seg.p2.y);
    }

    return { width: maxX - minX, height: maxY - minY };
}

export function pathToSvgD(pathSegs) {
    if (pathSegs.length === 0) return "";
    let d = `M ${pathSegs[0].p1.x.toFixed(4)} ${pathSegs[0].p1.y.toFixed(4)}`;
    for (const seg of pathSegs) {
        d += ` C ${seg.c1.x.toFixed(4)} ${seg.c1.y.toFixed(4)}, ${seg.c2.x.toFixed(4)} ${seg.c2.y.toFixed(4)}, ${seg.p2.x.toFixed(4)} ${seg.p2.y.toFixed(4)}`;
    }
    d += " Z";
    return d;
}

/**
 * Samples a point on a cubic bezier segment at t [0, 1]
 */
export function getBezierPt(p1, c1, c2, p2, t) {
    const it = 1 - t;
    return {
        x: it ** 3 * p1.x + 3 * it ** 2 * t * c1.x + 3 * it * t ** 2 * c2.x + t ** 3 * p2.x,
        y: it ** 3 * p1.y + 3 * it ** 2 * t * c1.y + 3 * it * t ** 2 * c2.y + t ** 3 * p2.y
    };
}

/**
 * Gets the tangent vector on a cubic bezier segment at t
 */
export function getBezierTangent(p1, c1, c2, p2, t) {
    const it = 1 - t;
    // Derivative: 3(1-t)^2(C1-P1) + 6(1-t)t(C2-C1) + 3t^2(P2-C2)
    return {
        x: 3 * it ** 2 * (c1.x - p1.x) + 6 * it * t * (c2.x - c1.x) + 3 * t ** 2 * (p2.x - c2.x),
        y: 3 * it ** 2 * (c1.y - p1.y) + 6 * it * t * (c2.y - c1.y) + 3 * t ** 2 * (p2.y - c2.y)
    };
}


/**
 * Calculates the length of a cubic bezier segment using numerical integration (simpson's rule equivalent or subdivision)
 */
function getBezierLength(p1, c1, c2, p2, steps = 10) {
    let len = 0;
    let prev = p1;
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const curr = getBezierPt(p1, c1, c2, p2, t);
        len += Math.hypot(curr.x - prev.x, curr.y - prev.y);
        prev = curr;
    }
    return len;
}

/**
 * Samples the entire closed path at a normalized distance s [0, 1] using Arc-Length Parameterization
 * Returns { point, normal, tangent }
 */
export function getPathPropertiesAt(pathSegs, s) {
    if (pathSegs.length === 0) return null;

    // 1. Calculate lengths of all segments
    const lengths = pathSegs.map(seg => getBezierLength(seg.p1, seg.c1, seg.c2, seg.p2, 20));
    const totalLength = lengths.reduce((a, b) => a + b, 0);

    // 2. Find target length
    s = ((s % 1) + 1) % 1; // Wrap s to [0, 1]
    let targetLen = s * totalLength;

    // 3. Find segment
    let currentLen = 0;
    let segIdx = 0;
    for (let i = 0; i < lengths.length; i++) {
        if (currentLen + lengths[i] >= targetLen) {
            segIdx = i;
            break;
        }
        currentLen += lengths[i];
    }

    // 4. Find t within segment
    const seg = pathSegs[segIdx];
    const segTarget = targetLen - currentLen;
    // Inverse solve for t where length(t) ~= segTarget
    // Simple approach: Walk and find
    let t = 0;
    let bestDist = Infinity;

    // We can just re-walk the segment with finer grain to find t
    // Optimization: Standard 20 steps is usually enough for visual binding
    let prev = seg.p1;
    let walked = 0;
    const fineSteps = 40;

    for (let i = 1; i <= fineSteps; i++) {
        const localT = i / fineSteps;
        const curr = getBezierPt(seg.p1, seg.c1, seg.c2, seg.p2, localT);
        const stepLen = Math.hypot(curr.x - prev.x, curr.y - prev.y);

        if (walked + stepLen >= segTarget) {
            // Intepolate fraction between previous walked amount and this step
            const remain = segTarget - walked;
            const frac = remain / stepLen;
            t = ((i - 1) + frac) / fineSteps;
            break;
        }

        walked += stepLen;
        prev = curr;
    }

    // 5. Sample at found t
    const pt = getBezierPt(seg.p1, seg.c1, seg.c2, seg.p2, t);
    const tan = getBezierTangent(seg.p1, seg.c1, seg.c2, seg.p2, t);

    // Normal
    const len = Math.hypot(tan.x, tan.y);
    const normal = { x: -tan.y / len, y: tan.x / len };

    return { point: pt, normal, tangent: { x: tan.x / len, y: tan.y / len } };
}

// --- Color Helpers ---

export function interpolateColor(c1, c2, factor) {
    if (factor <= 0) return c1;
    if (factor >= 1) return c2;

    const rgb1 = hexToRgb(c1);
    const rgb2 = hexToRgb(c2);

    const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor);
    const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor);
    const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor);

    return `rgb(${r}, ${g}, ${b})`;
}

export function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
}
