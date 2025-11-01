/**
 * @fileoverview Zustand store for managing merchants state with IndexedDB persistence
 * @module stores/merchantsStore
 */

import type {Merchant} from "@/types/invoices";
import {create} from "zustand";
import {devtools, persist} from "zustand/middleware";
import {createIndexedDBStorage} from "./storage/indexedDBStorage";

/**
 * Merchant store state interface
 */
interface MerchantsState {
  /** All merchants in the store */
  merchants: Merchant[];
}

/**
 * Merchant store actions interface
 */
interface MerchantsActions {
  /**
   * Sets the complete list of merchants
   * @param merchants - The new merchants array
   */
  setMerchants: (merchants: Merchant[]) => void;

  /**
   * Adds a single merchant to the store
   * @param merchant - The merchant to add
   */
  addMerchant: (merchant: Merchant) => void;

  /**
   * Removes a merchant by ID
   * @param merchantId - The ID of the merchant to remove
   */
  removeMerchant: (merchantId: string) => void;

  /**
   * Updates an existing merchant
   * @param merchantId - The ID of the merchant to update
   * @param updates - Partial merchant data to update
   */
  updateMerchant: (merchantId: string, updates: Partial<Merchant>) => void;

  /**
   * Finds a merchant by ID
   * @param merchantId - The ID of the merchant to find
   * @returns The merchant if found, undefined otherwise
   */
  getMerchantById: (merchantId: string) => Merchant | undefined;

  /**
   * Clears all merchants from the store
   */
  clearMerchants: () => void;
}

/**
 * Combined store type
 */
type MerchantsStore = MerchantsState & MerchantsActions;

/**
 * IndexedDB storage configuration for merchants using Dexie
 */
const indexedDBStorage = createIndexedDBStorage<MerchantsStore>();

/**
 * Development store with DevTools support
 */
const devStore = create<MerchantsStore>()(
  devtools(
    persist(
      (set, get) => ({
        // State
        merchants: [],

        // Actions
        setMerchants: (merchants) => set((state) => ({...state, merchants}), false, "merchants/setMerchants"),

        addMerchant: (merchant) =>
          set(
            (state) => ({
              ...state,
              merchants: [...state.merchants, merchant],
            }),
            false,
            "merchants/addMerchant",
          ),

        removeMerchant: (merchantId) =>
          set(
            (state) => ({
              ...state,
              merchants: state.merchants.filter((m) => m.id !== merchantId),
            }),
            false,
            "merchants/removeMerchant",
          ),

        updateMerchant: (merchantId, updates) =>
          set(
            (state) => ({
              ...state,
              merchants: state.merchants.map((m) => (m.id === merchantId ? {...m, ...updates} : m)),
            }),
            false,
            "merchants/updateMerchant",
          ),

        getMerchantById: (merchantId) => {
          const state = get();
          return state.merchants.find((m) => m.id === merchantId);
        },

        clearMerchants: () => set((state) => ({...state, merchants: []}), false, "merchants/clearMerchants"),
      }),
      {
        name: "merchants-store",
        storage: indexedDBStorage,
      },
    ),
    {
      name: "MerchantsStore",
      enabled: process.env.NODE_ENV === "development",
    },
  ),
);

/**
 * Production store without DevTools
 */
const prodStore = create<MerchantsStore>()(
  persist(
    (set, get) => ({
      // State
      merchants: [],

      // Actions
      setMerchants: (merchants) => set((state) => ({...state, merchants})),

      addMerchant: (merchant) =>
        set((state) => ({
          ...state,
          merchants: [...state.merchants, merchant],
        })),

      removeMerchant: (merchantId) =>
        set((state) => ({
          ...state,
          merchants: state.merchants.filter((m) => m.id !== merchantId),
        })),

      updateMerchant: (merchantId, updates) =>
        set((state) => ({
          ...state,
          merchants: state.merchants.map((m) => (m.id === merchantId ? {...m, ...updates} : m)),
        })),

      getMerchantById: (merchantId) => {
        const state = get();
        return state.merchants.find((m) => m.id === merchantId);
      },

      clearMerchants: () => set((state) => ({...state, merchants: []})),
    }),
    {
      name: "merchants-store",
      storage: indexedDBStorage,
    },
  ),
);

/**
 * Merchants store hook - automatically uses development or production version
 * based on NODE_ENV. Persists data in IndexedDB for offline support.
 *
 * @returns The merchants store with state and actions
 *
 * @example
 * ```tsx
 * function MerchantsList() {
 *   const { merchants, setMerchants, addMerchant } = useMerchantsStore();
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
export const useMerchantsStore = process.env.NODE_ENV === "production" ? prodStore : devStore;
