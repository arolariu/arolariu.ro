import { ReactElement } from "react";
import AccordionItem from "./AccordionItem";

// TODO: enforce that children is of type AccordionItem (currently doesn't work)
interface Props { children: ReactElement<typeof AccordionItem> | ReactElement<typeof AccordionItem>[]; }

export default function Accordion({children}: Readonly<Props>) {
	return <div className="bg-white border border-gray-100 divide-y divide-gray-100 rounded-xl">{children}</div>;
}
