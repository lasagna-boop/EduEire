import { useState } from "react";
import type { User } from "firebase/auth";
import { createThread, type Community } from "../lib/firestore";
import { errorMessage } from "../lib/errors";
import { moderateContent } from "../lib/moderation";

type FlashDuration = "" | "1" | "3" | "24";

type BaseProps = {
  fbUser: User | null;
  canWrite: boolean;
  onPosted: () => Promise<void>;
  onFormError: (message: string | null) => void;
  triggerLabel: string;
  readOnlyMessage: string;
};

type FeedModeProps = BaseProps & {
  mode: "feed";
  communities: Community[];
  communityId: string;
  onCommunityIdChange: (id: string) => void;
};

type CommunityModeProps = BaseProps & {
  mode: "community";
  fixedCommunityId: string;
};

type Props = FeedModeProps | CommunityModeProps;

const FLASH_OPTIONS: { value: FlashDuration; label: string }[] = [
  { value: "", label: "Normal post" },
  { value: "1", label: "Flash: 1 hour" },
  { value: "3", label: "Flash: 3 hours" },
  { value: "24", label: "Flash: 24 hours" },
];

export function CreateThreadCard(props: Readonly<Props>) {
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [flashDuration, setFlashDuration] = useState<FlashDuration>("");
  const [busy, setBusy] = useState(false);

  const effectiveCommunityId =
    props.mode === "community" ? props.fixedCommunityId : props.communityId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!props.fbUser || !effectiveCommunityId || !props.canWrite) return;

    setBusy(true);
    props.onFormError(null);

    const modResult = moderateContent(title.trim(), body.trim());
    if (modResult.flagged) {
      props.onFormError(
        "Your post contains inappropriate language and cannot be published."
      );
      setBusy(false);
      return;
    }

    try {
      const tagList = tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      let flashExpiresAt: Date | null = null;
      if (flashDuration) {
        const hours = Number(flashDuration);
        flashExpiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
      }

      await createThread({
        title: title.trim(),
        body: body.trim(),
        communityId: effectiveCommunityId,
        tags: tagList,
        authorId: props.fbUser.uid,
        authorName: props.fbUser.displayName || props.fbUser.email || "user",
        flashExpiresAt,
      });

      setTitle("");
      setBody("");
      setTags("");
      setFlashDuration("");
      setShowNew(false);
      await props.onPosted();
    } catch (err) {
      props.onFormError(
        errorMessage(err) ||
          (props.mode === "feed"
            ? "failed to create thread"
            : "failed to create post")
      );
    } finally {
      setBusy(false);
    }
  };

  if (!props.fbUser) return null;

  if (!props.canWrite) {
    return (
      <div className="feed-page__create-card">
        <div className="feed-page__empty">{props.readOnlyMessage}</div>
      </div>
    );
  }

  const flashSelect = (
    <select
      className="feed-page__select"
      value={flashDuration}
      onChange={(e) => setFlashDuration(e.target.value as FlashDuration)}
    >
      {FLASH_OPTIONS.map((o) => (
        <option key={o.value || "normal"} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );

  return (
    <div className="feed-page__create-card">
      {showNew ? (
        <form onSubmit={handleSubmit} className="feed-page__create-form">
          <input
            className="feed-page__input"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            className="feed-page__textarea"
            placeholder="What's on your mind?"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            required
          />
          {props.mode === "feed" ? (
            <div className="feed-page__form-row">
              <select
                className="feed-page__select"
                value={props.communityId}
                onChange={(e) => props.onCommunityIdChange(e.target.value)}
                required
              >
                <option value="">Select Community</option>
                {props.communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input
                className="feed-page__input"
                placeholder="Tags (comma separated)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              {flashSelect}
            </div>
          ) : (
            <>
              <input
                className="feed-page__input"
                placeholder="Tags (comma separated)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              {flashSelect}
            </>
          )}
          <div className="feed-page__form-actions">
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="feed-page__btn feed-page__btn--outline"
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="feed-page__btn feed-page__btn--filled"
              disabled={busy}
            >
              {busy ? "Posting…" : "Post"}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          className="feed-page__create-trigger"
          onClick={() => setShowNew(true)}
        >
          <span className="feed-page__create-icon">✏️</span>
          <span>{props.triggerLabel}</span>
        </button>
      )}
    </div>
  );
}
