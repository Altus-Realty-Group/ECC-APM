import { useEffect, useState } from "react";
import { chicagoPlanningDate } from "./renewalPlanning";

/** Keep the dashboard and renewal review on the same Central calendar day. */
export function usePlanningDate() {
  const [date, setDate] = useState(chicagoPlanningDate);
  useEffect(() => {
    const update = () => setDate(chicagoPlanningDate());
    const timer = setInterval(update, 60_000);
    window.addEventListener("focus", update);
    return () => { clearInterval(timer); window.removeEventListener("focus", update); };
  }, []);
  return date;
}
