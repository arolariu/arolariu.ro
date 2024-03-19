/* eslint-disable no-unused-vars */
import Invoice from "@/types/invoices/Invoice";
import {mountStoreDevtool} from "simple-zustand-devtools";
import {create} from "zustand";

type States = {
	invoices: Invoice[];
	selectedInvoice: Invoice;
};

type Actions = {
	// Invoices[] actions:
	setInvoices: (invoices: Invoice[]) => void;
	addInvoice: (invoice: Invoice) => void;
	removeInvoice: (invoice: Invoice) => void;
	updateInvoice: (invoice: Invoice) => void;

	// Invoice actions:
	setSelectedInvoice: (invoice: Invoice) => void;
	updateSelectedInvoice: (invoice: Invoice) => void;
	removeSelectedInvoice: (invoice: Invoice) => void;
};

export const useZustandStore = create<States & Actions>()((set) => ({
	invoices: [],
	selectedInvoice: {} as Invoice,
	setInvoices: (invoices: Invoice[]) => set({invoices}),
	addInvoice: (invoice: Invoice) => set((state: any) => ({invoices: [...state.invoices, invoice]})),
	removeInvoice: (invoice: Invoice) =>
		set((state: any) => ({invoices: state.invoices.filter((i: Invoice) => i.id !== invoice.id)})),
	updateInvoice: (invoice: Invoice) =>
		set((state: any) => ({
			invoices: state.invoices.map((i: Invoice) => (i.id === invoice.id ? invoice : i)),
		})),
	setSelectedInvoice: (invoice: Invoice) => set({selectedInvoice: invoice}),
	updateSelectedInvoice: (invoice: Invoice) => set({selectedInvoice: invoice}),
	removeSelectedInvoice: () => set({selectedInvoice: {} as Invoice}),
}));

if (process.env.NODE_ENV === "development") {
	mountStoreDevtool("Store", useZustandStore);
}
