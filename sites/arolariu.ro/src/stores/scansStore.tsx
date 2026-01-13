/**
 * @fileoverview Zustand store for managing standalone scans state with IndexedDB persistence.
 * Each scan is stored as an individual row in the IndexedDB scans table.
 * @module stores/scansStore
 */

import type {CachedScan} from "@/types/scans";
import {ScanStatus} from "@/types/scans";
import {create} from "zustand";
import {devtools, persist} from "zustand/middleware";
import {createIndexedDBStorage} from "./storage/indexedDBStorage";

/**
 * Scan store persisted state type.
 * Only the scans array is persisted to IndexedDB.
 */
type ScansPersistedState = {
	/** All scans in the store */
	scans: ReadonlyArray<CachedScan>;
};

/**
 * Scan store in-memory state type.
 * These fields are not persisted to IndexedDB.
 */
type ScansState = ScansPersistedState & {
	/** Currently selected scans for invoice creation (in-memory only) */
	selectedScans: CachedScan[];
	/** Indicates whether the store has been hydrated from IndexedDB */
	hasHydrated: boolean;
	/** Indicates whether a sync operation is in progress */
	isSyncing: boolean;
	/** Timestamp of the last successful sync with Azure */
	lastSyncTimestamp: Date | null;
};

/**
 * Scan store actions type
 */
type ScansActions = {
	/**
	 * Sets the complete list of scans
	 * @param scans The new scans array
	 */
	setScans: (scans: ReadonlyArray<CachedScan>) => void;

	/**
	 * Sets the selected scans
	 * @param selectedScans The new selected scans array
	 */
	setSelectedScans: (selectedScans: CachedScan[]) => void;

	/**
	 * Adds a single scan to the store
	 * @param scan The scan to add
	 */
	addScan: (scan: CachedScan) => void;

	/**
	 * Upserts a single scan to the store (updates if exists, adds if not)
	 * @param scan The scan to upsert
	 */
	upsertScan: (scan: CachedScan) => void;

	/**
	 * Removes a scan by ID
	 * @param scanId The ID of the scan to remove
	 */
	removeScan: (scanId: string) => void;

	/**
	 * Removes multiple scans by ID
	 * @param scanIds The IDs of the scans to remove
	 */
	removeScans: (scanIds: string[]) => void;

	/**
	 * Updates a scan's status
	 * @param scanId The ID of the scan to update
	 * @param status The new status
	 */
	updateScanStatus: (scanId: string, status: ScanStatus) => void;

	/**
	 * Updates a scan's name
	 * @param scanId The ID of the scan to update
	 * @param name The new name
	 */
	updateScanName: (scanId: string, name: string) => void;

	/**
	 * Toggles a scan's selection status
	 * @param scan The scan to toggle
	 */
	toggleScanSelection: (scan: CachedScan) => void;

	/**
	 * Selects all ready scans
	 */
	selectAllScans: () => void;

	/**
	 * Clears all selected scans
	 */
	clearSelectedScans: () => void;

	/**
	 * Archives scans (sets status to ARCHIVED)
	 * @param scanIds The IDs of scans to archive
	 */
	archiveScans: (scanIds: string[]) => void;

	/**
	 * Updates a scan's metadata
	 * @param scanId The ID of the scan to update
	 * @param metadata The metadata to merge with existing metadata
	 */
	updateScanMetadata: (scanId: string, metadata: Record<string, string>) => void;

	/**
	 * Marks scans as used by an invoice
	 * @param scanIds The IDs of scans to mark
	 * @param invoiceId The ID of the invoice using these scans
	 */
	markScansAsUsedByInvoice: (scanIds: string[], invoiceId: string) => void;

	/**
	 * Clears all scans from the store
	 */
	clearScans: () => void;

	/**
	 * Sets the hydration status
	 * @param hasHydrated Whether the store has been hydrated
	 */
	setHasHydrated: (hasHydrated: boolean) => void;

	/**
	 * Sets the syncing status
	 * @param isSyncing Whether a sync is in progress
	 */
	setIsSyncing: (isSyncing: boolean) => void;

	/**
	 * Sets the last sync timestamp
	 * @param timestamp The timestamp of the last sync
	 */
	setLastSyncTimestamp: (timestamp: Date | null) => void;
};

/**
 * Combined store type
 */
type ScansStore = ScansState & ScansActions;

/**
 * IndexedDB storage configuration for scans using Dexie.
 * Each scan is stored as an individual row with id as primary key.
 */
const indexedDBStorage = createIndexedDBStorage<ScansPersistedState, CachedScan>({
	table: "scans",
	entityKey: "scans",
});

/**
 * Persist middleware configuration
 */
const persistConfig = {
	name: "scans-store",
	storage: indexedDBStorage,
	partialize: (state: ScansStore): ScansPersistedState => ({
		scans: [...state.scans],
	}),
	onRehydrateStorage: () => (state: ScansStore | undefined) => {
		state?.setHasHydrated(true);
	},
} as const;

/**
 * Create the initial state and actions
 */
const createScansSlice = (set: (partial: Partial<ScansStore> | ((state: ScansStore) => Partial<ScansStore>)) => void): ScansStore => ({
	// State
	scans: [],
	selectedScans: [],
	hasHydrated: false,
	isSyncing: false,
	lastSyncTimestamp: null,

	// Actions
	setScans: (scans) => set({scans}),

	setSelectedScans: (selectedScans) => set({selectedScans}),

	addScan: (scan) =>
		set((state) => ({
			scans: [...state.scans, scan],
		})),

	upsertScan: (scan) =>
		set((state) => {
			const existingIndex = state.scans.findIndex((s) => s.id === scan.id);
			if (existingIndex !== -1) {
				// Update existing scan
				const updatedScans = [...state.scans];
				updatedScans[existingIndex] = scan;
				return {scans: updatedScans};
			}
			// Add new scan
			return {scans: [...state.scans, scan]};
		}),

	removeScan: (scanId) =>
		set((state) => ({
			scans: state.scans.filter((s) => s.id !== scanId),
			selectedScans: state.selectedScans.filter((s) => s.id !== scanId),
		})),

	removeScans: (scanIds) =>
		set((state) => {
			const idSet = new Set(scanIds);
			return {
				scans: state.scans.filter((s) => !idSet.has(s.id)),
				selectedScans: state.selectedScans.filter((s) => !idSet.has(s.id)),
			};
		}),

	updateScanStatus: (scanId, status) =>
		set((state) => ({
			scans: state.scans.map((s) => (s.id === scanId ? {...s, status} : s)),
			selectedScans: state.selectedScans.map((s) => (s.id === scanId ? {...s, status} : s)),
		})),

	updateScanName: (scanId, name) =>
		set((state) => ({
			scans: state.scans.map((s) => (s.id === scanId ? {...s, name} : s)),
			selectedScans: state.selectedScans.map((s) => (s.id === scanId ? {...s, name} : s)),
		})),

	toggleScanSelection: (scan) =>
		set((state) => {
			const isSelected = state.selectedScans.some((s) => s.id === scan.id);
			return {
				selectedScans: isSelected ? state.selectedScans.filter((s) => s.id !== scan.id) : [...state.selectedScans, scan],
			};
		}),

	selectAllScans: () =>
		set((state) => ({
			selectedScans: state.scans.filter((s) => s.status === ScanStatus.READY) as CachedScan[],
		})),

	clearSelectedScans: () => set({selectedScans: []}),

	archiveScans: (scanIds) =>
		set((state) => {
			const idSet = new Set(scanIds);
			return {
				scans: state.scans.map((s) => (idSet.has(s.id) ? {...s, status: ScanStatus.ARCHIVED} : s)),
				selectedScans: state.selectedScans.filter((s) => !idSet.has(s.id)),
			};
		}),

	updateScanMetadata: (scanId, metadata) =>
		set((state) => ({
			scans: state.scans.map((s) =>
				s.id === scanId
					? {
							...s,
							metadata: {...s.metadata, ...metadata},
						}
					: s,
			),
			selectedScans: state.selectedScans.map((s) =>
				s.id === scanId
					? {
							...s,
							metadata: {...s.metadata, ...metadata},
						}
					: s,
			),
		})),

	markScansAsUsedByInvoice: (scanIds, invoiceId) =>
		set((state) => {
			const idSet = new Set(scanIds);
			const timestamp = new Date().toISOString();
			return {
				scans: state.scans.map((s) =>
					idSet.has(s.id)
						? {
								...s,
								metadata: {
									...s.metadata,
									usedByInvoice: "true",
									invoiceId,
									invoiceCreatedAt: timestamp,
								},
							}
						: s,
				),
			};
		}),

	clearScans: () => set({scans: [], selectedScans: []}),

	setHasHydrated: (hasHydrated) => set({hasHydrated}),

	setIsSyncing: (isSyncing) => set({isSyncing}),

	setLastSyncTimestamp: (timestamp) => set({lastSyncTimestamp: timestamp}),
});

/**
 * Development store with DevTools integration
 */
const createDevStore = () =>
	create<ScansStore>()(
		devtools(persist((set) => createScansSlice(set), persistConfig), {
			name: "ScansStore",
			enabled: true,
		}),
	);

/**
 * Production store without DevTools for better performance
 */
const createProdStore = () => create<ScansStore>()(persist((set) => createScansSlice(set), persistConfig));

/**
 * Scans store with conditional DevTools support based on environment.
 * Uses entity-level IndexedDB persistence where each scan is stored as an individual row.
 * Only the scans array is persisted; selectedScans and sync state remain in-memory only.
 * @remarks Persists data in IndexedDB for offline support and fast initial load.
 * @returns The scans store with state and actions.
 * @example
 * ```tsx
 * function ScansList() {
 *   const { scans, selectedScans, toggleScanSelection } = useScansStore();
 *
 *   return (
 *     <div>
 *       {scans.map(scan => (
 *         <ScanCard
 *           key={scan.id}
 *           scan={scan}
 *           selected={selectedScans.some(s => s.id === scan.id)}
 *           onSelect={() => toggleScanSelection(scan)}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export const useScansStore = process.env.NODE_ENV === "development" ? createDevStore() : createProdStore();
