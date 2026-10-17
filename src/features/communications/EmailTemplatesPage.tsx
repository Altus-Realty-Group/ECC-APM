import React, { useRef, useState } from "react";
import { getSessionEpoch, useSessionEpoch } from "@/lib/sessionScope";
import { MERGE_FIELDS, MAX_TEMPLATE_BYTES, blankTemplate, blankValues, parseTemplate, previewTemplate, templateJson, emailDraft, templateFilename, downloadDraftFile, type EmailTemplate, type MergeKey } from "./emailDraft";
import "./emailTemplates.css";

export function EmailTemplateWorkspace({ epoch }: { epoch: number }) {
  const [template, setTemplate] = useState(blankTemplate);
  const [values, setValues] = useState(blankValues);
  const [recipient, setRecipient] = useState("");
  const [pending, setPending] = useState<EmailTemplate | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const readNumber = useRef(0);
  let templateError = "";
  let preview: ReturnType<typeof previewTemplate>;
  try { preview = previewTemplate(template, values); }
  catch (failure) { templateError = failure instanceof Error ? failure.message : "Check the template values."; preview = { subject: template.subject, body: template.body, used: [], unresolved: [] }; }
  const edited = !!(template.name || template.subject || template.body || recipient || Object.values(values).some(Boolean));
  function change(field: "name" | "subject" | "body", text: string) { setTemplate(current => ({ ...current, [field]: text })); setMessage(""); setError(""); }
  function replace(next: EmailTemplate) {
    readNumber.current++; setReading(false); setTemplate(next); setValues(blankValues()); setRecipient(""); setPending(null); setMessage(""); setError("");
  }
  async function importFile(file?: File) {
    if (!file) return;
    const request = ++readNumber.current; setReading(true); setError(""); setMessage("");
    try {
      if (file.size > MAX_TEMPLATE_BYTES) throw new Error("Choose a template file smaller than 64 KB.");
      const next = parseTemplate(await file.text());
      if (getSessionEpoch() !== epoch || request !== readNumber.current) return;
      // Deliberate replacement is required even if the user typed while the file was reading.
      setPending(next);
    } catch (failure) {
      if (getSessionEpoch() === epoch && request === readNumber.current) setError(failure instanceof Error ? failure.message : "The template file could not be opened.");
    } finally { if (getSessionEpoch() === epoch && request === readNumber.current) setReading(false); }
  }
  function download(kind: "template" | "email") {
    if (getSessionEpoch() !== epoch) return;
    setMessage(""); setError("");
    try {
      const text = kind === "template" ? templateJson(template) : emailDraft(template, values, recipient);
      if (getSessionEpoch() !== epoch) return;
      downloadDraftFile(text, templateFilename(template, kind === "template" ? "json" : "eml"), kind === "template" ? "application/json;charset=utf-8" : "message/rfc822");
      setMessage(kind === "template" ? "Template download started. Keep the file to reuse this wording." : "Email draft download started. Review the recipient and message in your email app before sending. Nothing was sent by ECC.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The download could not be started."); }
  }
  function insertField(key: MergeKey) { change("body", template.body + `{{${key}}}`); }
  return <section className="ecc-email" aria-labelledby="email-title">
    <header><p className="ecc-email-eyebrow">Communication</p><h1 id="email-title">Email templates</h1><p>Write reusable wording, complete the message fields and download an email draft for review.</p></header>
    <aside className="ecc-email-scope"><strong>Your work stays in this tab.</strong><p>Download the template before leaving. Templates are not saved to your account. ECC does not send email from this page.</p></aside>
    <div className="ecc-email-toolbar"><label className="ecc-email-import">Open template file<input type="file" accept=".json,application/json" disabled={reading} onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void importFile(file); }} /></label>
      <button type="button" disabled={reading} onClick={() => { if (edited) setPending(blankTemplate()); else replace(blankTemplate()); }}>New blank template</button>
      <button type="button" onClick={() => download("template")}>Download template</button></div>
    {reading && <p role="status">Opening template file…</p>}
    {pending && <section className="ecc-email-replace" aria-label="Replace current draft"><h2>Replace the current draft?</h2><p>Download your current template first if you want to keep it. Preview values and the recipient will be cleared.</p>
      <button type="button" onClick={() => replace(pending)}>Replace current draft</button><button type="button" onClick={() => setPending(null)}>Keep editing</button></section>}
    {(error || templateError) && <p className="ecc-email-error" role="alert">{error || templateError}</p>}
    {message && <p role="status">{message}</p>}
    <div className="ecc-email-columns"><section className="ecc-email-editor" aria-label="Template editor"><h2>1. Write your template</h2>
      <label htmlFor="email-template-name">Template name</label><input id="email-template-name" maxLength={100} value={template.name} onChange={event => change("name", event.target.value)} />
      <label htmlFor="email-subject">Subject</label><input id="email-subject" maxLength={250} value={template.subject} onChange={event => change("subject", event.target.value)} />
      <label htmlFor="email-body">Message</label><textarea id="email-body" maxLength={20000} rows={10} value={template.body} onChange={event => change("body", event.target.value)} />
      <fieldset><legend>Insert a reusable message field</legend><p>Each button adds a field to the end of your message. You can also place these fields in the subject.</p><div className="ecc-email-fields">{MERGE_FIELDS.map(field => <button type="button" key={field.key} onClick={() => insertField(field.key)}>{field.label}</button>)}</div></fieldset>
    </section><section className="ecc-email-completion" aria-label="Complete email draft"><h2>2. Complete this message</h2><p>Enter the actual values for this email. These values are not included in your reusable template file.</p>
      <label htmlFor="email-recipient">Recipient email</label><input id="email-recipient" type="email" autoComplete="off" maxLength={254} value={recipient} onChange={event => { setRecipient(event.target.value); setMessage(""); }} />
      {MERGE_FIELDS.filter(field => preview.used.includes(field.key)).map(field => <React.Fragment key={field.key}><label htmlFor={`email-value-${field.key}`}>{field.label}</label><input id={`email-value-${field.key}`} maxLength={500} value={values[field.key]} onChange={event => { setValues(current => ({ ...current, [field.key]: event.target.value })); setMessage(""); }} /></React.Fragment>)}
      <div className="ecc-email-preview"><h3>Message preview</h3><p className="ecc-email-preview-subject"><strong>Subject: </strong>{preview.subject || "No subject entered"}</p><div className="ecc-email-preview-body">{preview.body || "Your message preview will appear here."}</div></div>
      {preview.unresolved.length > 0 && <p className="ecc-email-missing" role="status">Complete or remove these fields: {preview.unresolved.join(", ")}.</p>}
      <button type="button" className="ecc-email-primary" disabled={!!templateError || preview.unresolved.length > 0 || !preview.subject.trim() || !preview.body.trim() || !recipient.trim()} onClick={() => download("email")}>Download email draft</button><p>Open the downloaded draft in your email app. Confirm the sender, recipient and final wording before sending.</p>
    </section></div>
  </section>;
}
export default function EmailTemplatesPage() {
  const epoch = useSessionEpoch();
  return <EmailTemplateWorkspace key={epoch} epoch={epoch} />;
}
