import {describe, expect, it, vi} from "vitest";

import {defineEmailTemplate} from "./defineEmailTemplate";
import * as i18n from "./i18n";
import {selectorFromPath} from "./i18n";

const FIXTURE_MESSAGES = {
  emails: {
    welcome: {
      subject: "Welcome, {name}!",
      greeting: "Hi {name}",
    },
    plain: {
      subject: "Plain subject",
    },
  },
};

describe("defineEmailTemplate", () => {
  it("attaches .namespace to the returned template", () => {
    const T = defineEmailTemplate<{}>({
      namespace: "emails.welcome",
      render: () => ({type: "div", props: {}}) as never,
    });
    expect(T.namespace).toBe("emails.welcome");
  });

  it("defaults locale to 'en' when omitted", async () => {
    vi.spyOn(i18n, "loadMessages").mockResolvedValueOnce(FIXTURE_MESSAGES);
    const seen: {locale?: string} = {};
    const T = defineEmailTemplate<{}>({
      namespace: "emails.welcome",
      render: (ctx) => {
        seen.locale = ctx.locale;
        return {type: "div", props: {}} as never;
      },
    });
    await T({});
    expect(seen.locale).toBe("en");
  });

  it("uses the provided locale when given", async () => {
    vi.spyOn(i18n, "loadMessages").mockResolvedValueOnce(FIXTURE_MESSAGES);
    const seen: {locale?: string} = {};
    const T = defineEmailTemplate<{}>({
      namespace: "emails.welcome",
      render: (ctx) => {
        seen.locale = ctx.locale;
        return {type: "div", props: {}} as never;
      },
    });
    await T({locale: "ro"});
    expect(seen.locale).toBe("ro");
  });

  it("passes user props through to the render context unchanged", async () => {
    vi.spyOn(i18n, "loadMessages").mockResolvedValueOnce(FIXTURE_MESSAGES);
    const seen: {props?: unknown} = {};
    type P = {readonly username: string};
    const T = defineEmailTemplate<P>({
      namespace: "emails.welcome",
      render: (ctx) => {
        seen.props = ctx.props;
        return {type: "div", props: {}} as never;
      },
    });
    await T({username: "Alex"});
    expect(seen.props).toEqual({username: "Alex"});
  });

  it("provides a translator scoped to the configured namespace", async () => {
    vi.spyOn(i18n, "loadMessages").mockResolvedValueOnce(FIXTURE_MESSAGES);
    const seen: {greeting?: string} = {};
    const T = defineEmailTemplate<{readonly name: string}>({
      namespace: "emails.welcome",
      render: ({t, props}) => {
        seen.greeting = t(selectorFromPath("emails.welcome.greeting"), {name: props.name});
        return {type: "div", props: {}} as never;
      },
    });
    await T({name: "Alex"});
    expect(seen.greeting).toBe("Hi Alex");
  });

  it("returns the render output as-is", async () => {
    vi.spyOn(i18n, "loadMessages").mockResolvedValueOnce(FIXTURE_MESSAGES);
    const expected = {type: "div", props: {"data-marker": "ok"}};
    const T = defineEmailTemplate<{}>({
      namespace: "emails.welcome",
      render: () => expected as never,
    });
    const out = await T({});
    expect(out).toBe(expected);
  });

  it(".getSubject() defaults locale to 'en'", async () => {
    vi.spyOn(i18n, "loadMessages").mockResolvedValueOnce(FIXTURE_MESSAGES);
    const T = defineEmailTemplate<{}>({
      namespace: "emails.plain",
      render: () => ({type: "div", props: {}}) as never,
    });
    const subject = await T.getSubject();
    expect(subject).toBe("Plain subject");
  });

  it(".getSubject() interpolates ICU vars", async () => {
    vi.spyOn(i18n, "loadMessages").mockResolvedValueOnce(FIXTURE_MESSAGES);
    const T = defineEmailTemplate<{}>({
      namespace: "emails.welcome",
      render: () => ({type: "div", props: {}}) as never,
    });
    const subject = await T.getSubject("en", {name: "Alex"});
    expect(subject).toBe("Welcome, Alex!");
  });
});
