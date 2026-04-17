/**
 * Shared 40-case Layer-1 moderation inputs for regression scripts and selected tests.
 */

const THREE_URLS = "http://a.com http://b.com http://c.com";
const FOUR_URLS = "http://a.com http://b.com http://c.com http://d.com";
const MIXED_CAPS_20 = "ABCDEFGHIJKLMNOPQRST";
const CAPS_DOMINANT_BLOCK = "ABCDEFGHIJKLMNOPQRST".repeat(4);
const SEVEN_A = "aaaaaaa";
const SEVEN_A_UPPER = "AAAAAAA";

export type Layer1SpamCase =
  | { id: number; group: string; label: string; mode: "checkSpam"; text: string }
  | { id: number; group: string; label: string; mode: "moderate"; title: string; body: string };

export const LAYER1_SPAM_FIXTURE_CASES: Layer1SpamCase[] = [
  { id: 1, group: "A", label: "Plain academic question", mode: "moderate", title: "", body: "Does anyone know the deadline for the CS assignment?" },
  { id: 2, group: "A", label: "Thread title + body, normal tone", mode: "moderate", title: "Past papers", body: "Looking for past exam papers for Linear Algebra if anyone has them." },
  { id: 3, group: "A", label: "Empty title, short harmless body", mode: "moderate", title: "", body: "Thanks!" },
  { id: 4, group: "A", label: "Two URLs only", mode: "checkSpam", text: "Check http://a.com and http://b.com for details." },
  { id: 5, group: "A", label: "Mixed case, short text", mode: "checkSpam", text: "HELLO there friend" },
  { id: 6, group: "B", label: "Three URLs", mode: "checkSpam", text: THREE_URLS },
  { id: 7, group: "B", label: "Four URLs", mode: "checkSpam", text: FOUR_URLS },
  { id: 8, group: "B", label: "Keyword: earn fast", mode: "checkSpam", text: "earn fast results guaranteed" },
  { id: 9, group: "B", label: "Keyword: free money", mode: "checkSpam", text: "free money offer today" },
  { id: 10, group: "B", label: "Keyword: click here", mode: "checkSpam", text: "click here for details" },
  { id: 11, group: "B", label: "Keyword: dm me", mode: "checkSpam", text: "dm me for the link" },
  { id: 12, group: "B", label: "Keyword: whatsapp", mode: "checkSpam", text: "contact me on whatsapp" },
  { id: 13, group: "B", label: "Keyword: telegram", mode: "checkSpam", text: "join our telegram group" },
  { id: 14, group: "B", label: "Keyword: crypto signal", mode: "checkSpam", text: "best crypto signal channel" },
  { id: 15, group: "B", label: "Keyword: guaranteed profit", mode: "checkSpam", text: "guaranteed profit in one week" },
  { id: 16, group: "B", label: "Long char run", mode: "checkSpam", text: `prefix ${SEVEN_A} suffix` },
  { id: 17, group: "B", label: "Uppercase blast", mode: "checkSpam", text: MIXED_CAPS_20 },
  { id: 18, group: "B", label: "Repeated token", mode: "checkSpam", text: "spam spam spam" },
  { id: 19, group: "C", label: "links + keywords", mode: "checkSpam", text: `${THREE_URLS} earn fast` },
  { id: 20, group: "C", label: "links + char_run", mode: "checkSpam", text: `${THREE_URLS} ${SEVEN_A}` },
  { id: 21, group: "C", label: "caps + keywords", mode: "checkSpam", text: `${MIXED_CAPS_20} earn fast` },
  { id: 22, group: "C", label: "repetition + keywords", mode: "checkSpam", text: "click here click here click here" },
  { id: 23, group: "C", label: "links + caps + keywords", mode: "checkSpam", text: `${THREE_URLS} ${CAPS_DOMINANT_BLOCK} earn fast` },
  { id: 24, group: "C", label: "all five tags", mode: "checkSpam", text: `${THREE_URLS} ${CAPS_DOMINANT_BLOCK} ${SEVEN_A_UPPER} SPAM SPAM SPAM earn fast` },
  { id: 25, group: "D", label: "very short title + gibberish", mode: "moderate", title: "aa", body: "" },
  { id: 26, group: "D", label: "short title + gibberish", mode: "moderate", title: "abc", body: "" },
  { id: 27, group: "D", label: "short title only", mode: "moderate", title: "abcd", body: "" },
  { id: 28, group: "D", label: "compact gibberish body", mode: "moderate", title: "", body: "abcabcab" },
  { id: 29, group: "D", label: "tiny body", mode: "moderate", title: "", body: "123456" },
  { id: 30, group: "D", label: "two-letter title + longer body", mode: "moderate", title: "xx", body: "notes!!" },
  { id: 31, group: "E", label: "keyword + very short title", mode: "moderate", title: "ab", body: "earn fast" },
  { id: 32, group: "E", label: "keyword + short title", mode: "moderate", title: "abc", body: "earn fast" },
  { id: 33, group: "E", label: "three URLs via moderateContent", mode: "moderate", title: "", body: THREE_URLS },
  { id: 34, group: "E", label: "keywords + short body", mode: "moderate", title: "", body: "earn fast ab" },
  { id: 35, group: "E", label: "heuristic boundary (same as 33)", mode: "moderate", title: "", body: THREE_URLS },
  { id: 36, group: "F", label: "caps length 19", mode: "checkSpam", text: "AAAAAAAAAAAAAAAAAAA" },
  { id: 37, group: "F", label: "6-char run", mode: "checkSpam", text: "aaaaaa" },
  { id: 38, group: "F", label: "two-word repeat", mode: "checkSpam", text: "ok ok" },
  { id: 39, group: "F", label: "whitespace title", mode: "moderate", title: "   ", body: "Some body text here." },
  {
    id: 40,
    group: "F",
    label: "long benign paragraph",
    mode: "moderate",
    title: "Question",
    body:
      "I am writing to ask about module registration for next semester. Could someone confirm whether the deadline is the same for part-time students?",
  },
];
