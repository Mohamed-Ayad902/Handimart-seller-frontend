"use client";

import { useCallback, useMemo, useState } from "react";
import type { Check } from "@/lib/validation";

/**
 * Small form state for this site's forms: values, which fields were touched, and errors from
 * the field checks (shown once a field is left, and for every field on submit). Server-side
 * field errors (`ApiError.fields`) can be merged in with `setServerErrors`.
 */
export function useForm<K extends string>(initial: Record<K, string>, checks: Partial<Record<K, Check | ((v: string, all: Record<K, string>) => string | null)>>) {
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({});
  const [server, setServer] = useState<Partial<Record<K, string>>>({});

  const problems = useMemo(() => {
    const out: Partial<Record<K, string>> = {};
    for (const key of Object.keys(checks) as K[]) {
      const check = checks[key];
      const problem = check ? check(values[key], values) : null;
      if (problem) out[key] = problem;
    }
    return out;
  }, [checks, values]);

  const set = useCallback((key: K, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setServer((s) => (s[key] ? { ...s, [key]: undefined } : s));
  }, []);

  const error = (key: K) => (touched[key] ? problems[key] : undefined) ?? server[key] ?? null;

  /** Marks every field touched and says whether the form may be sent. */
  const validate = () => {
    setTouched(Object.fromEntries(Object.keys(values).map((k) => [k, true])) as Record<K, boolean>);
    return Object.keys(problems).length === 0;
  };

  const field = (key: K) => ({
    value: values[key],
    onChange: (e: { target: { value: string } }) => set(key, e.target.value),
    onBlur: () => setTouched((t) => ({ ...t, [key]: true })),
    error: error(key),
  });

  const setServerErrors = (fields: Record<string, string>) => {
    const known = Object.fromEntries(Object.entries(fields).filter(([k]) => k in values)) as Partial<Record<K, string>>;
    setServer(known);
    return Object.keys(known).length > 0;
  };

  return { values, set, field, error, validate, setServerErrors };
}
