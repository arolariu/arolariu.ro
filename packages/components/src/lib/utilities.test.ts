import {describe, expect, it} from "vitest";
import {cn} from "./utilities";

describe("cn utility", () => {
  it("should merge class names", () => {
    expect(cn("class1", "class2")).toBe("class1 class2");
  });

  it("should handle conditional classes", () => {
    expect(cn("class1", true && "class2", false && "class3")).toBe("class1 class2");
  });

  it("should handle null and undefined", () => {
    expect(cn("class1", null, undefined)).toBe("class1");
  });

  it("should merge tailwind classes correctly", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("should handle arrays of classes", () => {
    expect(cn(["class1", "class2"])).toBe("class1 class2");
  });

  it("should handle objects of classes", () => {
    expect(cn({class1: true, class2: false, class3: true})).toBe("class1 class3");
  });

  it("should handle complex nested structures", () => {
    expect(cn("base", ["nested1", {nested2: true}], {obj1: false, obj2: true})).toBe("base nested1 nested2 obj2");
  });

  it("should handle empty input", () => {
    expect(cn()).toBe("");
  });
});
