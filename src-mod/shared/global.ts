export function getGlobalScope(): any {
    if (typeof globalThis !== "undefined") {
        return globalThis as any;
    }
    if (typeof window !== "undefined") {
        return window as any;
    }
    if (typeof self !== "undefined") {
        return self as any;
    }
    return Function("return this")();
}

