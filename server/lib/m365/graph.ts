import fetch from "node-fetch";
import { GraphToken, GraphObject, GraphBuckets, GraphTask, GraphItems } from "../vendorResponseContracts";

const TENANT = process.env.M365_TENANT_ID || process.env.M365_AUTH_TENANT || "";
const CLIENT_ID = process.env.M365_CLIENT_ID || "";
const CLIENT_SECRET = process.env.M365_CLIENT_SECRET || "";

async function getToken(): Promise<string|null> {
  if (!TENANT || !CLIENT_ID || !CLIENT_SECRET) return null;
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });
  const res = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;
  const raw = await res.json().catch(()=>null);
  const parsed = GraphToken.safeParse(raw);
  const j = parsed.success ? parsed.data : null;
  return j?.access_token || null;
}

export async function graphFetch(path: string, init: any = {}, base = "https://graph.microsoft.com/v1.0"){
  const token = await getToken();
  if (!token) throw new Error("GRAPH_NOT_CONFIGURED");
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });
  if (!res.ok) {
    const t = await res.text().catch(()=> "");
    throw new Error(`GRAPH_HTTP_${res.status}:${t}`);
  }
  return GraphObject.parse(await res.json());
}

// ---- Planner
export async function createPlannerTask(params: {
  title: string;
  notes?: string;
  dueDateTime?: string; // ISO string
  planId: string;
  bucketId?: string;
}){
  const { title, notes, dueDateTime, planId } = params;
  if (!planId) throw new Error("PLANNER_PLAN_ID_REQUIRED");
  let bucketId = params.bucketId;
  if (!bucketId) {
    // fetch buckets and pick the first
    const b = GraphBuckets.parse(await graphFetch(`/planner/plans/${planId}/buckets`, { method: "GET" }));
    bucketId = b?.value?.[0]?.id;
  }
  const payload: any = { planId, bucketId, title };
  if (dueDateTime) payload.dueDateTime = dueDateTime;
  const task = GraphTask.parse(await graphFetch(`/planner/tasks`, { method: "POST", body: JSON.stringify(payload) }));
  if (notes) {
    // add details (notes) — requires separate call
    await graphFetch(`/planner/tasks/${task.id}/details`, {
      method: "PATCH",
      headers: { "If-Match": task["@odata.etag"] || "*" },
      body: JSON.stringify({ description: notes })
    });
  }
  return task;
}

// ---- Teams channel message
export async function postTeamsChannelMessage(teamId: string, channelId: string, text: string){
  if (!teamId || !channelId) throw new Error("TEAMS_TARGET_REQUIRED");
  const payload = { body: { content: text } };
  return graphFetch(`/teams/${teamId}/channels/${channelId}/messages`, { method: "POST", body: JSON.stringify(payload) });
}

// ---- SharePoint (drive root)
export async function listSharePointRoot(siteId: string){
  if (!siteId) throw new Error("SP_SITE_ID_REQUIRED");
  const j = GraphItems.parse(await graphFetch(`/sites/${siteId}/drive/root/children`, { method: "GET" }));
  const items = (j?.value || []).map((x:any)=>({
    id: x.id, name: x.name, webUrl: x.webUrl, is_file: x.file ? true : false
  }));
  return items;
}