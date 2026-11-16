import {render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import type {NotFoundContentCopy} from "./_components/GlobalNotFoundContent";
import NotFound from "./not-found";

// The first evaluation of the Header/Footer/component-library graph is slow. Paying for it during collection (like the former
// static import did) keeps the per-test re-imports below inside the test timeout.
await import("./_components/GlobalNotFoundContent");

describe("app/not-found.tsx", () => {
  it("renders the 404 title and subtitle keys", () => {
    render(<NotFound />);
    expect(screen.getByText("app.errors.notFound.title")).toBeInTheDocument();
    expect(screen.getByText("app.errors.notFound.subtitle")).toBeInTheDocument();
  });

  it("renders a link back to the home page", () => {
    render(<NotFound />);
    const link = screen.getByRole("link", {name: "app.errors.notFound.buttons.returnButton"});
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });
});

describe("GlobalNotFoundContent", () => {
  const copy: NotFoundContentCopy = {
    title: "404",
    subtitle: "Page not found",
    additionalInfo: "Additional Information",
    falsePositive: "Think this is an error?",
    submitErrorButton: "Submit Error Report",
    returnButton: "Return to Homepage",
  };

  // `SITE_URL` is read once at module load, so each case re-imports the component against its own environment.
  const renderContentForSiteUrl = async (siteUrl: string | undefined): Promise<void> => {
    vi.stubEnv("SITE_URL", siteUrl);
    vi.resetModules();
    const {GlobalNotFoundContent} = await import("./_components/GlobalNotFoundContent");

    render(
      <GlobalNotFoundContent
        qrCodeData='{"userId":"storybook"}'
        copy={copy}
      />,
    );
  };

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders request-independent 404 content from typed copy", async () => {
    await renderContentForSiteUrl("https://dev.arolariu.ro");

    expect(screen.getByRole("heading", {level: 1, name: "404"})).toBeInTheDocument();
    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(screen.getByRole("link", {name: "Submit Error Report"})).toHaveAttribute("href", "/");
  });

  it.each([
    {environment: "production", siteUrl: "https://arolariu.ro"},
    {environment: "development", siteUrl: "https://dev.arolariu.ro"},
    {environment: "local", siteUrl: "https://localhost:3000"},
  ])("points the return link at the $environment SITE_URL", async ({siteUrl}) => {
    await renderContentForSiteUrl(siteUrl);

    expect(screen.getByRole("link", {name: "Return to Homepage"})).toHaveAttribute("href", `${siteUrl}/`);
  });

  it("falls back to the current origin's home page when SITE_URL is not configured", async () => {
    await renderContentForSiteUrl(undefined);

    expect(screen.getByRole("link", {name: "Return to Homepage"})).toHaveAttribute("href", "/");
  });
});
