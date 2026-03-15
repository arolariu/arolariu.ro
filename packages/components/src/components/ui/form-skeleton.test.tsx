import {render} from "@testing-library/react";
import {createRef} from "react";
import {describe, expect, it} from "vitest";

import {FormSkeleton} from "./form-skeleton";
import styles from "./form-skeleton.module.css";

describe("FormSkeleton", () => {
  it("renders without crashing", () => {
    const {container} = render(<FormSkeleton />);

    expect(container.querySelectorAll(`.${styles.field}`)).toHaveLength(4);
  });

  it("renders a custom number of fields", () => {
    const {container} = render(<FormSkeleton fields={6} />);

    expect(container.querySelectorAll(`.${styles.field}`)).toHaveLength(6);
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();

    render(<FormSkeleton ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
