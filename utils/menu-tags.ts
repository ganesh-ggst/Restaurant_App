export const CUSTOM_TAG_ICONS = ["🎉", "🥳", "🤩", "🤯", "😶‍🌫️", "🥶"] as const;

export type CustomTagIcon = string;
export const DEFAULT_CUSTOM_TAG_ICON: CustomTagIcon = "✨";

const RANDOM_CUSTOM_TAG_ICON_SET: ReadonlySet<string> = new Set(
  CUSTOM_TAG_ICONS,
);
const CUSTOM_TAG_EMOJI_PATTERN =
  /(?:[#*0-9]\uFE0F?\u20E3|\p{Regional_Indicator}{2}|\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?\p{Emoji_Modifier}?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\uFE0E)?\p{Emoji_Modifier}?)*)/gu;

export function getRandomCustomTagIcon(): CustomTagIcon {
  return CUSTOM_TAG_ICONS[
    Math.floor(Math.random() * CUSTOM_TAG_ICONS.length)
  ];
}

export function getCustomTagIcon(tag: string): CustomTagIcon | undefined {
  const emojis = tag.match(CUSTOM_TAG_EMOJI_PATTERN);
  return (
    emojis?.find((emoji) => !RANDOM_CUSTOM_TAG_ICON_SET.has(emoji)) ??
    emojis?.[0]
  );
}

export function stripCustomTagIcon(tag: string): string {
  return tag.replace(CUSTOM_TAG_EMOJI_PATTERN, "").replace(/\s+/g, " ").trim();
}

export function formatCustomTag(tag: string, fallbackIcon: CustomTagIcon) {
  const text = stripCustomTagIcon(tag).toUpperCase();
  const icon = getCustomTagIcon(tag) ?? fallbackIcon;
  return text ? `${icon} ${text}` : "";
}

export function saveCustomTag(tag: string, icon: CustomTagIcon): string {
  return `${getCustomTagIcon(tag) ?? icon} ${stripCustomTagIcon(tag)}`;
}
