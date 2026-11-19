import { ThreadTitle as BbThreadTitle } from "@get-bb/plugin-sdk/app";

export function ThreadTitle({
  threadId,
  title,
  mentions = false,
  className,
}: {
  threadId: string;
  title: string;
  /** Draw bb's mention chips; `title` is the same text resolved to names. */
  mentions?: boolean;
  className?: string;
}) {
  const text = mentions ? <BbThreadTitle threadId={threadId} /> : title;
  return <span className={className}>{text}</span>;
}
