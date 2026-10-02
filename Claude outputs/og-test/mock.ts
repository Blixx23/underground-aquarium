const data: Record<string, any> = (globalThis as any).__MOCK__;
function builder(table: string) {
  const b: any = {
    select: () => b, eq: () => b, not: () => b, order: () => b, limit: () => b,
    maybeSingle: async () => ({ data: data[table + ":one"] ?? null, error: null }),
    then: (res: any) => res({ data: data[table + ":many"] ?? [], error: null }),
  };
  return b;
}
export const supabasePublic = { from: (t: string) => builder(t) };
