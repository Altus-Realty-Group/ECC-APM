import * as React from "react";
const CardPanelBase: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ title, children, className, ...props }) => (
  <div className={`card-panel p-4 rounded-xl border border-white/10 ${className ?? ""}`} {...props}>
    {title ? <h2 className="ecc-record-panel-title">{title}</h2> : null}
    {children}
  </div>
);
export default CardPanelBase;
export const CardPanel = CardPanelBase;
