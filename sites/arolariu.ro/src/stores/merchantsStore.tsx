/**
 * @fileoverview Zustand store for managing merchants state with IndexedDB persistence.
 * Each merchant is stored as an individual row in the IndexedDB merchants table.
 * @module stores/merchantsStore
 */

import type {Merchant} from "@/types/invoices";
import {create} from "zustand";
import {devtools, persist} from "zustand/middleware";
import {createIndexedDBStorage} from "./storage/indexedDBStorage";

/**
 * Merchant store persisted state interface.
 * The merchants array is persisted to IndexedDB.
 */
interface MerchantsPersistedState {
  /** All merchants in the store */
  merchants: Merchant[];
}

/**
 * Merchant store state interface
 */
interface MerchantsState extends MerchantsPersistedState {
  /** Indicates whether the store has been hydrated from IndexedDB */
  hasHydrated: boolean;
}

/**
 * Merchant store actions interface
 */
interface MerchantsActions {
  /**
   * Sets the complete list of merchants
   * @param merchants The new merchants array
   */
  setMerchants: (merchants: Merchant[]) => void;

  /**
   * Upserts a single merchant to the store (updates if exists, adds if not).
   * This is the preferred method for adding/updating merchants to avoid duplicates.
   * @param merchant The merchant to upsert
   */
  upsertMerchant: (merchant: Merchant) => void;

  /**
   * Removes a merchant by ID
   * @param merchantId The ID of the merchant to remove
   */
  removeMerchant: (merchantId: string) => void;

  /**
   * Updates an existing merchant
   * @param merchantId The ID of the merchant to update
   * @param updates Partial merchant data to update
   */
  updateMerchant: (merchantId: string, updates: Partial<Merchant>) => void;

  /**
   * Finds a merchant by ID
   * @param merchantId The ID of the merchant to find
   * @returns The merchant if found, undefined otherwise
   */
  getMerchantById: (merchantId: string) => Merchant | undefined;

  /**
   * Clears all merchants from the store
   */
  clearMerchants: () => void;

  /**
   * Sets the hydration status
   * @param hasHydrated Whether the store has been hydrated
   */
  setHasHydrated: (hasHydrated: boolean) => void;
}

/**
 * Combined store type
 */
type MerchantsStore = MerchantsState & MerchantsActions;

/**
 * IndexedDB storage configuration for merchants using Dexie.
 * Each merchant is stored as an individual row with id as primary key.
 */
const indexedDBStorage = createIndexedDBStorage<MerchantsPersistedState, Merchant>({
  table: "merchants",
  entityKey: "merchants",
});

/**
 * Persist middleware configuration
 */
/**
 * Persist middleware configuration
 */
const persistConfig = {
  name: "merchants-store",
  storage: indexedDBStorage,
  partialize: (state: MerchantsStore): MerchantsPersistedState => ({
    merchants: [...state.merchants],
  }),
  // eslint-disable-next-line unicorn/consistent-function-scoping -- Stable function reference for hydration
  onRehydrateStorage: () => (state: MerchantsStore | undefined) => {
    state?.setHasHydrated(true);
  },
} as const;

/**
 * Create the initial state and actions
 */
const createMerchantsSlice = (
  set: (partial: Partial<MerchantsStore> | ((state: MerchantsStore) => Partial<MerchantsStore>)) => void,
  get: () => MerchantsStore,
): MerchantsStore => ({
  // State
  merchants: [],
  hasHydrated: false,

  // Actions
  setMerchants: (merchants) => set({merchants}),

  upsertMerchant: (merchant) =>
    set((state) => {
      const existingIndex = state.merchants.findIndex((m) => m.id === merchant.id);
      if (existingIndex >= 0) {
        // Update existing merchant
        const updatedMerchants = [...state.merchants];
        updatedMerchants[existingIndex] = merchant;
        return {merchants: updatedMerchants};
      }
      // Add new merchant
      return {merchants: [...state.merchants, merchant]};
    }),

  removeMerchant: (merchantId) =>
    set((state) => ({
      merchants: state.merchants.filter((m) => m.id !== merchantId),
    })),

  updateMerchant: (merchantId, updates) =>
    set((state) => ({
      merchants: state.merchants.map((m) => (m.id === merchantId ? {...m, ...updates} : m)),
    })),

  getMerchantById: (merchantId) => {
    const state = get();
    return state.merchants.find((m) => m.id === merchantId);
  },

  clearMerchants: () => set({merchants: []}),

  setHasHydrated: (hasHydrated) => set({hasHydrated}),
});

/**
 * Development store with DevTools integration
 */
const createDevStore = () =>
  create<MerchantsStore>()(
    devtools(
      persist((set, get) => createMerchantsSlice(set, get), persistConfig),
      {
        name: "MerchantsStore",
        enabled: true,
      },
    ),
  );

/**
 * Production store without DevTools for better performance
 */
const createProdStore = () => create<MerchantsStore>()(persist((set, get) => createMerchantsSlice(set, get), persistConfig));

/**
 * Merchants store hook with conditional DevTools support based on environment.
 * Uses entity-level IndexedDB persistence where each merchant is stored as an individual row.
 * @remarks Persists data in IndexedDB for offline support.
 * @returns The merchants store with state and actions.
 * @example
 * ```tsx
 * function MerchantsList() {
 *   const { merchants, setMerchants, upsertMerchant } = useMerchantsStore();
 *
 *   return (
 *     <div>
 *       {merchants.map(merchant => (
 *         <div key={merchant.id}>{merchant.name}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export const useMerchantsStore = process.env.NODE_ENV === "development" ? createDevStore() : createProdStore();
