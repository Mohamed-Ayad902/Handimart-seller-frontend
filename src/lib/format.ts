/**
 * Number, money and time wording, in the app's Egyptian Arabic. Prices use Latin digits with
 * thousands separators followed by "ج.م", exactly like the app's `formatAsEgyptianCurrency`.
 */

const priceFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export function formatPrice(value: number): string {
  return `${priceFormat.format(value)} ج.م`;
}

export function discountPercent(current: number, original: number): number {
  return Math.round((1 - current / original) * 100);
}

export function formatRating(value: number): string {
  return value.toFixed(1);
}

/** Arabic count agreement: 1 / 2 (dual) / 3-10 (plural) / 11+ (singular). */
function counted(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}

export function formatDays(days: number): string {
  return counted(days, "يوم", "يومين", "أيام", "يوم");
}

/** Making time, rounded up to whole days once it passes a day ("٣ أيام", "يومين", "٥ ساعات"). */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return "أقل من ساعة";
  if (minutes < 24 * 60) {
    const hours = Math.ceil(minutes / 60);
    return counted(hours, "ساعة", "ساعتين", "ساعات", "ساعة");
  }
  if (minutes < 7 * 24 * 60 || minutes % (7 * 24 * 60) !== 0) return formatDays(Math.ceil(minutes / (24 * 60)));
  const weeks = minutes / (7 * 24 * 60);
  return counted(weeks, "أسبوع", "أسبوعين", "أسابيع", "أسبوع");
}

export function formatPieces(n: number): string {
  return counted(n, "قطعة واحدة", "قطعتين", "قطع", "قطعة");
}

export function formatReviewCount(n: number): string {
  return counted(n, "تقييم واحد", "تقييمين", "تقييمات", "تقييم");
}

const dateFormat = new Intl.DateTimeFormat("ar-EG", { year: "numeric", month: "long", day: "numeric" });

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/** Plain-text excerpt for meta descriptions: single line, cut at a word boundary. */
export function excerpt(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 80 ? cut.lastIndexOf(" ") : max)}…`;
}

const relative = new Intl.RelativeTimeFormat("ar-EG", { numeric: "auto" });
const shortDate = new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short" });
const time = new Intl.DateTimeFormat("ar-EG", { hour: "numeric", minute: "2-digit" });

/** "من ساعتين", "امبارح", then a short date once it's more than a week old. */
export function formatAgo(iso: string, now = Date.now()): string {
  const diff = (new Date(iso).getTime() - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "دلوقتي";
  if (abs < 3600) return relative.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return relative.format(Math.round(diff / 3600), "hour");
  if (abs < 7 * 86400) return relative.format(Math.round(diff / 86400), "day");
  return shortDate.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}، ${time.format(new Date(iso))}`;
}

const count = new Intl.NumberFormat("en-US");
export function formatCount(n: number): string {
  return count.format(n);
}
