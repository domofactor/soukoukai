const wholeNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatYen(value: number) {
  // Currency symbols differ between server/browser ICU builds; keep the symbol explicit.
  return `¥${wholeNumber.format(value)}`;
}
