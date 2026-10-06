"use client";

import { ClipboardCheck, Pencil, Trash2, UsersRound } from "lucide-react";
import {
  formatDate,
  guestName,
  type AdminGuest,
  type AdminHousehold,
} from "./types";

export function AttendanceBadge({ guest }: { guest: AdminGuest }) {
  const status = guest.rsvp
    ? guest.rsvp.attending
      ? "attending"
      : "declined"
    : "awaiting";
  return (
    <span className={`admin-badge admin-badge-${status}`}>
      <span aria-hidden="true" />
      {status === "awaiting"
        ? "Awaiting response"
        : status === "attending"
          ? "Attending"
          : "Declined"}
    </span>
  );
}

export function GuestTable({
  guests,
  onEdit,
  onRsvp,
  onDelete,
}: {
  guests: { guest: AdminGuest; household: AdminHousehold }[];
  onEdit: (guest: AdminGuest) => void;
  onRsvp: (guest: AdminGuest) => void;
  onDelete: (guest: AdminGuest) => void;
}) {
  if (!guests.length)
    return (
      <div className="admin-empty">
        <UsersRound size={28} />
        <h3>No guests to show</h3>
        <p>
          Add your first household and invited adults, or adjust your search.
        </p>
      </div>
    );
  return (
    <div
      className="admin-table-scroll"
      role="region"
      aria-label="Invited guests"
      tabIndex={0}
    >
      <table className="admin-table">
        <thead>
          <tr>
            <th scope="col">Guest</th>
            <th scope="col">Household</th>
            <th scope="col">Response</th>
            <th scope="col">Dietary restrictions</th>
            <th scope="col">Last RSVP update</th>
            <th scope="col">
              <span className="admin-sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {guests.map(({ guest, household }) => (
            <tr key={guest.id}>
              <td>
                <span className="admin-guest-name">{guestName(guest)}</span>
                {(guest.is_plus_one || guest.plus_one_allowed) && (
                  <span className="admin-cell-note">
                    {guest.is_plus_one
                      ? "Approved plus one"
                      : "Plus one allowed"}
                  </span>
                )}
              </td>
              <td>{household.display_name}</td>
              <td>
                <AttendanceBadge guest={guest} />
              </td>
              <td className="admin-dietary-cell">
                {guest.rsvp?.dietary_restrictions || (
                  <span className="admin-muted">—</span>
                )}
              </td>
              <td className="admin-date-cell">
                {formatDate(guest.rsvp?.updated_at)}
              </td>
              <td>
                <div className="admin-row-actions">
                  <button
                    className="admin-icon-button"
                    onClick={() => onRsvp(guest)}
                    title={`Update RSVP for ${guestName(guest)}`}
                    aria-label={`Update RSVP for ${guestName(guest)}`}
                  >
                    <ClipboardCheck size={17} />
                  </button>
                  <button
                    className="admin-icon-button"
                    onClick={() => onEdit(guest)}
                    title={`Edit ${guestName(guest)}`}
                    aria-label={`Edit ${guestName(guest)}`}
                  >
                    <Pencil size={16} />
                  </button>
                  {!guest.is_plus_one && (
                    <button
                      className="admin-icon-button admin-icon-danger"
                      onClick={() => onDelete(guest)}
                      title={`Remove ${guestName(guest)}`}
                      aria-label={`Remove ${guestName(guest)}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
