export const MERGE_FIELDS = [
  { key: "recipient_name", label: "Recipient name" },
  { key: "property_address", label: "Property address" },
  { key: "unit_label", label: "Unit" },
  { key: "message_date", label: "Message date" },
] as const;
export type MergeKey = typeof MERGE_FIELDS[number]["key"];
export type MergeValues = Record<MergeKey, string>;
export type EmailTemplate = { formatVersion: 1; name: string; subject: string; body: string };
export const MAX_TEMPLATE_BYTES = 65536;
export const blankTemplate = (): EmailTemplate => ({ formatVersion: 1, name: "", subject: "", body: "" });
export const blankValues = (): MergeValues => ({ recipient_name: "", property_address: "", unit_label: "", message_date: "" });
const bytes = (value: string) => new TextEncoder().encode(value);

function validateTemplate(value: unknown): EmailTemplate {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Choose an ECC email template file.");
  const data = value as Record<string, unknown>;
  if (Object.keys(data).sort().join(",") !== "body,formatVersion,name,subject" || data.formatVersion !== 1
    || typeof data.name !== "string" || typeof data.subject !== "string" || typeof data.body !== "string") throw new Error("This template file has an unsupported format.");
  if (data.name.length > 100 || data.subject.length > 250 || data.body.length > 20000
    || /[\x00-\x1f\x7f]/.test(data.name + data.subject) || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(data.body)) throw new Error("The template contains an invalid value or is too long.");
  return { formatVersion: 1, name: data.name, subject: data.subject, body: data.body };
}
export function parseTemplate(text: string): EmailTemplate {
  if (bytes(text).length > MAX_TEMPLATE_BYTES) throw new Error("Choose a template file smaller than 64 KB.");
  let raw;
  try { raw = JSON.parse(text); } catch { throw new Error("The selected file is not a readable email template."); }
  return validateTemplate(raw);
}
export function templateJson(template: EmailTemplate): string {
  const valid = validateTemplate(template);
  if (!valid.name.trim() || !valid.subject.trim() || !valid.body.trim()) throw new Error("Add a template name, subject and message before downloading.");
  const text = JSON.stringify(valid, null, 2) + "\n";
  if (bytes(text).length > MAX_TEMPLATE_BYTES) throw new Error("The template file is larger than 64 KB.");
  return text;
}

export function previewTemplate(template: EmailTemplate, values: MergeValues) {
  validateTemplate(template);
  const unresolved = new Set<string>();
  const used = new Set<MergeKey>();
  function merge(text: string) {
    let result = text.replace(/\{\{([^{}]*)\}\}/g, (whole, raw: string) => {
      const key = raw.trim();
      if (!MERGE_FIELDS.some(field => field.key === key)) { unresolved.add(key || "unnamed field"); return whole; }
      const name = key as MergeKey; used.add(name);
      const value = values[name];
      if (typeof value !== "string" || !value.trim()) { unresolved.add(key); return whole; }
      return value;
    });
    if (/\{\{|\}\}/.test(text.replace(/\{\{[^{}]*\}\}/g, ""))) unresolved.add("unfinished field");
    return result;
  }
  const subject = merge(template.subject), body = merge(template.body);
  return { subject, body, unresolved: [...unresolved], used: [...used] };
}

function base64(text: string) { return btoa(Array.from(bytes(text), byte => String.fromCharCode(byte)).join("")); }
function encodedSubject(subject: string) {
  const chunks: string[] = []; let chunk = "";
  for (const point of subject) {
    if (bytes(chunk + point).length > 42) { chunks.push(chunk); chunk = ""; }
    chunk += point;
  }
  if (chunk) chunks.push(chunk);
  return chunks.map(value => "=?UTF-8?B?" + base64(value) + "?=").join("\r\n ");
}
export function emailDraft(template: EmailTemplate, values: MergeValues, recipient: string): string {
  const preview = previewTemplate(template, values);
  // One plain mailbox only. No guessed recipients, display-name parsing or header injection.
  if (recipient.length > 254 || recipient !== recipient.trim() || !/^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/.test(recipient)
    || recipient.split("@")[0].startsWith(".") || recipient.split("@")[0].endsWith(".") || recipient.includes("..")
    || !recipient.split("@")[1].split(".").every(label => /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label))) throw new Error("Enter one valid recipient email address.");
  if (preview.unresolved.length) throw new Error("Complete or remove the missing message fields before downloading the email draft.");
  if (!preview.subject.trim() || !preview.body.trim()) throw new Error("Add a subject and message before downloading the email draft.");
  if (/[\x00-\x1f\x7f]/.test(preview.subject) || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(preview.body) || preview.subject.length > 998 || preview.body.length > 40000) throw new Error("The completed message contains an invalid value or is too long.");
  const encoded = base64(preview.body.replace(/\r\n|\r|\n/g, "\r\n")).match(/.{1,76}/g)?.join("\r\n") ?? "";
  return ["X-Unsent: 1", "To: " + recipient, "Subject: " + encodedSubject(preview.subject), "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", encoded, ""].join("\r\n");
}
export function templateFilename(template: EmailTemplate, extension: "json" | "eml") {
  const name = template.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "email";
  return `${name}.${extension}`;
}
export function downloadDraftFile(text: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  try {
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename;
    document.body.appendChild(anchor);
    try { anchor.click(); } finally { anchor.remove(); }
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
