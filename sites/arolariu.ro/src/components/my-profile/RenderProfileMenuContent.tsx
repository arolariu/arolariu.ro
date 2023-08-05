/** @format */

"use client";

import {Session} from "next-auth";
import YourProfileComponent from "./specific-components/YourProfileComponent";
import YourDataComponent from "./specific-components/YourDataComponent";
import YourInsightsComponent from "./specific-components/YourInsightsComponent";
import YourPreferencesComponent from "./specific-components/YourPreferencesComponent";
import AccountInformation from "./specific-components/AccountInformation";
import SiteInformation from "./specific-components/SiteInformation";

interface Props {
  session: Session;
  currentStep: number;
}

const getCorrectComponent = (session: Session, currentStep: number) => {
  switch (currentStep) {
    case 1:
      return <YourProfileComponent session={session} />;
    case 2:
      return <YourDataComponent />;
    case 3:
      return <YourInsightsComponent />;
    case 4:
      return <YourPreferencesComponent />;
    case 5:
      return <AccountInformation />;
    case 6:
      return <SiteInformation />;
    default:
      return null;
  }
};

export default function RenderProfileMenuContent({
  session,
  currentStep,
}: Props) {
  return (
    <div className="container flex col-span-4 ml-2">
      {getCorrectComponent(session, currentStep)}
    </div>
  );
}
