import { useEffect, useState } from "react";
import { fetchJSON } from "@/lib/http";
type Integrations = {
  m365: boolean;
  sharepoint: boolean;
  teamsDefault: boolean;
  doorloop: boolean;
  dropbox: boolean;
  corelogic: boolean;
};
export function useIntegrations(){
  const [data,setData]=useState<Integrations|null>(null);
  useEffect(()=>{ (async()=>{
    try{
      const j = await fetchJSON<{ integrations?: Integrations }>("/api/config/integrations");
      setData(j?.integrations||null);
    }catch{ setData({ m365:false, sharepoint:false, teamsDefault:false, doorloop:false, dropbox:false, corelogic:false }); }
  })(); },[]);
  return data;
}