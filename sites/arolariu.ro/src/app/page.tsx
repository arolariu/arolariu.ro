import RenderHomeScreen from "./island";

/**
 * The home page component.
 * @returns The home page component.
 */
export default async function Home(props: Readonly<PageProps<"/">>): Promise<React.JSX.Element> {
  return <RenderHomeScreen />;
}
