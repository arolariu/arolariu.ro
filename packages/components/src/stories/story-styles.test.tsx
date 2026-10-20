import {cleanup, render, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import type {ComponentType} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import postcss, {type Rule} from "postcss";
import {composeStories} from "storybook-react-rsbuild";
import {afterEach, describe, expect, it, vi} from "vitest";

import * as calendarStories from "../components/ui/calendar.stories";
import * as cardSkeletonStories from "../components/ui/card-skeleton.stories";
import * as carouselStories from "../components/ui/carousel.stories";
import * as collapsibleStories from "../components/ui/collapsible.stories";
import * as formStories from "../components/ui/form.stories";
import * as nativeSelectStories from "../components/ui/native-select.stories";
import * as tooltipStories from "../components/ui/tooltip.stories";
import tooltipStyles from "../components/ui/tooltip.module.css";
import * as numberFieldStories from "../components/ui/number-field.stories";
import * as toolbarStories from "../components/ui/toolbar.stories";
import * as meterStories from "../components/ui/meter.stories";
import meterStyles from "../components/ui/meter.module.css";
import * as foundationStories from "./Foundations.stories";
import * as stepperStories from "../components/ui/stepper.stories";
import * as componentSizeStories from "./ComponentSizes.stories";
import * as motionStories from "./Motion.stories";
import * as typographyStories from "./Typography.stories";

const storyFiles = import.meta.glob<Parameters<typeof composeStories>[0]>("../components/ui/*.stories.tsx", {eager: true});
const migratedClasses: Readonly<Record<string, readonly string[]>> = {
  accordion: ["demo", "demoActions", "label"],
  "alert-dialog": ["storyStack", "error"],
  "aspect-ratio": ["storyFrame", "storyMedia"],
  attachment: ["storyStack", "storyNarrow"],
  avatar: ["storyRow", "storyColumn", "storyPanel"],
  "background-beams": ["demo", "demoContent", "demoPair", "demoFullScreen"],
  badge: ["storyRow", "statusDot", "storyLarge"],
  "bubble-background": ["demo", "demoContent", "demoPair", "customPaletteDemo"],
  bubble: ["storyStack"],
  calendar: ["storyFrame", "storyStack", "storyHeading", "storyDescription", "storyDayCell", "eventDot"],
  "card-skeleton": ["storyPreview", "storyGrid"],
  card: ["storyCard", "storyImage", "storyLoadingLine"],
  carousel: [
    "storyFrame",
    "storyTrack",
    "storyPanel",
    "storyNumber",
    "storyMultipleItem",
    "storyPicture",
    "storyIndicators",
    "storyIndicatorRow",
    "storyIndicator",
  ],
  chart: ["storyFrame", "storyCompact", "storyLarge", "storyHeading", "storySamples", "storyDark"],
  checkbox: ["storyRow", "storyStack"],
  collapsible: ["demo", "demoTrigger", "icon", "demoContent"],
  combobox: ["story", "valueTrigger"],
  command: ["story", "storyControls"],
  "context-menu": ["storyTarget"],
  "copy-button": ["storyRow", "storyPanel"],
  "counting-number": ["storyValue", "storyDeferred"],
  dialog: ["formFields", "field", "scrollContent", "wide"],
  "dot-background": ["demo", "resizableDemo", "demoContent"],
  drawer: ["storyContent", "storyActions", "scrollArea"],
  dropdrawer: ["storyContainer", "storyStatus"],
  "error-boundary": ["demo", "panel"],
  field: ["storyNarrow", "storyWide"],
  "fireworks-background": ["demo", "resizableDemo", "demoContent"],
  "flip-button": ["storyLarge", "storyFront"],
  "focus-scope": ["button", "input", "demo", "controls", "panel", "hidden"],
  "form-skeleton": ["storyPreview", "storyPanel", "storyHeading"],
  form: ["demoForm", "demoFields", "demoActions", "demoComposedControl", "demoFocusedControl", "demoOutput", "demoSummary", "demoProgress"],
  "gradient-background": ["demo", "demoContent"],
  "gradient-text": ["demo", "demoHeading", "customGradientDemo"],
  "highlight-text": ["demo", "demoLead"],
  "hole-background": ["demo", "resizableDemo", "demoContent"],
  "hover-card": ["storyContent", "storyTitle", "storyDescription", "storyLink", "storyWide"],
  item: ["storyStack", "storyCheckbox"],
  label: ["storyStack", "storyInline"],
  "list-skeleton": ["storyPreview", "storyPanel", "storyHeading"],
  "loading-overlay": ["owner", "demo", "progress", "button"],
  marker: ["storyStack"],
  message: ["storyStack"],
  meter: ["storyContainer", "storyLabelRow", "storyValue"],
  "native-select": ["example", "exampleActions"],
  "navigation-menu": ["storyPanel", "storyWidePanel", "storyLink", "storyDescription", "storyHint", "storyStack"],
  pagination: ["storyStack", "storyPageSize"],
  popover: ["storyForm", "storyField", "storyInput"],
  progress: ["storyDemo", "storyTrack", "storyIndicator", "storyStatus"],
  "radio-group": ["storyRow", "storyStack"],
  resizable: ["storyFrame", "storyPanel", "storyPanelAlternate", "storyDescription"],
  "ripple-button": ["storyRow", "storyMuted"],
  scratcher: ["demo", "demoPrize"],
  "scroll-area": [
    "storyArea",
    "storyScrollingArea",
    "storyCompact",
    "storyNotes",
    "storyCollection",
    "storyTile",
    "storyWide",
    "storyControls",
  ],
  select: ["scrollExample", "storyStack", "storyOutput", "focusTarget"],
  separator: ["storyStack", "storyRow", "storyHorizontal", "storyVertical"],
  sheet: ["formFields", "field", "storyStack"],
  sidebar: ["storyMain", "storyBrand", "storyMenu", "storyMenuItem"],
  skeleton: ["storyStack", "storyRow", "storyLine", "storyShortLine", "storyAvatar", "storyPanel"],
  slider: ["story", "storyHeader", "storyValue", "storyLabels", "storyVertical"],
  spinner: ["storyMedium", "storyLarge", "storyLabel"],
  stepper: ["storyStack", "storyActions", "storyError"],
  switch: ["storyRow", "storyStack"],
  "table-skeleton": ["storyPreview", "storyPanel", "storyHeading"],
  table: ["storyStriped", "storyCompact"],
  tabs: ["scrollable"],
  textarea: ["storyStack", "storyCount"],
  timeline: ["storyMeta", "storyCompletedDot"],
  "toggle-group": ["storyStack"],
  toggle: ["storyRow", "storyStack"],
  tooltip: ["storyContent", "storyGroup"],
  typewriter: ["storyAccent", "storyCode", "storyStack"],
  "visually-hidden": ["storyRow"],
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function supplyCanvasPlatform(): void {
  // Happy DOM has neither layout nor a 2D canvas. This is the same platform-only
  // boundary used by the visual-effect regression tests; real story/components run.
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 200, 100));
  vi.spyOn(SVGElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 200, 100));
  const context = {
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    ellipse: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    clip: vi.fn(),
    scale: vi.fn(),
    drawImage: vi.fn(),
    isPointInPath: vi.fn(() => false),
    isPointInStroke: vi.fn(() => false),
    createLinearGradient: vi.fn(() => ({addColorStop: vi.fn()})),
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as CanvasRenderingContext2D);
  vi.stubGlobal(
    "Path2D",
    class {
      readonly ellipse = vi.fn();
      readonly rect = vi.fn();
    },
  );
}

function mountedStyles(container: HTMLElement): postcss.Root {
  const sheet = container.querySelector("style");
  if (!sheet?.textContent) throw new Error("Expected styles mounted by the real Storybook decorator");
  return postcss.parse(sheet.textContent);
}

function ruleFor(stylesheet: postcss.Root, selector: string): Rule {
  let result: Rule | undefined;
  stylesheet.walkRules((rule) => {
    if (rule.selectors.includes(selector)) result = rule;
  });
  if (!result) throw new Error(`Missing authored story selector: ${selector}`);
  return result;
}

describe("story-owned style lifecycle", () => {
  it.each(Object.entries(migratedClasses))(
    "mounts and cleans up the actual %s story stylesheet while keeping all proven demo selectors out of production",
    (family, classes) => {
      if (["dot-background", "fireworks-background", "hole-background", "scratcher"].includes(family)) supplyCanvasPlatform();
      const storyFile = storyFiles[`../components/ui/${family}.stories.tsx`];
      if (!storyFile) throw new Error(`Missing owning story module: ${family}`);
      const stories: Readonly<Record<string, ComponentType>> = composeStories(storyFile);
      const Story = stories.Default ?? Object.values(stories)[0];
      if (!Story) throw new Error(`Missing mountable story: ${family}`);
      const {container, unmount} = render(<Story />);
      const mounted = mountedStyles(container);
      const storySelectors: string[] = [];
      mounted.walkRules((rule) => {
        storySelectors.push(...rule.selectors);
      });
      const production = postcss.parse(readFileSync(join(import.meta.dirname, "..", "components", "ui", `${family}.module.css`), "utf8"));
      const productionSelectors: string[] = [];
      production.walkRules((rule) => {
        productionSelectors.push(...rule.selectors);
      });
      for (const className of classes) {
        expect(
          productionSelectors.some((selector) => new RegExp(`\\.${className}(?![\\w-])`, "u").test(selector)),
          `${family}.${className} must not ship`,
        ).toBe(false);
        expect(
          storySelectors.some((selector) => selector.includes(`.ac-story-${family}-${className}`)),
          `${family}.${className} must mount with the owning story`,
        ).toBe(true);
      }
      const sheet = container.querySelector("style");
      unmount();
      expect(sheet?.isConnected).toBe(false);
    },
  );

  it("mounts normal-mode native form styles, forwards args, adds no layout wrapper and cleans up on unmount", () => {
    const {Default} = composeStories(nativeSelectStories);
    const {container, unmount} = render(<Default disabled />);
    const form = screen.getByRole("form", {name: "Native fruit form"});
    expect(form).toHaveClass("ac-story-native-select-example");
    expect(getComputedStyle(form).display).toBe("flex");
    expect(getComputedStyle(form).flexDirection).toBe("column");
    expect(screen.getByRole("combobox", {name: "Fruit"})).toBeDisabled();
    expect([...container.children].map((child) => child.tagName)).toEqual(["STYLE", "FORM"]);
    expect(ruleFor(mountedStyles(container), ".ac-story-native-select-example").parent?.type).toBe("root");
    const sheet = container.querySelector("style");
    unmount();
    expect(sheet?.isConnected).toBe(false);
    expect(document.querySelector("style")?.textContent ?? "").not.toContain("ac-story-native-select-example");
  });

  it("keeps the skeleton decorators and controlled args inside the style-only fragment with a persistent text status region", () => {
    const {Default, LocalizedAnnouncement} = composeStories(cardSkeletonStories);
    // The region exists before any loading text: the server/first render emits it empty.
    expect(renderToStaticMarkup(<Default lines={5} />)).toMatch(/<span[^>]*role="status"[^>]*><\/span>/u);
    const {container, unmount} = render(<Default lines={5} />);
    const preview = container.querySelector(".ac-story-card-skeleton-storyPreview");
    expect(preview).not.toBeNull();
    expect(preview?.parentElement).toBe(container);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    const status = screen.getByRole("status");
    expect(status.textContent).toBe("Loading summary");
    expect(status).not.toHaveAccessibleName();
    expect(status).not.toHaveAttribute("aria-busy");
    expect(status.parentElement).toBe(preview);
    const skeleton = status.nextElementSibling;
    expect(skeleton).not.toHaveAttribute("role");
    expect(skeleton).not.toHaveAttribute("aria-label");
    const placeholders = skeleton?.querySelectorAll('[data-slot="skeleton"]') ?? [];
    expect(placeholders).toHaveLength(8);
    for (const placeholder of placeholders) expect(placeholder).toHaveAttribute("aria-hidden", "true");
    expect(getComputedStyle(preview as HTMLElement).width).toBe("768px");
    expect([...container.children].map((child) => child.tagName)).toEqual(["STYLE", "DIV"]);
    unmount();

    render(<LocalizedAnnouncement />);
    expect(screen.getByRole("status").textContent).toBe("Se încarcă rezumatul");
    expect(screen.getByRole("status")).toHaveAttribute("lang", "ro");
  });

  it("keeps calendar demo presentation independent of DayPicker's production class map", () => {
    const {Default} = composeStories(calendarStories);
    const {container} = render(<Default />);
    const frame = container.querySelector(".ac-story-calendar-storyFrame");
    expect(frame).not.toBeNull();
    expect(ruleFor(mountedStyles(container), ".ac-story-calendar-storyDayCell").nodes).toEqual(
      expect.arrayContaining([expect.objectContaining({prop: "width", value: "var(--ac-size-default)"})]),
    );
    expect(container.querySelector('[data-slot="calendar"]')).not.toBeNull();
  });

  it("preserves the responsive carousel class and media ancestry", () => {
    const {MultipleItems} = composeStories(carouselStories);
    const {container} = render(<MultipleItems />);
    expect(container.querySelectorAll(".ac-story-carousel-storyMultipleItem")).toHaveLength(5);
    const stylesheet = mountedStyles(container);
    const rule = ruleFor(stylesheet, ".ac-story-carousel-storyMultipleItem");
    expect(rule.parent).toMatchObject({type: "atrule", name: "media", params: "(min-width: 40rem)"});
    expect(rule.nodes).toEqual(expect.arrayContaining([expect.objectContaining({prop: "flex-basis", value: "50%"})]));
  });

  it("preserves nested state selectors and separates story reduced motion from the production panel rule", async () => {
    const {Animated} = composeStories(collapsibleStories);
    const {container} = render(<Animated />);
    await userEvent.setup().click(screen.getByRole("button", {name: "Animated details"}));
    const trigger = screen.getByRole("button", {name: "Animated details"});
    expect(trigger).toHaveAttribute("data-panel-open");
    const icon = trigger.querySelector(".ac-story-collapsible-icon");
    expect(icon).not.toBeNull();
    const stylesheet = mountedStyles(container);
    expect(ruleFor(stylesheet, "&[data-panel-open] .ac-story-collapsible-icon").parent).toMatchObject({
      type: "rule",
      selector: ".ac-story-collapsible-demoTrigger",
    });
    expect(ruleFor(stylesheet, ".ac-story-collapsible-icon").parent).toMatchObject({
      type: "atrule",
      name: "media",
      params: "(prefers-reduced-motion: reduce)",
    });
    expect(stylesheet.toString()).not.toMatch(/\.panel\b/u);
  });

  it("preserves forced-colors overrides without moving production validation styles", () => {
    const {Default} = composeStories(formStories);
    const {container} = render(<Default />);
    expect(container.querySelector("form")).toHaveClass("ac-story-form-demoForm");
    const stylesheet = mountedStyles(container);
    const summary = ruleFor(stylesheet, ".ac-story-form-demoSummary");
    expect(summary.parent).toMatchObject({type: "atrule", name: "media", params: "(forced-colors: active)"});
    expect(summary.nodes).toEqual(expect.arrayContaining([expect.objectContaining({prop: "color", value: "CanvasText"})]));
    expect(stylesheet.toString()).not.toMatch(/\.(?:message|labelError)\b/u);
  });

  it("matches the real production popup ancestor when mounting a rich tooltip story", async () => {
    const {WithRichContent} = composeStories(tooltipStories);
    const {container} = render(<WithRichContent />);
    await userEvent.setup().hover(screen.getByRole("button", {name: "Hover for details"}));
    const title = await screen.findByText("Product Information");
    const content = title.parentElement;
    expect(content).toHaveClass("ac-story-tooltip-storyContent");
    expect(content?.closest(`.${tooltipStyles.popup}`)).not.toBeNull();
    expect(ruleFor(mountedStyles(container), ".ac-story-tooltip-storyContent").parent).toMatchObject({
      type: "rule",
      selector: `.${tooltipStyles.popup}`,
    });
  });

  it("keeps fixed currency demo presentation mounted in the owning story instead of inline React objects", () => {
    const {WithCurrency} = composeStories(numberFieldStories);
    const {container} = render(<WithCurrency />);
    const input = screen.getByRole("textbox", {name: "Budget Amount"});
    expect(input).toHaveClass("ac-story-number-field-currencyInput");
    expect(input).not.toHaveAttribute("style");
    expect(getComputedStyle(input).paddingLeft).toBe("28px");
    const stack = container.querySelector(".ac-story-number-field-currencyStack");
    expect(stack).not.toHaveAttribute("style");
    expect(getComputedStyle(stack as HTMLElement).flexDirection).toBe("column");
    expect(container.querySelector("style")?.textContent).toContain(".ac-story-number-field-currencyPrefix");
  });

  it("mounts the authored toolbar dropdown presentation without changing its interaction", async () => {
    const {WithDropdown} = composeStories(toolbarStories);
    const {container} = render(<WithDropdown />);
    await userEvent.setup().click(screen.getByRole("button", {name: "More options"}));
    const menu = screen.getByRole("button", {name: "Clear formatting"}).parentElement;
    expect(menu).toHaveClass("ac-story-toolbar-dropdownMenu");
    expect(menu).not.toHaveAttribute("style");
    expect(screen.getByRole("dialog")).toContainElement(menu);
    expect(screen.getByRole("button", {name: "More options"})).toHaveAttribute("aria-expanded", "true");
    await userEvent.setup().click(screen.getByRole("button", {name: "Clear formatting"}));
    expect(screen.queryByRole("button", {name: "Insert link"})).not.toBeInTheDocument();
    expect(container.querySelector("style")?.textContent).toContain(".ac-story-toolbar-dropdownOption");
  });

  it("keeps the meter's authored danger appearance while leaving only Base UI geometry inline", () => {
    const {DangerThreshold} = composeStories(meterStories);
    const {container} = render(<DangerThreshold />);
    const indicator = container.querySelector(`.${meterStyles.indicator}`);
    expect(indicator).toHaveClass("ac-story-meter-dangerIndicator");
    expect(ruleFor(mountedStyles(container), ".ac-story-meter-dangerIndicator").nodes).toEqual(
      expect.arrayContaining([expect.objectContaining({prop: "background", value: "var(--ac-destructive)"})]),
    );
    expect(indicator?.getAttribute("style")).not.toContain("background");
    expect(screen.getByText("⚠️ 85% - Approaching capacity")).not.toHaveAttribute("style");
  });

  it("mounts foundation swatch layout while retaining data-driven token colors", () => {
    const {Colors} = composeStories(foundationStories);
    const {container} = render(<Colors />);
    const swatch = container.querySelector(".ac-story-foundations-swatch");
    expect(swatch).not.toBeNull();
    expect(getComputedStyle(swatch as HTMLElement).width).toBe("48px");
    expect(swatch?.getAttribute("style")).toBe("background-color: var(--ac-background);");
    expect(container.querySelector("style")?.textContent).toContain(".ac-story-foundations-colorGrid");
  });

  it("renders the French Stepper story and its caller-owned completion announcements on client and server", () => {
    const {FrenchProgress} = composeStories(stepperStories);
    const {container} = render(<FrenchProgress />);
    const list = screen.getByRole("list", {name: "Progression de la configuration"});
    const items = within(list).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Démarrer Terminé");
    expect(items[1]).toHaveTextContent("Configurer Terminé");
    expect(items[2]).toHaveTextContent("Vérifier");
    expect(items[2]).toHaveAttribute("aria-current", "step");
    expect(list).not.toHaveTextContent("Completed");
    expect(container.querySelector("style")?.textContent).toContain(".ac-story-stepper-storyStack");
    const html = renderToStaticMarkup(<FrenchProgress />);
    expect(html).toContain('aria-label="Progression de la configuration"');
    expect(html).toContain("Terminé");
    expect(html).not.toContain("Completed");
  });

  it.each([
    {family: "foundations", Story: composeStories(foundationStories).Spacing, className: "spacingList"},
    {family: "foundations", Story: composeStories(foundationStories).BorderRadius, className: "radiusList"},
    {family: "component-sizes", Story: composeStories(componentSizeStories).Sizes, className: "list"},
    {family: "motion", Story: composeStories(motionStories).Transitions, className: "list"},
    {family: "typography", Story: composeStories(typographyStories).TextSizes, className: "sizes"},
    {family: "typography", Story: composeStories(typographyStories).FontWeights, className: "weights"},
  ])("mounts and cleans up the $family $className foundation layout without fixed inline styling", ({family, Story, className}) => {
    const {container, unmount} = render(<Story />);
    const layout = container.querySelector(`.ac-story-${family}-${className}`);
    expect(layout).not.toBeNull();
    expect(layout).not.toHaveAttribute("style");
    expect(getComputedStyle(layout as HTMLElement).display).toBe("flex");
    expect(container.querySelector("style")?.textContent).toContain(`.ac-story-${family}-${className}`);
    const sheet = container.querySelector("style");
    unmount();
    expect(sheet?.isConnected).toBe(false);
  });

  it("preserves the foundation motion preview's data-driven dimensions through real interaction", async () => {
    const {Transitions} = composeStories(motionStories);
    const {container} = render(<Transitions />);
    const previews = [...container.querySelectorAll<HTMLElement>(".ac-story-motion-preview")];
    expect(previews).toHaveLength(3);
    for (const preview of previews) expect(getComputedStyle(preview).width).toBe("48px");
    await userEvent.setup().click(screen.getByRole("button", {name: "Toggle Animation"}));
    for (const preview of previews) {
      expect(getComputedStyle(preview).width).toBe("200px");
      expect(preview.style.height).toBe("");
      expect(getComputedStyle(preview).height).toBe("48px");
    }
  });
});
