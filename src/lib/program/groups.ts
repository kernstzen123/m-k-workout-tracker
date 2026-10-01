/** A run of consecutive items: a superset (shared group letter) or a single item. */
export interface ItemGroup<T> {
  supersetGroup: string | null;
  items: Array<{ item: T; index: number }>;
}

/** Group consecutive items that share a superset letter; everything else stands alone. */
export function groupSupersets<T extends { supersetGroup?: string }>(
  items: readonly T[],
): ItemGroup<T>[] {
  const groups: ItemGroup<T>[] = [];
  items.forEach((item, index) => {
    const g = item.supersetGroup ?? null;
    const last = groups.at(-1);
    if (g && last?.supersetGroup === g) last.items.push({ item, index });
    else groups.push({ supersetGroup: g, items: [{ item, index }] });
  });
  return groups;
}
