/**
 * INR formatter with optional compact (lakh/crore) grouping. Ported from the
 * Paisa design's tokens.jsx — keep this byte-equivalent so screens that match
 * the design exactly render the right strings.
 */
export function formatINR(
  n: number,
  opts: { compact?: boolean } = {},
): string {
  const { compact = false } = opts;
  const abs = Math.abs(n);
  if (compact) {
    if (abs >= 10000000) {
      return '₹' + (n / 10000000).toFixed(1).replace(/\.0$/, '') + 'Cr';
    }
    if (abs >= 100000) {
      return '₹' + (n / 100000).toFixed(1).replace(/\.0$/, '') + 'L';
    }
    if (abs >= 1000) {
      return '₹' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
  }
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
