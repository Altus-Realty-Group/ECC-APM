import React, { useId } from "react";

type Props = {
  title: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  onCreate?: () => void;
  createLabel?: string;
  rightSlot?: React.ReactNode; // optional extra controls
};

export default function FilterBar({ title, placeholder = "Search…", value, onChange, onCreate, createLabel = "Create", rightSlot }: Props) {
  const searchId = useId();
  return (
    <div className="ecc-page-head">
      <h1 className="ecc-page-title">{title}</h1>
      <div className="ecc-page-tools">
        <label className="ecc-search-label" htmlFor={searchId}>Search {title}
        <input
          id={searchId}
          type="search"
          className="ecc-search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        </label>
        {rightSlot}
        {onCreate && (
          <button className="ecc-btn ecc-btn-gold" onClick={onCreate}>{createLabel}</button>
        )}
      </div>
    </div>
  );
}
