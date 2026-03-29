type CommunityRef = { id: string };

type Props = {
  /** Passed by parents for API consistency; reserved for future sidebar use */
  communities?: CommunityRef[];
  /** When set, highlights the active community link (reserved) */
  activeCommunityId?: string;
  activeSection?: string;
  onSectionSelect?: (section: string) => void;
};

export const SECTION_OPTIONS = [
  { label: "Admissions", icon: "📝" },
  { label: "First Year/Transition", icon: "🚀" },
  { label: "Academics/Modules", icon: "📚" },
  { label: "Accommodation/Cost of Living", icon: "🏠" },
  { label: "Student Services", icon: "💬" },
  { label: "Campus Life", icon: "🌿" },
  { label: "Other", icon: "✨" },
] as const;

export function CommunitiesSidebar({
  activeSection,
  onSectionSelect,
}: Readonly<Props>) {
  return (
    <aside className="feed-page__left-sidebar">
      <div className="feed-page__sidebar-card">
        <h3>Sections</h3>
        <ul className="feed-page__community-list">
          {SECTION_OPTIONS.map((s, idx) => (
            <li key={`${s.label}-${idx}`}>
              <button
                type="button"
                className={[
                  "feed-page__community-link",
                  activeSection === s.label ? "feed-page__community-link--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => onSectionSelect?.(s.label)}
              >
                <span className="feed-page__community-icon">{s.icon}</span>
                <span className="feed-page__community-name">{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
