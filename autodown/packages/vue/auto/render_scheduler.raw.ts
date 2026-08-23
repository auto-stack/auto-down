export function nextBatchCount(visible: number, total: number, batchSize: number): number {
    let remaining: number = total - visible;
    if (remaining <= 0) {
        return visible;
    }
    if (batchSize <= 0) {
        return total;
    }
    if (remaining > batchSize) {
        return visible + batchSize;
    }
    return total;
}

export function liveWindowStart(visibleEnd: number, maxLive: number): number {
    if (maxLive <= 0) {
        return 0;
    }
    let start: number = visibleEnd - maxLive;
    if (start < 0) {
        return 0;
    }
    return start;
}

export function typewriterNextChars(visible: number, total: number, chunk: number): number {
    let remaining: number = total - visible;
    if (remaining <= 0) {
        return total;
    }
    if (chunk <= 0) {
        return total;
    }
    let next: number = visible + chunk;
    if (next > total) {
        return total;
    }
    return next;
}