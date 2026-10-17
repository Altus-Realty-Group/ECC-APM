// Unknown badge counts are omitted. No sample counts or pretend refresh loop.
export type BadgeCounts = {
  workOrdersOpen?: number;
  collectionsOpen?: number;
  inventoryLow?: number;
};

export function useBadgeCounts(): BadgeCounts {
  return {};
}
