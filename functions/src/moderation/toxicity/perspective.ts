const PERSPECTIVE_URL =
  "https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze";

/**
 * External ML toxicity signal (optional): kept isolated so local spam/keyword
 * moderation can evolve independently from third-party APIs.
 */
export async function getPerspectiveToxicityScore(text: string): Promise<number> {
  const apiKey = process.env.PERSPECTIVE_API_KEY;
  if (!apiKey) return 0;

  try {
    const res = await fetch(`${PERSPECTIVE_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        comment: { text },
        requestedAttributes: { TOXICITY: {} },
        languages: ["en"],
      }),
    });

    if (!res.ok) return 0;

    const json = await res.json();
    return json.attributeScores?.TOXICITY?.summaryScore?.value ?? 0;
  } catch {
    return 0;
  }
}
