/**
 * @fileoverview Tests for the RichText component with the real next-intl-selector runtime.
 * @module presentation/Text/RichText.test
 */

import {render, screen} from "@testing-library/react";
import {NextIntlClientProvider, type AbstractIntlMessages} from "next-intl";
import {afterEach, describe, expect, it, vi} from "vitest";
import {RichText} from "./RichText";

// Opt out of the global translator stub so the real tag renderers run.
vi.mock("next-intl-selector", async (importOriginal) => importOriginal());

const messages: AbstractIntlMessages = {
  demo: {
    formatted: "Hello <strong>bold</strong> and <em>italic</em> with <code>code()</code>",
    lineBreak: "first<br></br>second",
    list: "<ul><li>one</li><li>two</li></ul>",
    inline: "plain <span>wrapped</span>",
  },
};

function renderRichText(textKey: string, className?: string): ReturnType<typeof render> {
  return render(
    <NextIntlClientProvider
      locale='en'
      messages={messages}>
      <RichText
        className={className}
        sectionKey='demo'
        textKey={textKey}
      />
    </NextIntlClientProvider>,
  );
}

describe("RichText", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders strong, em and code tags as semantic elements inside the wrapper span", () => {
    const {container} = renderRichText("formatted", "wrapper");

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.tagName).toBe("SPAN");
    expect(wrapper).toHaveClass("wrapper");
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByText("italic").tagName).toBe("EM");
    expect(screen.getByText("code()").tagName).toBe("CODE");
    expect(wrapper.querySelectorAll("ul")).toHaveLength(0);
  });

  it("renders a br tag pair as a line break between the surrounding text", () => {
    const {container} = renderRichText("lineBreak");

    expect(container.querySelectorAll("br")).toHaveLength(1);
    expect(container).toHaveTextContent("firstsecond");
  });

  it("renders ul and li tags as a list with one item per li", () => {
    const {container} = renderRichText("list");

    expect(container.querySelectorAll("ul")).toHaveLength(1);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.textContent)).toEqual(["one", "two"]);
  });

  it("renders a span tag nested in the wrapper span", () => {
    const {container} = renderRichText("inline");

    const nested = screen.getByText("wrapped");
    expect(nested.tagName).toBe("SPAN");
    expect(container.firstElementChild).toContainElement(nested);
    expect(container).toHaveTextContent("plain wrapped");
  });

  it("warns and renders an empty span when the message cannot be rendered", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const {container} = render(
      <NextIntlClientProvider
        locale='en'
        messages={messages}
        onError={(cause) => {
          throw cause;
        }}>
        <RichText
          sectionKey='demo'
          textKey='missing'
        />
      </NextIntlClientProvider>,
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.tagName).toBe("SPAN");
    expect(wrapper).toBeEmptyDOMElement();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toBe('[RichText] Failed to render "demo.missing":');
    expect(error).not.toHaveBeenCalled();
  });
});
