export const buildTitleForComponent = <T>(component: React.ComponentType<T>) =>
  `Design System/${component.displayName}`;
