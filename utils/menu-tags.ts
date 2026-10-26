export const CUSTOM_TAG_ICONS = ["🎉", "🥳", "🤩", "🤯", "😶‍🌫️", "🥶"] as const;

export type CustomTagIcon = (typeof CUSTOM_TAG_ICONS)[number];

export function getRandomCustomTagIcon(): CustomTagIcon {
  return CUSTOM_TAG_ICONS[
    Math.floor(Math.random() * CUSTOM_TAG_ICONS.length)
  ];
}

export function getCustomTagIcon(tag: string): CustomTagIcon | undefined {
  const trimmedTag = tag.trim();
  return CUSTOM_TAG_ICONS.find((icon) => trimmedTag.startsWith(icon));
}

export function stripCustomTagIcon(tag: string): string {
  const trimmedTag = tag.trim();
  const icon = getCustomTagIcon(trimmedTag);
  return icon ? trimmedTag.slice(icon.length).trim() : trimmedTag;
}

export function formatCustomTag(tag: string, fallbackIcon: CustomTagIcon) {
  const text = stripCustomTagIcon(tag).toUpperCase();
  return text ? `${getCustomTagIcon(tag) ?? fallbackIcon} ${text}` : "";
}

export function saveCustomTag(tag: string, icon: CustomTagIcon): string {
  return `${icon} ${stripCustomTagIcon(tag)}`;
}
