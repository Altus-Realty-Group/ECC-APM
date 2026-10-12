export type CommandSurfaceRow = {
  id: string;
  primary: string;
  secondary: string;
  metricA: string;
  metricB: string;
  segment: string;
};

export type CommandSurfaceConfig = {
  entityLabel: string;
  entityPluralLabel: string;
  routePath: string;
  title: string;
  subtitle: string;
  searchPlaceholder: string;
  searchLabel: string;
  tableSummary: string;
  selectedLabel: string;
  metricALabel: string;
  metricBLabel: string;
  metricBFormat: "percentage" | "currency" | "number";
  segmentLabel: string;
  segmentSummaryLabel: string;
  triageTitle: string;
  triageEmptyLabel: string;
  focusCommandLabel: string;
};
