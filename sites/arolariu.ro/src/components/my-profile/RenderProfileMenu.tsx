/** @format */

import RenderProfileMenuItem from "./RenderProfileMenuItem";

interface Props {
	currentTab: number;
	// eslint-disable-next-line no-unused-vars
	setCurrentTab: (_: number) => void;
}

export default function RenderProfileMenu({
	currentTab,
	setCurrentTab,
}: Props) {
	// TODO: This menu is not responsive for mobile and small tablet devices.
	return (
		<ul className="md:mt-6 md:space-y-1">
			<RenderProfileMenuItem
				actualTab={1}
				currentTab={currentTab}
				setCurrentTab={setCurrentTab}
				menuItemText="Your Profile"
			/>
			<RenderProfileMenuItem
				actualTab={2}
				currentTab={currentTab}
				setCurrentTab={setCurrentTab}
				menuItemText="Your Data"
			/>
			<RenderProfileMenuItem
				actualTab={3}
				currentTab={currentTab}
				setCurrentTab={setCurrentTab}
				menuItemText="Your Insights"
			/>
			<RenderProfileMenuItem
				actualTab={4}
				currentTab={currentTab}
				setCurrentTab={setCurrentTab}
				menuItemText="Your Preferences"
			/>
			<RenderProfileMenuItem
				actualTab={5}
				currentTab={currentTab}
				setCurrentTab={setCurrentTab}
				menuItemText="Account Information"
			/>
			<RenderProfileMenuItem
				actualTab={6}
				currentTab={currentTab}
				setCurrentTab={setCurrentTab}
				menuItemText="Site Information"
			/>
		</ul>
	);
}
