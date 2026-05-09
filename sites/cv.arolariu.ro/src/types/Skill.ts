export type SkillTileSize = "hero" | "lg" | "md" | "sm";
export type SkillAccent = "primary" | "secondary" | "success";

export type Skill = Readonly<{
  name: string;
  size: SkillTileSize;
  label?: string;
  caption?: string;
  accent?: SkillAccent;
}>;
