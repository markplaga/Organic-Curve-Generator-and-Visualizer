
import { pathToSvgD } from './math.js';
import { state } from './state.js';

export function generateExportString(nests) {
    // Find global BBox to set viewBox
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    // We only strictly need BBox of the biggest curve (base curve) usually,
    // but the convergence point might pull inner curves outside if s > 1 (unlikely for nesting inwards)
    // or if C is far outside.
    // Iterating all points is safest.

    // To simplify: we track points in all nests
    for (const path of nests) {
        for (const seg of path) {
            minX = Math.min(minX, seg.p1.x, seg.c1.x, seg.c2.x, seg.p2.x);
            maxX = Math.max(maxX, seg.p1.x, seg.c1.x, seg.c2.x, seg.p2.x);
            minY = Math.min(minY, seg.p1.y, seg.c1.y, seg.c2.y, seg.p2.y);
            maxY = Math.max(maxY, seg.p1.y, seg.c1.y, seg.c2.y, seg.p2.y);
        }
    }

    // Add some padding
    const padding = 0.5; // inches
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const width = maxX - minX;
    const height = maxY - minY;

    let svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n`;
    svg += `<svg width="${width.toFixed(4)}in" height="${height.toFixed(4)}in" viewBox="${minX.toFixed(4)} ${minY.toFixed(4)} ${width.toFixed(4)} ${height.toFixed(4)}" xmlns="http://www.w3.org/2000/svg">\n`;

    svg += `  <style>
    path { vector-effect: non-scaling-stroke; stroke-width: 0.01in; fill: none; stroke: black; }
  </style>\n`;

    nests.forEach(nest => {
        svg += `  <path d="${pathToSvgD(nest)}" />\n`;
    });

    svg += `</svg>`;

    return svg;
}

export function downloadSvg(content, filename = "organic-curve.svg") {
    const blob = new Blob([content], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
