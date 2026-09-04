import { useColorScheme } from "nativewind";

export const useAppTheme = () => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return {
    isDark,
    bg: isDark ? "hsl(150, 31%, 9%)" : "hsl(138, 47%, 97%)",
    card: isDark ? "hsl(149, 27%, 12%)" : "hsl(0, 0%, 100%)",
    text: isDark ? "hsl(136, 42%, 92%)" : "hsl(146, 52%, 15%)",
    muted: isDark ? "hsl(140, 17%, 68%)" : "hsl(146, 26%, 40%)",
    primary: isDark ? "hsl(142, 70%, 54%)" : "hsl(147, 75%, 33%)",
    border: isDark ? "hsla(149, 16%, 24%, 0.8)" : "hsla(141, 47%, 83%, 0.8)",
    danger: isDark ? "hsl(7, 85%, 76%)" : "hsl(6, 74%, 54%)",
  };
};
