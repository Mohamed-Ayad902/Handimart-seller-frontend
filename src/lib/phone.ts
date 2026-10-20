const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const EASTERN = "۰۱۲۳۴۵۶۷۸۹";

/** Digits typed on an Arabic keyboard become Latin digits; spaces, dashes and a +20 prefix are dropped. */
export function normalizeDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(EASTERN.indexOf(d)));
}

export function normalizePhone(input: string): string {
  let value = normalizeDigits(input).replace(/[\s\-().]/g, "");
  if (value.startsWith("+20")) value = `0${value.slice(3)}`;
  else if (value.startsWith("0020")) value = `0${value.slice(4)}`;
  else if (/^20(10|11|12|15)\d{8}$/.test(value)) value = `0${value.slice(2)}`;
  return value;
}

export const PHONE_PATTERN = /^01[0125][0-9]{8}$/;

export function phoneProblem(input: string): string | null {
  if (!input.trim()) return "اكتب رقم موبايلك";
  return PHONE_PATTERN.test(normalizePhone(input)) ? null : "رقم الموبايل لازم يبدأ بـ 01 ويتكوّن من 11 رقم";
}
