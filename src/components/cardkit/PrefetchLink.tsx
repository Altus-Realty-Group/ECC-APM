import { cloneElement } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";

function PrefetchLink({
  prefetchKey,
  fetcher,        // () => Promise<any>
  ...rest
}: React.ComponentProps<typeof Link> & {
  prefetchKey?: any[];
  fetcher?: () => Promise<any>;
}) {
  const qc = useQueryClient();
  const prefetch = async () => {
    if (prefetchKey && fetcher) {
      await qc.prefetchQuery({ queryKey: prefetchKey, queryFn: fetcher, staleTime: 30_000 });
    }
  };
  if (rest.asChild) {
    return <Link {...rest}>{cloneElement(rest.children, {
      onMouseEnter: rest.children.props.onMouseEnter ?? prefetch,
    })}</Link>;
  }
  return (
    <Link
      onMouseEnter={prefetch}
      {...rest}
      asChild={false}
    />
  );
}

export default PrefetchLink;
export { PrefetchLink }; // <-- provide named export too
