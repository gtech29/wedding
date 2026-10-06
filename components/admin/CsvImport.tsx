"use client";

import { useRef, useState } from "react";
import { Check, CheckCircle2, Download, FileUp, Upload } from "lucide-react";
import { adminRequest } from "./types";

interface ImportRow {
  firstName: string;
  lastName: string;
  household: string;
  email: string;
  phone: string;
  plusOneAllowed: boolean;
}
interface ImportPreview {
  rows: ImportRow[];
  errors: { row: number; message: string }[];
  warnings: { row: number; message: string }[];
  valid: boolean;
}

function downloadTemplate() {
  const url = URL.createObjectURL(
    new Blob(
      ["First Name,Last Name,Household,Email,Phone,Plus One Allowed\r\n"],
      { type: "text/csv;charset=utf-8" },
    ),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "sarah-and-juan-guest-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function CsvImport({ onImported }: { onImported: () => Promise<void> }) {
  const input = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState("");
  const [filename, setFilename] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [warningsAccepted, setWarningsAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  function changeCsv(value: string) {
    setCsv(value);
    setPreview(null);
    setAdultConfirmed(false);
    setWarningsAccepted(false);
    setSuccess("");
    setError("");
  }
  async function selectFile(file?: File) {
    if (!file) return;
    changeCsv("");
    setFilename(file.name);
    if (file.size > 1_000_000) {
      setError(
        "Choose a CSV file smaller than 1 MB. Split larger guest lists into smaller files.",
      );
      return;
    }
    try {
      const value = await file.text();
      changeCsv(value);
    } catch {
      setError("This file could not be read. Please choose it again.");
    }
  }
  async function validate() {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = await adminRequest<ImportPreview>("/api/admin/import", {
        csv,
        confirm: false,
      });
      setPreview(result);
      setAdultConfirmed(false);
      setWarningsAccepted(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to validate this file.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (
      !preview?.valid ||
      !adultConfirmed ||
      (preview.warnings.length > 0 && !warningsAccepted)
    )
      return;
    setBusy(true);
    setError("");
    try {
      const result = await adminRequest<{ ok: boolean; imported: number }>(
        "/api/admin/import",
        { csv, confirm: true, adultConfirmed: true },
      );
      setSuccess(
        `${result.imported} ${result.imported === 1 ? "guest" : "guests"} imported successfully.`,
      );
      setCsv("");
      setPreview(null);
      setFilename("");
      setAdultConfirmed(false);
      setWarningsAccepted(false);
      if (input.current) input.current.value = "";
      await onImported();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to import. Please review the file and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-import">
      <div className="admin-import-steps" aria-label="Import progress">
        {["Upload", "Validate & preview", "Confirm import"].map(
          (label, index) => (
            <div
              key={label}
              className={
                index === 0 ||
                (index === 1 && preview) ||
                (index === 2 && success)
                  ? "active"
                  : ""
              }
            >
              <span>
                {(index === 0 && preview) || (success && index < 2) ? (
                  <Check size={14} />
                ) : (
                  index + 1
                )}
              </span>
              {label}
            </div>
          ),
        )}
      </div>
      <section className="admin-panel admin-import-upload">
        <div className="admin-panel-heading">
          <div>
            <h2>Bring everyone together.</h2>
            <p>Import your invited adults from a CSV file.</p>
          </div>
          <button
            type="button"
            className="admin-button admin-button-secondary"
            onClick={downloadTemplate}
          >
            <Download size={15} /> Get template
          </button>
        </div>
        <p className="admin-field-note">
          Include all six columns: First Name, Last Name, Household, Email,
          Phone, Plus One Allowed (true or false). Email, Phone, and Plus One
          Allowed values may be blank. Use a consistent household name to group
          guests. Maximum 2,000 guests per import.
        </p>
        <label className="admin-file-picker" htmlFor="guest-csv">
          <FileUp size={28} />
          <strong>{filename || "Choose your guest list"}</strong>
          <span>CSV file · up to 1 MB</span>
          <input
            ref={input}
            id="guest-csv"
            type="file"
            accept=".csv,text/csv"
            disabled={busy}
            onChange={(event) => {
              void selectFile(event.target.files?.[0]);
            }}
          />
        </label>
        <details className="admin-paste-details">
          <summary>Or paste CSV content</summary>
          <label className="admin-sr-only" htmlFor="csv-content">
            Guest list CSV content
          </label>
          <textarea
            id="csv-content"
            rows={6}
            value={csv}
            onChange={(event) => {
              changeCsv(event.target.value);
              setFilename("Pasted CSV");
            }}
            disabled={busy}
            placeholder="First Name,Last Name,Household,Email,Phone,Plus One Allowed"
            maxLength={1_000_000}
            spellCheck={false}
          />
        </details>
        <div className="admin-import-actions">
          <p>No invitations are changed until you confirm the import.</p>
          <button
            className="admin-button admin-button-primary"
            onClick={validate}
            disabled={busy || !csv.trim()}
          >
            <Upload size={16} />
            {busy ? "Please wait…" : "Validate & preview"}
          </button>
        </div>
      </section>
      {error && (
        <p className="admin-alert admin-alert-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="admin-alert admin-alert-success" role="status">
          <CheckCircle2 size={18} />
          {success}
        </p>
      )}
      {preview && (
        <section
          className="admin-panel admin-import-preview"
          aria-label="CSV preview"
        >
          <div className="admin-panel-heading">
            <div>
              <h2>Review your guest list</h2>
              <p>
                {preview.rows.length} rows parsed · {preview.errors.length}{" "}
                errors · {preview.warnings.length} warnings
              </p>
            </div>
            <span
              className={`admin-badge ${preview.valid ? "admin-badge-attending" : "admin-badge-declined"}`}
            >
              {preview.valid ? "Ready for review" : "Changes needed"}
            </span>
          </div>
          {preview.errors.length > 0 && (
            <div className="admin-alert admin-alert-error" role="alert">
              <strong>Fix these issues and validate again.</strong>
              <ul>
                {preview.errors.map((issue, index) => (
                  <li key={`${issue.row}-${index}`}>
                    Row {issue.row}: {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {preview.warnings.length > 0 && (
            <div className="admin-alert">
              <strong>Please review before importing.</strong>
              <ul>
                {preview.warnings.map((issue, index) => (
                  <li key={`${issue.row}-${index}`}>
                    Row {issue.row}: {issue.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {preview.rows.length > 0 && (
            <div
              className="admin-table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Import rows"
            >
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Guest</th>
                    <th>Household</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Plus one allowed</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 100).map((row, index) => (
                    <tr key={index}>
                      <td>
                        {row.firstName} {row.lastName}
                      </td>
                      <td>{row.household}</td>
                      <td>{row.email || "—"}</td>
                      <td>{row.phone || "—"}</td>
                      <td>{row.plusOneAllowed ? "Yes" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {preview.rows.length > 100 && (
            <p className="admin-field-note">
              Showing the first 100 rows. All {preview.rows.length} rows will be
              imported after confirmation.
            </p>
          )}
          {preview.valid && (
            <div className="admin-import-confirm">
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={adultConfirmed}
                  onChange={(event) => setAdultConfirmed(event.target.checked)}
                  disabled={busy}
                />
                <span>
                  I confirm everyone on this guest list is an invited adult.
                  <small>
                    Each approved plus one reserves one additional adult
                    invitation.
                  </small>
                </span>
              </label>
              {preview.warnings.length > 0 && (
                <label className="admin-checkbox">
                  <input
                    type="checkbox"
                    checked={warningsAccepted}
                    onChange={(event) =>
                      setWarningsAccepted(event.target.checked)
                    }
                    disabled={busy}
                  />
                  <span>I have reviewed the warnings above.</span>
                </label>
              )}
              <button
                className="admin-button admin-button-primary"
                onClick={confirm}
                disabled={
                  busy ||
                  !adultConfirmed ||
                  (preview.warnings.length > 0 && !warningsAccepted)
                }
              >
                {busy
                  ? "Importing…"
                  : `Confirm import of ${preview.rows.length} ${preview.rows.length === 1 ? "guest" : "guests"}`}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
