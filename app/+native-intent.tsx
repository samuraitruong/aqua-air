import { safeSystemPath } from "../src/domain/system-path";
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  return safeSystemPath(path);
}
