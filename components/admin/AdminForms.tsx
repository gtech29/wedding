"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { AdminDialog } from "./AdminDialog";
import { guestName, type AdminGuest, type AdminHousehold } from "./types";

type Save = (payload: Record<string, unknown>) => Promise<void>;

function FormActions({
  busy,
  onClose,
  label = "Save changes",
}: {
  busy: boolean;
  onClose: () => void;
  label?: string;
}) {
  return (
    <div className="admin-form-actions">
      <button
        type="button"
        className="admin-button admin-button-secondary"
        onClick={onClose}
        disabled={busy}
      >
        Cancel
      </button>
      <button
        className="admin-button admin-button-primary"
        type="submit"
        disabled={busy}
      >
        {busy ? "Saving…" : label}
      </button>
    </div>
  );
}

function ManagedForm({
  title,
  onClose,
  onSave,
  children,
  values,
  submitLabel,
}: {
  title: string;
  onClose: () => void;
  onSave: Save;
  children: ReactNode;
  values: (data: FormData) => Record<string, unknown>;
  submitLabel?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave(values(new FormData(event.currentTarget)));
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminDialog title={title} onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="admin-form">
        <fieldset disabled={busy}>{children}</fieldset>
        {error && (
          <p className="admin-alert admin-alert-error" role="alert">
            {error}
          </p>
        )}
        <FormActions busy={busy} onClose={onClose} label={submitLabel} />
      </form>
    </AdminDialog>
  );
}

export function HouseholdForm({
  household,
  onClose,
  onSave,
}: {
  household?: AdminHousehold;
  onClose: () => void;
  onSave: Save;
}) {
  return (
    <ManagedForm
      title={household ? "Edit household" : "A new invitation"}
      onClose={onClose}
      onSave={onSave}
      submitLabel={household ? "Save household" : "Create household"}
      values={(data) => ({
        ...(household ? { id: household.id } : {}),
        displayName: String(data.get("displayName")).trim(),
        primaryEmail: String(data.get("primaryEmail")).trim(),
        primaryPhone: String(data.get("primaryPhone")).trim(),
      })}
    >
      <p className="admin-muted">
        Keep the adults sharing an invitation together, with one set of contact
        details.
      </p>
      <label htmlFor="household-name">Household name</label>
      <input
        id="household-name"
        name="displayName"
        defaultValue={household?.display_name}
        placeholder="e.g. Garcia household"
        maxLength={150}
        required
        autoFocus
      />
      <label htmlFor="household-email">
        Email <span>optional</span>
      </label>
      <input
        id="household-email"
        name="primaryEmail"
        type="email"
        defaultValue={household?.primary_email || ""}
        maxLength={254}
        autoComplete="off"
      />
      <label htmlFor="household-phone">
        Phone <span>optional</span>
      </label>
      <input
        id="household-phone"
        name="primaryPhone"
        type="tel"
        defaultValue={household?.primary_phone || ""}
        placeholder="Include country code, e.g. +52"
        maxLength={30}
        autoComplete="off"
      />
      <p className="admin-field-note">
        Stored contact information can help verify guests who share an exact
        name.
      </p>
    </ManagedForm>
  );
}

export function GuestForm({
  guest,
  households,
  householdId,
  onClose,
  onSave,
}: {
  guest?: AdminGuest;
  households: AdminHousehold[];
  householdId?: string;
  onClose: () => void;
  onSave: Save;
}) {
  return (
    <ManagedForm
      title={
        guest
          ? guest.is_plus_one
            ? "Name approved plus one"
            : "Edit invited guest"
          : "Add an invited adult"
      }
      onClose={onClose}
      onSave={onSave}
      submitLabel={guest ? "Save guest" : "Add guest"}
      values={(data) => ({
        ...(guest ? { id: guest.id } : {}),
        firstName: String(data.get("firstName")).trim(),
        lastName: String(data.get("lastName")).trim(),
        householdId: guest?.is_plus_one
          ? guest.household_id
          : String(data.get("householdId")),
        plusOneAllowed: guest?.is_plus_one
          ? false
          : data.get("plusOneAllowed") === "on",
        adultConfirmed: data.get("adultConfirmed") === "on",
      })}
    >
      <p className="admin-muted">
        Guests find their invitation using the exact first and last names saved
        here.
      </p>
      <div className="admin-form-columns">
        <div>
          <label htmlFor="guest-first-name">First name</label>
          <input
            id="guest-first-name"
            name="firstName"
            defaultValue={guest?.first_name}
            maxLength={100}
            autoComplete="off"
            required
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="guest-last-name">Last name</label>
          <input
            id="guest-last-name"
            name="lastName"
            defaultValue={guest?.last_name}
            maxLength={100}
            autoComplete="off"
            required
          />
        </div>
      </div>
      {!guest?.is_plus_one && (
        <>
          <label htmlFor="guest-household">Household</label>
          <select
            id="guest-household"
            name="householdId"
            defaultValue={
              guest?.household_id || householdId || households[0]?.id
            }
            required
          >
            {households.map((household) => (
              <option key={household.id} value={household.id}>
                {household.display_name}
              </option>
            ))}
          </select>
          {guest && (
            <p className="admin-field-note">
              Changing the household moves this guest and their approved plus
              one together.
            </p>
          )}
          <label className="admin-checkbox">
            <input
              name="plusOneAllowed"
              type="checkbox"
              defaultChecked={guest?.plus_one_allowed}
            />
            <span>
              Allow one adult plus one
              <small>
                This reserves one additional invitation. Removing permission
                also removes that plus one and their response.
              </small>
            </span>
          </label>
        </>
      )}
      {guest?.is_plus_one && (
        <p className="admin-field-note">
          This invitation belongs to an approved plus-one slot. Household and
          permission are managed through the inviting guest.
        </p>
      )}
      <label className="admin-checkbox">
        <input
          name="adultConfirmed"
          type="checkbox"
          required
          defaultChecked={guest?.adult_confirmed}
        />
        <span>
          I confirm this invited guest is an adult.
          <small>Sarah and Juan’s wedding is strictly adults-only.</small>
        </span>
      </label>
    </ManagedForm>
  );
}

export function RsvpForm({
  guest,
  onClose,
  onSave,
}: {
  guest: AdminGuest;
  onClose: () => void;
  onSave: Save;
}) {
  return (
    <ManagedForm
      title="Update RSVP"
      onClose={onClose}
      onSave={onSave}
      submitLabel="Save RSVP"
      values={(data) => ({
        guestId: guest.id,
        attending: data.get("attending") === "yes",
        dietaryRestrictions: String(data.get("dietaryRestrictions")).trim(),
      })}
    >
      <p className="admin-form-guest">{guestName(guest)}</p>
      <p className="admin-muted">
        Record or correct this guest’s response. Administrators can make changes
        after the RSVP deadline.
      </p>
      <label htmlFor="rsvp-attending">Attendance</label>
      <select
        id="rsvp-attending"
        name="attending"
        defaultValue={guest.rsvp ? (guest.rsvp.attending ? "yes" : "no") : ""}
        required
        autoFocus
      >
        <option value="" disabled>
          Select a response
        </option>
        <option value="yes">Attending</option>
        <option value="no">Declined</option>
      </select>
      <label htmlFor="rsvp-dietary">
        Dietary restrictions <span>optional</span>
      </label>
      <textarea
        id="rsvp-dietary"
        name="dietaryRestrictions"
        rows={4}
        defaultValue={guest.rsvp?.dietary_restrictions || ""}
        maxLength={1000}
        placeholder="Dietary restrictions or allergies"
      />
      {guest.is_plus_one && !guest.first_name && (
        <p className="admin-alert">
          Name this approved plus one before recording an attending response.
        </p>
      )}
      {guest.plus_one_allowed && (
        <p className="admin-field-note">
          Declining this guest also marks their approved plus one as unable to
          attend.
        </p>
      )}
    </ManagedForm>
  );
}

export function DeleteConfirmation({
  title,
  description,
  onClose,
  onDelete,
}: {
  title: string;
  description: string;
  onClose: () => void;
  onDelete: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await onDelete();
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to delete. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminDialog title={title} onClose={onClose} busy={busy}>
      <div className="admin-delete-copy">
        <AlertTriangle size={25} />
        <p>{description}</p>
        <p className="admin-muted">
          This permanently removes the record and its related RSVP information.
        </p>
      </div>
      {error && (
        <p role="alert" className="admin-alert admin-alert-error">
          {error}
        </p>
      )}
      <div className="admin-form-actions">
        <button
          className="admin-button admin-button-secondary"
          onClick={onClose}
          disabled={busy}
        >
          Cancel
        </button>
        <button
          className="admin-button admin-button-danger"
          onClick={remove}
          disabled={busy}
        >
          {busy ? "Deleting…" : "Delete permanently"}
        </button>
      </div>
    </AdminDialog>
  );
}
