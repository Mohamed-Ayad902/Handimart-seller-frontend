import { normalizeDigits, normalizePhone } from "./phone";

/**
 * Client-side checks, ported rule for rule from Core (`EdeinaValidator.kt`) with Core's own
 * Arabic messages (`core/composeResources/values/strings.xml`). They only spare the seller a
 * round trip: the backend validates every request again and has the final word.
 * Each returns null when the value is fine, or the message to show under the field.
 */
export type Check = (value: string) => string | null;

const PHONE = /^01[0125][0-9]{8}$/;
const PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const MSG = {
  required: "الحقل ده مطلوب",
  phone: "رقم الموبايل غير صحيح. تأكد إنه 11 رقم وبيبدأ بـ 01",
  weakPassword: "كلمة المرور ضعيفة. لازم تكون 8 حروف على الأقل، وفيها حرف كبير وصغير، رقم، ورمز",
  otp: "كود التحقق غير صحيح، تأكد إنه 6 أرقام",
  mismatch: "كلمتين السر مش زي بعض",
  tooShort: (n: number) => `الحد الأدنى ${n} أحرف`,
  tooLong: (n: number) => `الحد الأقصى ${n} حرف`,
  tooSmall: (n: number) => `لازم القيمة متقلش عن ${n}`,
  tooLarge: (n: number) => `لازم القيمة متزيدش عن ${n}`,
  notNumber: "اكتب رقم صحيح",
} as const;

export const required: Check = (v) => (v.trim() ? null : MSG.required);

export const phone: Check = (v) => (!v.trim() ? MSG.required : PHONE.test(normalizePhone(v)) ? null : MSG.phone);

export const strongPassword: Check = (v) => (!v ? MSG.required : PASSWORD.test(v) ? null : MSG.weakPassword);

export const otp: Check = (v) => {
  const code = normalizeDigits(v).trim();
  return !code ? MSG.required : /^[0-9]{6}$/.test(code) ? null : MSG.otp;
};

/** Core `validateText(minLength, maxLength)`, measured on the trimmed text. */
export function text({ min = 1, max = 2000 }: { min?: number; max?: number } = {}): Check {
  return (v) => {
    const t = v.trim();
    if (!t) return MSG.required;
    if (t.length < min) return MSG.tooShort(min);
    if (t.length > max) return MSG.tooLong(max);
    return null;
  };
}

/** Reads a number typed with Arabic or Latin digits ("١٢٫٥" or "12.5"); null when it isn't one. */
export function parseNumber(v: string): number | null {
  const t = normalizeDigits(v).replace(/[٫,]/g, ".").trim();
  if (!t || !/^\d+(\.\d+)?$/.test(t)) return null;
  return Number(t);
}

/**
 * Core `validatePrice` / `validateDimension` (decimals, from 0.01), `validateStock` (whole, from 0)
 * and `validateQuantity` (whole, from 1).
 */
export function numberCheck({ min, max = Number.MAX_SAFE_INTEGER, whole = false, optional = false }: { min: number; max?: number; whole?: boolean; optional?: boolean }): Check {
  return (v) => {
    if (!v.trim()) return optional ? null : MSG.required;
    const n = parseNumber(v);
    if (n === null || (whole && !Number.isInteger(n))) return MSG.notNumber;
    if (n < min) return MSG.tooSmall(min);
    if (n > max) return MSG.tooLarge(max);
    return null;
  };
}

/** Core `URL_REGEX` / `validateOptionalUrl`: scheme optional, so "facebook.com/mystore" passes. */
const URL = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w\- ./?%&=]*)?$/;
export const optionalUrl: Check = (v) => (!v.trim() || URL.test(v.trim()) ? null : "الرابط غير صحيح");
