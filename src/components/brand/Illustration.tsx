/**
 * The app's eight line illustrations (Core HandiIllustration), drawn as thread on a sand pebble
 * with the brand needle. Ported path-for-path so empty and error states look the same on web.
 * Decorative only.
 */
type Kind = "main" | "detail" | "seam" | "accent";
type Line = [d: string, kind: Kind];

const ILLUSTRATIONS = {
  emptyBasket: {
    needle: [180, 48, -60],
    lines: [
      ["M52 78 L148 78 L136 128 C135 132 132 134 128 134 L72 134 C68 134 65 132 64 128 Z", "main"],
      ["M70 78 C70 50 130 50 130 78", "main"],
      ["M60 96 L140 96 M64 114 L136 114", "seam"],
      ["M148 78 C160 70 170 74 166 60 C163 50 176 44 182 50", "detail"],
    ],
  },
  tangledThread: {
    needle: [160, 108, -42],
    lines: [
      [
        "M30 118 C56 120 62 100 78 92 C98 82 92 58 110 58 C130 58 128 84 108 88 C88 92 84 70 100 66 C118 62 140 76 132 98 C124 120 96 116 94 100 C92 86 118 84 124 104 C128 118 146 120 160 108",
        "main",
      ],
    ],
  },
  cutThread: {
    needle: [168, 80, -55],
    lines: [
      ["M24 100 C48 70 70 118 92 92", "main"],
      ["M112 84 C132 60 150 110 168 80", "main"],
      ["M96 76 L106 62 M100 96 L112 102 M92 104 L90 116", "accent"],
    ],
  },
  threadSearch: {
    needle: [140, 132, -35],
    lines: [
      ["M122 84 A30 30 0 1 1 62 84 A30 30 0 1 1 122 84 Z", "main"],
      ["M114 106 L140 132", "main"],
      ["M70 70 C80 60 96 58 106 66", "seam"],
    ],
  },
  emptySpool: {
    needle: [170, 100, -20],
    lines: [
      ["M64 46 L136 46 C142 46 146 50 146 54 C146 58 142 62 136 62 L64 62 C58 62 54 58 54 54 C54 50 58 46 64 46 Z", "main"],
      ["M64 112 L136 112 C142 112 146 116 146 120 C146 124 142 128 136 128 L64 128 C58 128 54 124 54 120 C54 116 58 112 64 112 Z", "main"],
      ["M74 62 L74 112 M126 62 L126 112", "main"],
      ["M78 100 C92 104 108 104 122 100", "seam"],
      ["M126 104 C146 108 158 96 170 100", "detail"],
    ],
  },
} satisfies Record<string, { needle: [number, number, number]; lines: Line[] }>;

export type IllustrationName = keyof typeof ILLUSTRATIONS;

const PEBBLE = "M38 112 C22 86 40 44 82 38 C122 32 170 44 172 86 C174 124 140 138 100 138 C66 138 50 132 38 112 Z";
const NEEDLE = "M0 0 C0 -2.6 2.6 -3.6 6 -3.6 L30 0 L6 3.6 C2.6 3.6 0 2.6 0 0 Z";

const STROKE: Record<Kind, { color: string; width: number; dash?: string }> = {
  main: { color: "var(--hm-ink)", width: 6 },
  detail: { color: "var(--hm-ink)", width: 3.5 },
  seam: { color: "var(--hm-ink)", width: 3.5, dash: "7 6" },
  accent: { color: "var(--hm-primary)", width: 3.5 },
};

export function Illustration({ name, className = "w-44" }: { name: IllustrationName; className?: string }) {
  const art = ILLUSTRATIONS[name];
  const [x, y, deg] = art.needle;
  return (
    <svg viewBox="0 0 200 160" className={className} aria-hidden="true" focusable="false">
      <path d={PEBBLE} fill="var(--hm-pebble)" />
      {art.lines.map(([d, kind], i) => {
        const s = STROKE[kind];
        return (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={s.color}
            strokeWidth={s.width}
            strokeDasharray={s.dash}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
      <g transform={`translate(${x} ${y}) rotate(${deg})`}>
        <path d={NEEDLE} fill="var(--hm-primary)" />
        <ellipse cx="6" cy="0" rx="3" ry="1.1" fill="var(--hm-paper)" />
      </g>
    </svg>
  );
}
