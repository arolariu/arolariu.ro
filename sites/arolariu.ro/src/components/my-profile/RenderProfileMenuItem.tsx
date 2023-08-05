/** @format */

interface Props {
	actualTab: number;
	currentTab: number;
	// eslint-disable-next-line no-unused-vars
	setCurrentTab: (_: number) => void;
	menuItemText: string;
}

export default function RenderProfileMenuItem({
	actualTab,
	currentTab,
	setCurrentTab,
	menuItemText,
}: Props) {
	const styledTab = "bg-gray-100 text-gray-900";
	const unstyledTab = "text-gray-300 hover:bg-gray-50 hover:text-gray-900";
	return (
		<li
			onClick={() => setCurrentTab(actualTab)}
			className={
				`${actualTab === currentTab ? styledTab : unstyledTab}` +
				" mr-1 block rounded-lg px-4 py-2 text-sm font-medium"
			}
		>
			{menuItemText}
		</li>
	);
}
