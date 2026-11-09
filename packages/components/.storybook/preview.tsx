import {useLayoutEffect, type ReactNode} from "react";
import type {Preview} from "storybook-react-rsbuild";
import "../src/index.css";
import {lightTheme} from "./theme";

type Theme = "light" | "dark";
interface DocumentTheme {
  readonly previous: {
    readonly theme: string | null;
    readonly bodyBackground: string;
    readonly bodyColor: string;
    readonly htmlBackground: string;
  };
  readonly owners: Map<symbol, Theme>;
}

const documentThemes = new WeakMap<Document, DocumentTheme>();

function applyTheme(document: Document, theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.backgroundColor = "var(--ac-background)";
  document.body.style.backgroundColor = "var(--ac-background)";
  document.body.style.color = "var(--ac-foreground)";
}

function PreviewTheme({theme, children}: Readonly<{theme: Theme; children: ReactNode}>): React.JSX.Element {
  useLayoutEffect(() => {
    let state = documentThemes.get(document);
    if (!state) {
      state = {
        previous: {
          theme: document.documentElement.getAttribute("data-theme"),
          bodyBackground: document.body.style.backgroundColor,
          bodyColor: document.body.style.color,
          htmlBackground: document.documentElement.style.backgroundColor,
        },
        owners: new Map(),
      };
      documentThemes.set(document, state);
    }
    // Docs pages mount several stories in one document; one unmount must not
    // remove the root theme still owned by another preview.
    const owner = Symbol();
    state.owners.set(owner, theme);
    applyTheme(document, theme);
    return () => {
      state.owners.delete(owner);
      const remaining = [...state.owners.values()].at(-1);
      if (remaining) {
        applyTheme(document, remaining);
      } else {
        const {previous} = state;
        if (previous.theme === null) document.documentElement.removeAttribute("data-theme");
        else document.documentElement.setAttribute("data-theme", previous.theme);
        document.body.style.backgroundColor = previous.bodyBackground;
        document.body.style.color = previous.bodyColor;
        document.documentElement.style.backgroundColor = previous.htmlBackground;
        documentThemes.delete(document);
      }
    };
  }, [theme]);

  return (
    <>
      <style>{`.ac-storybook-preview { box-sizing: border-box; padding: 1rem; min-height: 100vh; background-color: var(--ac-background); color: var(--ac-foreground); }`}</style>
      <div className='ac-storybook-preview'>{children}</div>
    </>
  );
}

const preview: Preview = {
  parameters: {
    layout: "centered",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    docs: {
      theme: lightTheme,
    },
    a11y: {
      config: {
        rules: [
          {id: "color-contrast", enabled: true},
          {id: "aria-required-attr", enabled: true},
          {id: "button-name", enabled: true},
          {id: "image-alt", enabled: true},
        ],
      },
    },
    viewport: {
      viewports: {
        mobile: {name: "Mobile", styles: {width: "375px", height: "812px"}},
        tablet: {name: "Tablet", styles: {width: "768px", height: "1024px"}},
        desktop: {name: "Desktop", styles: {width: "1280px", height: "800px"}},
      },
    },
    options: {
      storySort: {
        order: [
          "Introduction",
          ["Welcome", "Getting Started", "Design Principles"],
          "Foundations",
          ["Design Tokens", "Typography", "Motion", "Component Sizes"],
          "Components",
          [
            "Actions",
            "Forms",
            "Data Display",
            "Feedback",
            "Navigation",
            "Overlays",
            "Layout",
            "Typography",
            "Backgrounds",
            "Utilities",
            "Interactions",
          ],
        ],
      },
    },
  },
  globalTypes: {
    theme: {
      name: "Theme",
      description: "Component theme",
      toolbar: {
        icon: "paintbrush",
        items: [
          {value: "light", title: "☀️ Light", icon: "sun"},
          {value: "dark", title: "🌙 Dark", icon: "moon"},
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: "dark",
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals["theme"] ?? "dark";
      return (
        <PreviewTheme theme={theme === "dark" ? "dark" : "light"}>
          <Story />
        </PreviewTheme>
      );
    },
  ],
};

export default preview;
