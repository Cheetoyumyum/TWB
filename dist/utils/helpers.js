"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeNumber = sanitizeNumber;
exports.chunkArray = chunkArray;
function sanitizeNumber(input, min, max) {
    if (!input)
        return null;
    const parsed = parseInt(input.replace(/,/g, ''), 10);
    if (isNaN(parsed))
        return null;
    if (parsed < min)
        return min;
    if (max && parsed > max)
        return max;
    return parsed;
}
function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}
