import { Link } from "wouter";

export type RecordKind = "property" | "unit" | "lease" | "tenant";

/** Never turn an unusable identifier into a navigation destination. */
export function relatedRecordPath(kind: RecordKind, id: number): string | null {
  return Number.isSafeInteger(id) && id > 0 ? `/card/${kind}/${id}` : null;
}

export default function RelatedRecord({ kind, id, title, detail }: {
  kind: RecordKind;
  id: number;
  title: string;
  detail?: string;
}) {
  const href = relatedRecordPath(kind, id);
  const content = <><span>{title}</span>{detail ? <span className="block text-sm">{detail}</span> : null}</>;
  return href ? (
    <Link href={href} className="ecc-btn ecc-touch block break-words">{content}</Link>
  ) : (
    <div className="break-words">{content}<p className="text-sm">This record cannot be opened because its link is incomplete.</p></div>
  );
}
