import * as React from "react";
import { Link } from "wouter";
import CardPanel from "@/components/cardkit/CardPanel";
import BaseMiniCard from "@/features/ui/MiniCard";

/** Titled panel used by the card tabs and right rails. */
export function Section({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <CardPanel>
      <div className="text-sm font-medium mb-2">{title}</div>
      {children}
    </CardPanel>
  );
}

/** Mini card that navigates (client-side) when an href is supplied. */
export function MiniCard({
  title,
  subtitle,
  href,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  href?: string;
}) {
  const card = <BaseMiniCard title={title} subtitle={subtitle} />;
  return href ? <Link href={href} className="block">{card}</Link> : card;
}
