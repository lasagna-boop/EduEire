import { CommentItem } from "./CommentItem";
import type { CommentTreeNode } from "../lib/commentTree";

type Props = {
  node: CommentTreeNode;
  threadId: string;
  depth: number;
  canComment: boolean;
  disabled: boolean;
  submitting: boolean;
  onReplySubmit: (parentPostId: string, body: string) => Promise<void>;
  onCommentFlagged: (id: string) => void;
};

export function CommentThread({
  node,
  threadId,
  depth,
  canComment,
  disabled,
  submitting,
  onReplySubmit,
  onCommentFlagged,
}: Readonly<Props>) {
  return (
    <div className="comment-thread">
      <CommentItem
        comment={node}
        threadId={threadId}
        canComment={canComment}
        disabled={disabled}
        submitting={submitting}
        onReplySubmit={onReplySubmit}
        onFlagged={() => onCommentFlagged(node.id)}
      />
      {node.children.length > 0 ? (
        <div className="comment-thread__children">
          {node.children.map((child) => (
            <CommentThread
              key={child.id}
              node={child}
              threadId={threadId}
              depth={depth + 1}
              canComment={canComment}
              disabled={disabled}
              submitting={submitting}
              onReplySubmit={onReplySubmit}
              onCommentFlagged={onCommentFlagged}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
