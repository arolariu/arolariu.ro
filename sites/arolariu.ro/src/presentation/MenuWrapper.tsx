/** @format */

import {Menu, MenuTrigger} from "react-aria-components";

type MenuWrapperProps = {
  callToActionButton: React.JSX.Element;
  children: React.ReactNode;
};

export const MenuWrapper = ({callToActionButton: MenuButton, children: MenuItems}: Readonly<MenuWrapperProps>) => {
  return (
    <MenuTrigger>
      {MenuButton}
      <Menu>{MenuItems}</Menu>
    </MenuTrigger>
  );
};
