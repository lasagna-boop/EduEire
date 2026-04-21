import { Link } from "react-router-dom";
import AppHeader from "../components/AppHeader";

export default function Guidelines() {
  return (
    <div className="feed-page">
      <AppHeader activeTopLink="communities" />
      <main className="feed-page__main policy-page__main">
        <div className="feed-page__content policy-page">
          <header className="policy-page__hero">
            <h1>Community Guidelines</h1>
            <p>
              EduÉire works best when people challenge ideas with clarity and respect. These rules
              keep conversations useful for students, educators, and moderators.
            </p>
          </header>

          <section className="policy-page__card">
            <h2>1) Discuss ideas, not identities</h2>
            <p>
              Critique arguments, experiences, and policies. Personal attacks, harassment, and
              demeaning labels are removed.
            </p>
          </section>

          <section className="policy-page__card">
            <h2>2) Be specific and evidence-aware</h2>
            <p>
              Use concrete details (module names, deadlines, context). If you're making a strong
              claim, add enough context so others can verify or challenge it productively.
            </p>
          </section>

          <section className="policy-page__card">
            <h2>3) No spam, scams, or unsafe promotion</h2>
            <p>
              Repetitive posts, manipulative links, fake services, and commercial spam are blocked
              or removed.
            </p>
          </section>

          <section className="policy-page__card">
            <h2>4) Protect privacy</h2>
            <p>
              Do not share private identifiers, doxxing content, or sensitive personal information
              about yourself or others.
            </p>
          </section>

          <section className="policy-page__card">
            <h2>5) Moderation process</h2>
            <p>
              Content may be auto-flagged and reviewed. Moderators can approve, reject, or escalate
              based on community safety and discussion quality.
            </p>
          </section>

          <div className="policy-page__actions">
            <Link to="/feed" className="feed-page__btn feed-page__btn--outline">
              Back to feed
            </Link>
            <Link to="/moderator-team" className="feed-page__btn feed-page__btn--filled">
              Apply to Moderator Team
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
