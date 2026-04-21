import { useCallback, useId, useState } from "react";

const STORAGE_INTENT = "edu_flairs_survey_intent_v1";
const STORAGE_CLARITY = "edu_flairs_survey_clarity_v1";

const INTENT_OPTIONS = [
  { value: "discover", label: "Discover how peers structure key discussion topics" },
  { value: "vote", label: "Evaluate ideas and push strong labels upward" },
  { value: "propose", label: "Contribute a new framing for community dialogue" },
  { value: "browse", label: "Observe before deciding where to contribute" },
] as const;

/**
 * Lightweight engagement polls (client-only; no Firestore write).
 * Used for UX signals and habit formation — not for analytics storage.
 */
export function FlairsEngagementSurveys() {
  const intentGroupId = useId();
  const clarityGroupId = useId();

  const [intentDone, setIntentDone] = useState(() =>
    typeof sessionStorage !== "undefined" ? sessionStorage.getItem(STORAGE_INTENT) === "1" : false
  );
  const [clarityDone, setClarityDone] = useState(() =>
    typeof sessionStorage !== "undefined" ? sessionStorage.getItem(STORAGE_CLARITY) === "1" : false
  );

  const [intentChoice, setIntentChoice] = useState<string>("");

  const submitIntent = useCallback(() => {
    if (!intentChoice) return;
    sessionStorage.setItem(STORAGE_INTENT, "1");
    setIntentDone(true);
  }, [intentChoice]);

  const submitClarity = useCallback((n: number) => {
    sessionStorage.setItem(STORAGE_CLARITY, "1");
    setClarityDone(true);
    void n;
  }, []);

  return (
    <div className="flairs-surveys" aria-label="Quick feedback">
      <div className="flairs-surveys__intro">
        <h2 className="flairs-surveys__heading">Cognitive pulse check</h2>
        <p className="flairs-surveys__lede">
          Two quick prompts to tune decision quality on this page. Responses are local to this
          browser session only (no server storage).
        </p>
      </div>

      <div className="flairs-surveys__grid">
        <section className="flairs-survey" aria-labelledby={`${intentGroupId}-legend`}>
          <div className="flairs-survey__head">
            <span className="flairs-survey__badge" aria-hidden>
              1
            </span>
            <h3 id={`${intentGroupId}-legend`} className="flairs-survey__title">
              What cognitive task are you here to do?
            </h3>
          </div>

          {intentDone ? (
            <p className="flairs-survey__thanks" role="status">
              Thanks - this helps us prioritize which decision tools users need first.
            </p>
          ) : (
            <>
              <div
                className="flairs-survey__options"
                role="radiogroup"
                aria-labelledby={`${intentGroupId}-legend`}
              >
                {INTENT_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flairs-survey__option">
                    <input
                      type="radio"
                      name="flair-intent"
                      value={opt.value}
                      checked={intentChoice === opt.value}
                      onChange={() => setIntentChoice(opt.value)}
                    />
                    <span className="flairs-survey__option-ui">{opt.label}</span>
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="flairs-survey__submit"
                onClick={submitIntent}
                disabled={!intentChoice}
              >
                Submit intent
              </button>
            </>
          )}
        </section>

        <section className="flairs-survey" aria-labelledby={`${clarityGroupId}-legend`}>
          <div className="flairs-survey__head">
            <span className="flairs-survey__badge" aria-hidden>
              2
            </span>
            <h3 id={`${clarityGroupId}-legend`} className="flairs-survey__title">
              Is the contribution model understandable?
            </h3>
          </div>
          <p className="flairs-survey__hint">
            Verified students can propose <strong>one</strong> new flair per week (Dublin time).
            Rate how clearly this rule is explained.
          </p>

          {clarityDone ? (
            <p className="flairs-survey__thanks" role="status">
              Great - we will keep tightening wording so participation feels fair and predictable.
            </p>
          ) : (
            <div
              className="flairs-survey__scale"
              role="group"
              aria-label="Rate clarity from 1 to 5"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className="flairs-survey__scale-btn"
                  onClick={() => submitClarity(n)}
                  aria-label={`${n} out of 5`}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
