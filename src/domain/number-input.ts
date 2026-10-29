/** Accept localized keyboard digits without changing the numbers stored in SQLite. */
export function parseNumberInput(input: string): number {
  let value = input
    .normalize("NFKC")
    .trim()
    .replace(/[٠-٩۰-۹०-९০-৯]/g, (digit) => {
      const code = digit.charCodeAt(0);
      const start =
        code >= 0x09e6
          ? 0x09e6
          : code >= 0x0966
            ? 0x0966
            : code >= 0x06f0
              ? 0x06f0
              : 0x0660;
      return String(code - start);
    });
  if (value.includes("٬")) {
    if (!/^[+-]?\d{1,3}(?:٬\d{3})+(?:[٫.,]\d+)?$/.test(value)) return NaN;
    value = value.replace(/٬/g, "");
  }
  return Number(value.replace("٫", ".").replace(",", "."));
}
