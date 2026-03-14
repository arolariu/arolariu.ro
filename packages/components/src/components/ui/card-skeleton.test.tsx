import {render} from "@testing-library/react";
import {createRef} from "react";
import {describe, expect, it} from "vitest";

import {CardSkeleton} from "./card-skeleton";
import styles from "./card-skeleton.module.css";

describe("CardSkeleton", () => {
  it("renders the default number of skeleton lines", () => {
    const {container} = render(<CardSkeleton />);

    expect(container.querySelectorAll(`.${styles.line}`)).toHaveLength(3);
  });

  it("renders a custom number of skeleton lines", () => {
    const {container} = render(<CardSkeleton lines={5} />);

    expect(container.querySelectorAll(`.${styles.line}`)).toHaveLength(5);
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();

    render(<CardSkeleton ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
