export function pointInPolygon(point: number[], polygon: number[][]) {
    const [x, y] = point;
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i] ?? [];
        const [xj, yj] = polygon[j] ?? [];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }

    return inside;
}
