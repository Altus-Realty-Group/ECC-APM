const UP = "https://content.dropboxapi.com/2/files/upload";
const SHARE = "https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings";

export async function uploadBufferToDropbox(params: { 
  path: string; 
  buffer: Buffer; 
  mode?: "add" | "overwrite" 
}) {
  const token = process.env.DROPBOX_ACCESS_TOKEN;
  if (!token) throw new Error("DROPBOX_ACCESS_TOKEN not set");
  
  const arg = { 
    path: params.path, 
    mode: params.mode ?? "overwrite", 
    mute: false, 
    strict_conflict: false 
  };

  const res = await fetch(UP, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${token}`, 
      "Content-Type": "application/octet-stream", 
      "Dropbox-API-Arg": JSON.stringify(arg) 
    },
    body: new Uint8Array(params.buffer),
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Dropbox upload failed: ${res.status} ${text}`);
  }

  const meta = await res.json();
  const share = await fetch(SHARE, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${token}`, 
      "Content-Type": "application/json" 
    },
    body: JSON.stringify({ path: meta.path_lower }),
  });

  let url: string | undefined;
  if (share.ok) {
    const s = await share.json();
    url = s?.url?.replace(/\?dl=0$/, "?dl=1");
  }
  
  return { path: params.path, url };
}