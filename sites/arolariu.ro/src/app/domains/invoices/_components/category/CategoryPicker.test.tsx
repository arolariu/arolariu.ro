import {act, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {NextIntlClientProvider} from "next-intl";
import {useState} from "react";
import {describe, expect, it, vi} from "vitest";
import messages from "../../../../../../messages/ro.json";
import type english from "../../../../../../messages/en.json";
import {InvoiceCategory} from "@/types/invoices/Category";
import CategoryPicker from "./CategoryPicker";

vi.unmock("next-intl");
vi.unmock("next-intl-selector");

function Form(): React.JSX.Element {
  const [category, setCategory] = useState<InvoiceCategory | null>(null);
  return (
    <NextIntlClientProvider
      locale='ro'
      messages={messages as unknown as typeof english}>
      <CategoryPicker
        domain='invoices'
        label='Categoria bonului'
        value={category}
        onValueChange={setCategory}
      />
      <output data-testid='saved-category'>{category ?? "none"}</output>
    </NextIntlClientProvider>
  );
}

describe("CategoryPicker", () => {
  it("selects a translated match by keyboard and clears it explicitly", async () => {
    const user = userEvent.setup();
    render(<Form />);
    const input = screen.getByRole("combobox", {name: "Categoria bonului"});
    await act(async () => user.type(input, "Cump"));
    expect(await screen.findByRole("option", {name: "Cumpărături alimentare"})).toBeInTheDocument();
    await act(async () => user.keyboard("{ArrowDown}{Enter}"));
    expect(screen.getByTestId("saved-category")).toHaveTextContent("3001");
    await act(async () => user.click(screen.getByRole("button", {name: "Șterge categoria"})));
    expect(screen.getByTestId("saved-category")).toHaveTextContent("none");
  });
});
