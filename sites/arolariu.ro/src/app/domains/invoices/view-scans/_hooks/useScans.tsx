"use client";

/**
 * @fileoverview Custom hook for managing scans with sync functionality.
 * @module app/domains/invoices/view-scans/_hooks/useScans
 */

import {fetchScans} from "@/lib/actions/scans";
import {useScansStore} from "@/stores";
import type {CachedScan} from "@/types/scans";
import {ScanStatus} from "@/types/scans";
import {useCallback, useEffect} from "react";
import {useShallow} from "zustand/react/shallow";

/**
 * Hook output type
 */
interface UseScansOutput {
	/** All ready scans (excluding archived) */
	scans: ReadonlyArray<CachedScan>;
	/** Currently selected scans */
	selectedScans: CachedScan[];
	/** Whether the store has been hydrated */
	hasHydrated: boolean;
	/** Whether a sync is in progress */
	isSyncing: boolean;
	/** Last sync timestamp */
	lastSyncTimestamp: Date | null;
	/** Toggle scan selection */
	toggleSelection: (scan: CachedScan) => void;
	/** Select all scans */
	selectAll: () => void;
	/** Clear selection */
	clearSelection: () => void;
	/** Sync scans with Azure */
	syncScans: () => Promise<void>;
	/** Remove a scan from store and optionally delete from Azure */
	removeScan: (scanId: string) => void;
}

/**
 * Custom hook for managing scans with store and sync logic.
 *
 * @remarks
 * Combines the scansStore with background sync functionality.
 * On mount, reads from IndexedDB cache for fast initial render,
 * then syncs with Azure in the background.
 * Authentication is handled by the server actions.
 */
export function useScans(): UseScansOutput {
	const {
		scans,
		selectedScans,
		hasHydrated,
		isSyncing,
		lastSyncTimestamp,
		setScans,
		toggleScanSelection,
		selectAllScans,
		clearSelectedScans,
		setIsSyncing,
		setLastSyncTimestamp,
		removeScan: removeFromStore,
	} = useScansStore(
		useShallow((state) => ({
			scans: state.scans,
			selectedScans: state.selectedScans,
			hasHydrated: state.hasHydrated,
			isSyncing: state.isSyncing,
			lastSyncTimestamp: state.lastSyncTimestamp,
			setScans: state.setScans,
			toggleScanSelection: state.toggleScanSelection,
			selectAllScans: state.selectAllScans,
			clearSelectedScans: state.clearSelectedScans,
			setIsSyncing: state.setIsSyncing,
			setLastSyncTimestamp: state.setLastSyncTimestamp,
			removeScan: state.removeScan,
		})),
	);

	// Filter to only show ready scans (not archived)
	const readyScans = scans.filter((s) => s.status === ScanStatus.READY);

	/**
	 * Sync scans with Azure Blob Storage.
	 * Fetches all scans for the user and merges with local cache.
	 * Authentication is handled by the server action.
	 */
	const syncScans = useCallback(async (): Promise<void> => {
		if (isSyncing) return;

		setIsSyncing(true);

		try {
			const fetchedScans = await fetchScans({
				includeArchived: false,
			});

			// Convert to cached scans with cache timestamp
			const cachedScans: CachedScan[] = fetchedScans.map((scan) => ({
				...scan,
				cachedAt: new Date(),
			}));

			setScans(cachedScans);
			setLastSyncTimestamp(new Date());
		} catch (error) {
			console.error("Failed to sync scans:", error);
		} finally {
			setIsSyncing(false);
		}
	}, [isSyncing, setIsSyncing, setScans, setLastSyncTimestamp]);

	// Auto-sync on mount when hydrated
	useEffect(() => {
		if (hasHydrated && !lastSyncTimestamp) {
			syncScans();
		}
	}, [hasHydrated, lastSyncTimestamp, syncScans]);

	return {
		scans: readyScans,
		selectedScans,
		hasHydrated,
		isSyncing,
		lastSyncTimestamp,
		toggleSelection: toggleScanSelection,
		selectAll: selectAllScans,
		clearSelection: clearSelectedScans,
		syncScans,
		removeScan: removeFromStore,
	};
}
