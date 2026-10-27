import * as React from "react";
const RRPBase: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ title, children, className, ...props }) => (
  <aside className={`right-rail ${className ?? ""}`} {...props}>
    {title ? <h2 className="ecc-record-panel-title">{title}</h2> : null}
    {children}
  </aside>
);
export default RRPBase;
export const RightRailPanel = RRPBase;
