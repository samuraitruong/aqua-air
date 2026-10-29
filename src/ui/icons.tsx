/** Original Aqua Air SVG family from Design/index.html. */
import React from "react";
import { Feather } from "@expo/vector-icons";
import { SvgXml } from "react-native-svg";
import paths from "./icon-paths.json";
import { getDirection } from "../i18n";
import { c } from "./theme";
export type IconName = React.ComponentProps<typeof Feather>["name"];
const aliases: Partial<Record<IconName, keyof typeof paths>> = {
  droplet: "drop",
  grid: "tank",
  home: "home",
  calendar: "calendar",
  settings: "settings",
  "chevron-left": "back",
  "chevron-right": "chev",
  plus: "plus",
  bell: "bell",
  clock: "clock",
  check: "check",
  "check-circle": "check",
  archive: "folder",
  folder: "folder",
  "file-text": "note",
  image: "image",
  filter: "filter",
  feather: "leaf",
  "more-horizontal": "dots",
  info: "info",
  "trash-2": "trash",
};
export function Icon({
  name = "droplet",
  size = 22,
  color = c.primary,
}: {
  name?: IconName;
  size?: number;
  color?: string;
}) {
  const key = aliases[name];
  const style =
    getDirection() === "rtl" &&
    ["chevron-left", "chevron-right", "arrow-left", "arrow-right"].includes(
      name,
    )
      ? { transform: [{ scaleX: -1 }] }
      : undefined;
  if (!key)
    return (
      <Feather
        name={name}
        size={size}
        color={color}
        style={style}
        accessible={false}
      />
    );
  return (
    <SvgXml
      style={style}
      width={size}
      height={size}
      color={color}
      accessible={false}
      xml={`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[key]}</svg>`}
    />
  );
}
export const activityIcon = (type: string): IconName =>
  type === "water_change"
    ? "droplet"
    : type === "filter_clean"
      ? "filter"
      : type === "plant_care"
        ? "feather"
        : "file-text";
