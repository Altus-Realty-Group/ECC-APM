import { ContractError } from "@/lib/dataState";
export type ListedFile = { id?: string; name: string; size?: number; modified?: string; url?: string; source: "DL" | "DBX" };

export function parseFileList(payload: unknown, source: ListedFile["source"]): ListedFile[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new ContractError("File list is not an object");
  const body = payload as Record<string, unknown>;
  if (body.ok === false || !Array.isArray(body.items)) throw new ContractError("File list is unavailable");
  return body.items.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new ContractError("Invalid file entry");
    const f = entry as Record<string, unknown>;
    const name = typeof f.name === "string" ? f.name : typeof f.path === "string" ? f.path : null;
    if (!name?.trim()) throw new ContractError("File name is missing");
    const modified = f.client_modified ?? f.modified;
    const fileUrl = f.url;
    let url: string | undefined;
    if (fileUrl != null) {
      if (typeof fileUrl !== "string") throw new ContractError("Invalid file link");
      try {
        const parsed = new URL(fileUrl);
        if (parsed.protocol !== "https:" || parsed.username || parsed.password) throw new Error();
        url = parsed.href;
      } catch { throw new ContractError("Invalid file link"); }
    }
    if (f.size != null && (typeof f.size !== "number" || !Number.isSafeInteger(f.size) || f.size < 0)) throw new ContractError("Invalid file size");
    if (modified != null && (typeof modified !== "string" || !Number.isFinite(Date.parse(modified)))) throw new ContractError("Invalid file date");
    return { name, source, url, id: f.id == null ? undefined : String(f.id), size: f.size as number | undefined,
      modified: modified as string | undefined };
  });
}
