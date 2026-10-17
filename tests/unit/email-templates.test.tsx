import React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { blankTemplate, blankValues, parseTemplate, templateJson, previewTemplate, emailDraft, templateFilename, downloadDraftFile, type EmailTemplate } from "../../src/features/communications/emailDraft";
import { EmailTemplateWorkspace } from "../../src/features/communications/EmailTemplatesPage";

const authored: EmailTemplate = { formatVersion: 1, name: "Owner update", subject: "Update for {{property_address}}", body: "Hello {{recipient_name}},\nPlease review the attached information.\n{{message_date}}" };
const values = { ...blankValues(), recipient_name: "Isolated recipient", property_address: "Isolated property", message_date: "2026-10-17" };
test("template files round-trip authored wording without recipient or completion values", () => {
  const file = templateJson(authored);
  assert.deepEqual(parseTemplate(file), authored);
  assert.doesNotMatch(file, /Isolated recipient|Isolated property|2026-10-17|recipientEmail/);
  assert.throws(() => templateJson(blankTemplate()));
  for (const raw of [null, [], { ...authored, formatVersion: 2 }, { ...authored, name: 7 }, { ...authored, subject: "Injected\r\nBcc: hidden@example.com" }, { ...authored, body: "\u0000" }, { ...authored, approved: true }]) {
    assert.throws(() => parseTemplate(JSON.stringify(raw)));
  }
  assert.throws(() => parseTemplate("not JSON"));
  assert.throws(() => parseTemplate(JSON.stringify({ ...authored, body: "🙂".repeat(20000) })));
});
test("merge preview retains missing fields, reports unknown/unclosed fields and never invents completion", () => {
  const incomplete = previewTemplate(authored, blankValues());
  assert.deepEqual(incomplete.unresolved, ["property_address", "recipient_name", "message_date"]);
  assert.match(incomplete.body, /\{\{recipient_name\}\}/);
  const completed = previewTemplate(authored, values);
  assert.equal(completed.subject, "Update for Isolated property");
  assert.equal(completed.unresolved.length, 0);
  assert.match(completed.body, /Hello Isolated recipient,/);
  assert.deepEqual(previewTemplate({ ...authored, subject: "{{unknown}}", body: "{{recipient_name" }, values).unresolved, ["unknown", "unfinished field"]);
  assert.throws(() => emailDraft(authored, blankValues(), "recipient@example.com"));
});
test("downloaded email is an unsent UTF-8 plaintext MIME draft with exact recipient and completed body", () => {
  const text = emailDraft(authored, values, "recipient@example.com");
  const [headers, body] = text.split("\r\n\r\n");
  assert.match(headers, /^X-Unsent: 1\r\nTo: recipient@example.com\r\n/);
  assert.match(headers, /Content-Type: text\/plain; charset=UTF-8/);
  assert.doesNotMatch(headers, /From:|Date:|Bcc:|Cc:/);
  const subject = [...headers.matchAll(/=\?UTF-8\?B\?([^?]+)\?=/g)].map(match => Buffer.from(match[1], "base64").toString("utf8")).join("");
  assert.equal(subject, "Update for Isolated property");
  assert.equal(Buffer.from(body, "base64").toString("utf8"), "Hello Isolated recipient,\r\nPlease review the attached information.\r\n2026-10-17");
  assert.ok(headers.split("\r\n").every(line => line.length < 998));
});
test("subject folding keeps complete UTF-8 characters; recipient and merged subject cannot inject headers", () => {
  const subject = "Résumé 🏠 ".repeat(20);
  const text = emailDraft({ ...authored, subject, body: "<script>literal plaintext</script>" }, blankValues(), "recipient@example.com");
  const chunks = [...text.split("\r\n\r\n")[0].matchAll(/=\?UTF-8\?B\?([^?]+)\?=/g)];
  assert.equal(chunks.map(match => Buffer.from(match[1], "base64").toString("utf8")).join(""), subject);
  assert.ok(chunks.every(match => match[0].length <= 75));
  for (const email of ["recipient@example.com\r\nBcc:hidden@example.com", "a@example.com,b@example.com", "Name <a@example.com>", " a@example.com", ".a@example.com", "a.@example.com", "a@-domain.example.com", "a@bad..com"]) assert.throws(() => emailDraft(authored, values, email));
  assert.throws(() => emailDraft(authored, { ...values, property_address: "value\r\nBcc:hidden@example.com" }, "recipient@example.com"));
  assert.throws(() => emailDraft(authored, { ...values, recipient_name: "\u0000" }, "recipient@example.com"));
});
test("filenames contain no directory/control segments and fresh UI has no operating records or send claim", () => {
  assert.equal(templateFilename({ ...authored, name: "../../Owner / message" }, "eml"), "owner-message.eml");
  const html = renderToStaticMarkup(<EmailTemplateWorkspace epoch={0} />);
  assert.match(html, /Your work stays in this tab/);
  assert.match(html, /not saved to your account/);
  assert.match(html, /does not send email/);
  assert.match(html, /disabled="">Download email draft/);
  assert.doesNotMatch(html, /Isolated recipient|Isolated property|mailto:|<iframe|<script|Send email<|Saved successfully/);
});
test("actual browser download helper creates and removes its anchor and revokes bytes even on a blocked click", () => {
  const saved = { document: globalThis.document, create: URL.createObjectURL, revoke: URL.revokeObjectURL, timer: globalThis.setTimeout };
  const events: string[] = []; let revoke: (() => void) | undefined;
  const anchor = { href: "", download: "", click() { events.push("click"); throw new Error("blocked download"); }, remove() { events.push("remove"); } };
  try {
    globalThis.document = { createElement: () => anchor, body: { appendChild: () => events.push("append") } } as any;
    URL.createObjectURL = (blob: Blob) => { assert.equal(blob.type, "message/rfc822"); return "blob:isolated"; };
    URL.revokeObjectURL = url => { assert.equal(url, "blob:isolated"); events.push("revoke"); };
    globalThis.setTimeout = ((callback: () => void) => { revoke = callback; return 0; }) as any;
    assert.throws(() => downloadDraftFile("draft bytes", "message.eml", "message/rfc822"), /blocked download/);
    assert.equal(anchor.href, "blob:isolated"); assert.equal(anchor.download, "message.eml"); revoke!();
    assert.deepEqual(events, ["append", "click", "remove", "revoke"]);
  } finally { globalThis.document = saved.document; URL.createObjectURL = saved.create; URL.revokeObjectURL = saved.revoke; globalThis.setTimeout = saved.timer; }
});
