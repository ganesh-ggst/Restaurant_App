export type AuthScreenKind = "splash" | "login";

export interface AuthScreenVideo {
  id: string;
  uri: string;
  fileName: string;
  mediaType: "image" | "video";
  durationMs: number | null;
  isActive: boolean;
}

export type AuthScreenMediaState = Record<AuthScreenKind, AuthScreenVideo[]>;

const initialState: AuthScreenMediaState = {
  splash: [],
  login: [],
};

let state = initialState;
const listeners = new Set<() => void>();

export function getAuthScreenMediaState(): AuthScreenMediaState {
  return state;
}

export function subscribeToAuthScreenMedia(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updateAuthScreenVideos(
  screen: AuthScreenKind,
  videos: AuthScreenVideo[],
): void {
  state = { ...state, [screen]: videos };
  listeners.forEach((listener) => listener());
}

export function activateAuthScreenVideo(
  screen: AuthScreenKind,
  videoId: string,
): void {
  updateAuthScreenVideos(
    screen,
    state[screen].map((video) => ({
      ...video,
      isActive: video.id === videoId,
    })),
  );
}

export function createAuthScreenMediaSection(
  screen: AuthScreenKind,
  videos: AuthScreenVideo[],
) {
  const activeVideo = videos.find((video) => video.isActive);
  const title = screen === "splash" ? "Splash Screen" : "Login Screen";

  return {
    id: screen === "splash" ? "sf_splash" : "sf_login",
    title,
    selectionType: "single" as const,
    isSectionActive: true,
    options: videos.map((video) => ({
      id: video.id,
      value: video.fileName,
      subValue: video.uri,
      isActive: video.isActive,
    })),
    summary: activeVideo?.fileName ?? "No video added",
  };
}

export function getScreenMediaFileName(url: string): string {
  const fileName = url.split("/").pop()?.split(/[?#]/, 1)[0] ?? "";
  try {
    return decodeURIComponent(fileName) || url;
  } catch {
    return fileName || url;
  }
}

export function getScreenMediaType(
  screen: AuthScreenKind,
  url: string,
): "image" | "video" {
  if (screen === "splash") return "video";
  return /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i.test(url) ? "video" : "image";
}
