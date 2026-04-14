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

type SectionTopicListProps = {
  activeSection: string;
  onSectionSelect: (label: string) => void;
  /** Prefix for React keys when the same list is mounted twice (e.g. desktop + mobile) */
  instanceKey?: string;
};

export function SectionTopicList({
  activeSection,
  onSectionSelect,
  instanceKey = "sections",
}: Readonly<SectionTopicListProps>) {
  return (
    <ul className="feed-page__community-list feed-page__sections-list">
      {SECTION_OPTIONS.map((s, idx) => (
        <li key={`${instanceKey}-${s.label}-${idx}`}>
          <button
            type="button"
            className={[
              "feed-page__community-link",
              activeSection === s.label ? "feed-page__community-link--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => onSectionSelect(s.label)}
          >
            <span className="feed-page__community-icon-wrap" aria-hidden>
              <span className="feed-page__community-icon">{s.icon}</span>
            </span>
            <span className="feed-page__community-name">{s.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function CommunitiesSidebar({
  activeSection,
  onSectionSelect,
}: Readonly<Props>) {
  return (
    <aside className="feed-page__left-sidebar">
      <div className="feed-page__sidebar-card feed-page__sections-card">
        <div className="feed-page__sections-head">
          <h3 className="feed-page__sections-title">Sections</h3>
          <p className="feed-page__sections-lede">Filter threads by topic tag</p>
        </div>
        <SectionTopicList
          activeSection={activeSection ?? ""}
          onSectionSelect={(label) => onSectionSelect?.(label)}
          instanceKey="sidebar"
        />
      </div>
    </aside>
  );
}
