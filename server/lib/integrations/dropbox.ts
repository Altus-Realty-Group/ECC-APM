import fetch from "node-fetch";
import { DropboxFolder, DropboxLink, DropboxSearch } from "../vendorResponseContracts";

const TOKEN = process.env.DROPBOX_ACCESS_TOKEN || "";

async function dbx(path: string, body: any) {
  if (!TOKEN) throw new Error("DROPBOX_NOT_CONFIGURED");
  const res = await fetch(`https://api.dropboxapi.com/2/${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body || {})
  });
  if (!res.ok) {
    const text = await res.text().catch(()=> "");
    throw new Error(`DROPBOX_HTTP_${res.status}:${text}`);
  }
  return res.json();
}

export async function dropboxListFolder(folder: string = "") {
  // Empty path "" == root of the app's space (or user's space for user token)
  const j = DropboxFolder.parse(await dbx("files/list_folder", { path: folder, recursive: false, include_media_info: false, include_deleted: false }));
  return (j?.entries || []).map((e: any) => ({
    id: e.id,
    name: e.name,
    href: null as string | null, // requires temporary link call for files
    is_file: e[".tag"] === "file",
    path_lower: e.path_lower,
  }));
}

export async function dropboxGetTempLink(path_lower: string) {
  const j = DropboxLink.parse(await dbx("files/get_temporary_link", { path: path_lower }));
  return j?.link || null;
}

export async function dropboxSearch(query: string) {
  const j = DropboxSearch.parse(await dbx("files/search_v2", { query, options: { max_results: 25 } }));
  const matches = j?.matches || [];
  return matches.map((m: any) => {
    const md = m.metadata?.metadata;
    return {
      id: md?.id,
      name: md?.name,
      path_lower: md?.path_lower,
      is_file: md?.[".tag"] === "file",
    };
  });
}