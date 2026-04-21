import { useState } from "react";
import { Link } from "react-router-dom";
import AppHeader from "../components/AppHeader";
import { useAuth } from "../context/useAuth";
import { errorMessage } from "../lib/errors";
import { createModeratorApplication } from "../lib/firestore";
import { moderateContentV2 } from "../lib/moderation";

export default function ModeratorTeam() {
  const { user } = useAuth();
  const [motivation, setMotivation] = useState("");
  const [experience, setExperience] = useState("");
  const [availability, setAvailability] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = user && motivation.trim().length >= 20;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const mod = moderateContentV2(motivation.trim(), `${experience.trim()} ${availability.trim()}`);
    if (mod.flagged) {
      setError("Application text contains inappropriate language. Please revise and try again.");
      setSubmitting(false);
      return;
    }

    try {
      await createModeratorApplication({
        applicantId: user.uid,
        applicantName: user.displayName || user.email || "member",
        applicantEmail: user.email || "",
        motivation: motivation.trim(),
        experience: experience.trim(),
        availability: availability.trim(),
      });
      setMotivation("");
      setExperience("");
      setAvailability("");
      setSuccess("Application submitted. The moderator team will review it in the admin queue.");
    } catch (err) {
      setError(errorMessage(err) || "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="feed-page">
      <AppHeader activeTopLink="communities" />
      <main className="feed-page__main policy-page__main">
        <div className="feed-page__content policy-page">
          <header className="policy-page__hero">
            <h1>Moderator Team</h1>
            <p>
              Moderators protect discussion quality, guide disputes, and keep EduÉire constructive.
              If you can stay calm under pressure and reason fairly, apply below.
            </p>
          </header>

          <section className="policy-page__card">
            <h2>What moderators do</h2>
            <ul className="policy-page__list">
              <li>Review flagged threads, comments, and flairs.</li>
              <li>Apply guidelines consistently and explain decisions clearly.</li>
              <li>Escalate repeat abuse and reduce noise in high-traffic periods.</li>
            </ul>
          </section>

          <section className="policy-page__card">
            <h2>What we look for</h2>
            <ul className="policy-page__list">
              <li>Fair judgment and respectful communication.</li>
              <li>Reliability across term time and exam spikes.</li>
              <li>Ability to separate disagreement from rule-breaking.</li>
            </ul>
          </section>

          <section className="policy-page__card">
            <h2>Apply now</h2>
            {!user ? (
              <p>
                Please <Link to="/login">log in</Link> to apply.
              </p>
            ) : null}
            <form className="policy-page__form" onSubmit={handleSubmit}>
              <label>
                Why do you want to moderate? (min 20 chars)
                <textarea
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value.slice(0, 1200))}
                  rows={5}
                  required
                  minLength={20}
                  maxLength={1200}
                  placeholder="Tell us how you would improve discussion quality."
                />
              </label>
              <label>
                Relevant experience (optional)
                <textarea
                  value={experience}
                  onChange={(e) => setExperience(e.target.value.slice(0, 1200))}
                  rows={4}
                  maxLength={1200}
                  placeholder="Community work, student leadership, moderation, mentoring..."
                />
              </label>
              <label>
                Weekly availability (optional)
                <input
                  type="text"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value.slice(0, 300))}
                  maxLength={300}
                  placeholder="e.g. 4-6 hours/week, evenings mostly"
                />
              </label>

              {error ? <p className="policy-page__error">{error}</p> : null}
              {success ? <p className="policy-page__success">{success}</p> : null}

              <div className="policy-page__actions">
                <button
                  type="submit"
                  className="feed-page__btn feed-page__btn--filled"
                  disabled={!canSubmit || submitting}
                >
                  {submitting ? "Submitting..." : "Submit application"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
