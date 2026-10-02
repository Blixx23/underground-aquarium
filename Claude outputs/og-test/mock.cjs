"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabasePublic = void 0;
const data = globalThis.__MOCK__;
function builder(table) {
    const b = {
        select: () => b, eq: () => b, not: () => b, order: () => b, limit: () => b,
        maybeSingle: async () => ({ data: data[table + ":one"] ?? null, error: null }),
        then: (res) => res({ data: data[table + ":many"] ?? [], error: null }),
    };
    return b;
}
exports.supabasePublic = { from: (t) => builder(t) };
