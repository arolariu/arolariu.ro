import {render} from "@testing-library/react";
import {createRef} from "react";
import {describe, expect, it} from "vitest";

import {ListSkeleton} from "./list-skeleton";
import styles from "./list-skeleton.module.css";

describe("ListSkeleton", () => {
  it("renders the default number of items", () => {
    const {container} = render(<ListSkeleton />);

    expect(container.querySelectorAll(`.${styles.item}`)).toHaveLength(5);
    expect(container.querySelectorAll(`.${styles.avatar}`)).toHaveLength(5);
  });

  it("omits avatars when requested", () => {
    const {container} = render(<ListSkeleton showAvatar={false} />);

    expect(container.querySelectorAll(`.${styles.avatar}`)).toHaveLength(0);
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLDivElement>();

    render(<ListSkeleton ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
