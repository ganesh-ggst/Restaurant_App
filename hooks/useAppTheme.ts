import { useColorScheme } from "nativewind";

export function useAppTheme() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return {
    isDark,
    bg: isDark ? "hsl(150, 31%, 9%)" : "hsl(138, 47%, 97%)",
    card: isDark ? "hsl(149, 27%, 12%)" : "hsl(0, 0%, 100%)",
    text: isDark ? "hsl(136, 42%, 92%)" : "hsl(146, 52%, 15%)",
    muted: isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)",
    primary: isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)",
    primaryForeground: isDark ? "hsl(150, 35%, 100%)" : "hsl(0, 0%, 100%)",
    secondaryBg: isDark ? "hsl(149, 24%, 19%)" : "hsl(143, 61%, 91%)",
    secondaryText: isDark ? "hsl(138, 30%, 83%)" : "hsl(146, 55%, 24%)",
    border: isDark ? "hsl(149, 16%, 24%)" : "hsl(141, 47%, 83%)",
    danger: isDark ? "hsl(7, 85%, 76%)" : "hsl(6, 74%, 54%)",
    dangerBg: isDark ? "hsl(8, 55%, 16%)" : "hsl(8, 100%, 97%)",
    dangerText: isDark ? "hsl(7, 85%, 76%)" : "hsl(6, 71%, 48%)",
  };
}
