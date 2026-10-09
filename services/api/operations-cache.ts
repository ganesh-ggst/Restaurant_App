import type {
  OperationsCategory,
  OperationsMenuItem,
} from "./operations";

export interface OperationsCategorySnapshot {
  category: OperationsCategory;
  items: OperationsMenuItem[];
  crossSells: OperationsMenuItem[];
}

interface CachedCategorySnapshot {
  snapshot: OperationsCategorySnapshot;
  stale: boolean;
}

const categorySnapshots = new Map<string, CachedCategorySnapshot>();
let categoriesSnapshot: OperationsCategory[] | null = null;
let categoriesStale = true;

export const operationsCache = {
  getCategories(): OperationsCategory[] | null {
    return categoriesSnapshot;
  },

  areCategoriesStale(): boolean {
    return categoriesStale;
  },

  setCategories(categories: OperationsCategory[]): void {
    categoriesSnapshot = categories;
    categoriesStale = false;
  },

  invalidateCategories(): void {
    categoriesStale = true;
  },

  getCategory(categoryId: string): OperationsCategorySnapshot | null {
    return categorySnapshots.get(categoryId)?.snapshot ?? null;
  },

  isCategoryStale(categoryId: string): boolean {
    const cached = categorySnapshots.get(categoryId);
    return !cached || cached.stale;
  },

  setCategory(categoryId: string, snapshot: OperationsCategorySnapshot): void {
    categorySnapshots.set(categoryId, { snapshot, stale: false });
  },

  invalidateCategory(categoryId?: string): void {
    if (!categoryId) return;
    const cached = categorySnapshots.get(categoryId);
    if (cached) cached.stale = true;
  },
};
