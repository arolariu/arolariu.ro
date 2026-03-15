import {render} from "@testing-library/react";
import {createRef} from "react";
import {describe, expect, it} from "vitest";

import {TableSkeleton} from "./table-skeleton";
import styles from "./table-skeleton.module.css";

describe("TableSkeleton", () => {
  it("renders the default number of rows and columns", () => {
    const {container} = render(<TableSkeleton />);

    expect(container.querySelectorAll(`.${styles.row}`)).toHaveLength(5);
    expect(container.querySelectorAll(`.${styles.headerCell}`)).toHaveLength(4);
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();

    render(<TableSkeleton ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
