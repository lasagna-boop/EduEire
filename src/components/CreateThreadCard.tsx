import { useState } from "react";
import type { User } from "firebase/auth";
import { createThread, type Community } from "../lib/firestore";
import { errorMessage } from "../lib/errors";
import { moderateContent } from "../lib/moderation";
import type { AccessMode } from "../lib/userAccess";
import { hasReadOnlyAllowedTag, READ_ONLY_ALLOWED_SECTIONS } from "../lib/sectionAccess";

type FlashDuration = "" | "1" | "3" | "24";

type BaseProps = {
  fbUser: User | null;
  canWrite: boolean;
  accessMode: AccessMode;
  onPosted: () => Promise<void>;
  onFormError: (message: string | null) => void;
  triggerLabel: string;
  readOnlyMessage: string;
  presentation?: "inline" | "overlay";
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

const TAG_OPTIONS = [
  "Admissions",
  "First Year/Transition",
  "Academics/Modules",
  "Accommodation/Cost of Living",
  "Student Services",
  "Campus Life",
  "Other",
] as const;

export function CreateThreadCard(props: Readonly<Props>) {
  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [flashDuration, setFlashDuration] = useState<FlashDuration>("");
  const [busy, setBusy] = useState(false);

  const effectiveCommunityId =
    props.mode === "community" ? props.fixedCommunityId : props.communityId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const canCreate = props.canWrite || props.accessMode === "read_only";
    if (!props.fbUser || !effectiveCommunityId || !canCreate) return;

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
      const tagList = selectedTag ? [selectedTag] : [];
      if (props.accessMode === "read_only" && !hasReadOnlyAllowedTag(tagList)) {
        props.onFormError(
          "Read-only accounts can create threads only in Admissions or First Year/Transition."
        );
        setBusy(false);
        return;
      }

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
      setSelectedTag("");
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

  const canCreateThread = props.canWrite || props.accessMode === "read_only";
  if (!canCreateThread) {
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

  const tagsSelect = (
    <select
      className="feed-page__select"
      value={selectedTag}
      onChange={(e) => setSelectedTag(e.target.value)}
    >
      <option value="">Select Tag</option>
      {(props.accessMode === "read_only" ? READ_ONLY_ALLOWED_SECTIONS : TAG_OPTIONS).map((tag) => (
        <option key={tag} value={tag}>
          {tag}
        </option>
      ))}
    </select>
  );

  const createForm = (
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
          {tagsSelect}
          {flashSelect}
        </div>
      ) : (
        <>
          {tagsSelect}
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
  );

  const useOverlay = props.presentation === "overlay";

  return (
    <div className="feed-page__create-card">
      <button
        type="button"
        className="feed-page__create-trigger"
        onClick={() => setShowNew(true)}
      >
        <span className="feed-page__create-icon">+</span>
        <span>{props.triggerLabel}</span>
      </button>

      {!useOverlay && showNew ? createForm : null}

      {useOverlay && showNew ? (
        <div className="feed-page__create-overlay" role="dialog" aria-modal="true">
          <div className="feed-page__create-overlay-panel">
            <div className="feed-page__create-overlay-header">
              <div className="feed-page__create-overlay-title-wrap">
                <h2>Create Thread</h2>
                <p>Share your idea clearly and choose relevant tags.</p>
              </div>
              <button
                type="button"
                className="feed-page__create-overlay-close"
                aria-label="Close create thread form"
                onClick={() => setShowNew(false)}
              >
                ×
              </button>
            </div>
            {createForm}
          </div>
        </div>
      ) : null}
    </div>
  );
}
