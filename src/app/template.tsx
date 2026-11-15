/** Re-mounted on every navigation, so each page eases in instead of snapping (see .page-enter). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
