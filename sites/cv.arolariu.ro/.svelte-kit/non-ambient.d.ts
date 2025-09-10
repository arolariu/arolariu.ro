// this file is generated — do not edit it

declare module "svelte/elements" {
  export interface HTMLAttributes<T> {
    "data-sveltekit-keepfocus"?: true | "" | "off" | undefined | null;
    "data-sveltekit-noscroll"?: true | "" | "off" | undefined | null;
    "data-sveltekit-preload-code"?: true | "" | "eager" | "viewport" | "hover" | "tap" | "off" | undefined | null;
    "data-sveltekit-preload-data"?: true | "" | "hover" | "tap" | "off" | undefined | null;
    "data-sveltekit-reload"?: true | "" | "off" | undefined | null;
    "data-sveltekit-replacestate"?: true | "" | "off" | undefined | null;
  }
}

export {};

declare module "$app/types" {
  export interface AppTypes {
    RouteId(): "/" | "/human" | "/json" | "/pdf" | "/rest" | "/rest/json";
    RouteParams(): {};
    LayoutParams(): {
      "/": Record<string, never>;
      "/human": Record<string, never>;
      "/json": Record<string, never>;
      "/pdf": Record<string, never>;
      "/rest": Record<string, never>;
      "/rest/json": Record<string, never>;
    };
    Pathname(): "/" | "/human" | "/human/" | "/json" | "/json/" | "/pdf" | "/pdf/" | "/rest" | "/rest/" | "/rest/json" | "/rest/json/";
    ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes["Pathname"]>}`;
    Asset(): "/author.jpeg" | "/cv.pdf" | "/robots.txt" | (string & {});
  }
}
