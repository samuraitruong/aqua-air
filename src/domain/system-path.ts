/** Bound external native-link input before Expo Router's legacy query decoder runs. */
export function safeSystemPath(path: string): string {
  if (path.length > 4096) return "/";
  try {
    decodeURIComponent(path);
    return path;
  } catch {
    return "/";
  }
}
