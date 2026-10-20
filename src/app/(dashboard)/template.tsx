/** Created again on every navigation, which replays the page entrance (reduced motion: none). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
