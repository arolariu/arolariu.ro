import {useZustandStore} from "@/hooks/stateStore";
import {type Invoice} from "@/types/invoices";
import {useCallback, useEffect} from "react";
import {GridView} from "./GridView";
import {TableView} from "./TableView";

type Props = {
  mode: "table" | "grid";
  paginatedInvoices: Invoice[];
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  pageSize: number;
};

/**
 * This function renders the invoices table or grid view based on the mode.
 * It also handles pagination and selection of invoices.
 * @param props The props for the component.
 * @returns The rendered invoices table or grid view.
 */
export default function InvoicesTable(props: Readonly<Props>): React.JSX.Element {
  const {mode, currentPage, pageSize, setCurrentPage, setPageSize, totalPages, paginatedInvoices: invoices} = props;
  const setSelectedInvoices = useZustandStore((state) => state.setSelectedInvoices);

  const handleNextPage = useCallback(
    () => {
      if (currentPage < totalPages) {
        setCurrentPage(currentPage + 1);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set is a stable function.
    [currentPage, totalPages],
  );

  const handlePrevPage = useCallback(
    () => {
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set is a stable function.
    [currentPage],
  );

  const handlePageSizeChange = useCallback(
    (size: number) => {
      setPageSize(size);
      setCurrentPage(1);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set is a stable function.
    [],
  );

  useEffect(
    () => () => {
      setSelectedInvoices([]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- set is a stable function.
    [],
  );

  switch (mode) {
    case "table":
      return (
        <TableView
          invoices={invoices}
          pageSize={pageSize}
          currentPage={currentPage}
          totalPages={totalPages}
          handlePrevPage={handlePrevPage}
          handleNextPage={handleNextPage}
          handlePageSizeChange={handlePageSizeChange}
        />
      );
    case "grid":
      return <GridView invoices={invoices} />;

    default:
      return <GridView invoices={invoices} />;
  }
}
