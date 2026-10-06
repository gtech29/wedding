"use client";

import { Mail, Pencil, Phone, Plus, Trash2, House } from "lucide-react";
import { AttendanceBadge } from "./GuestTable";
import { guestName, type AdminGuest, type AdminHousehold } from "./types";

export function HouseholdCards({
  households,
  daysUntilDeadline: days,
  unanswered,
  onEdit,
  onAddGuest,
  onDelete,
  onRsvp,
}: {
  households: AdminHousehold[];
  daysUntilDeadline: number | null;
  unanswered: boolean;
  onEdit: (household: AdminHousehold) => void;
  onAddGuest: (id: string) => void;
  onDelete: (household: AdminHousehold) => void;
  onRsvp: (guest: AdminGuest) => void;
}) {
  if (!households.length)
    return (
      <div className="admin-empty">
        <House size={28} />
        <h3>
          {unanswered
            ? "No unanswered invitations"
            : "A place for every invitation"}
        </h3>
        <p>
          {unanswered
            ? "Households with no responses will appear here."
            : "Create a household, then add the adults on that invitation."}
        </p>
      </div>
    );
  return (
    <div className="admin-household-grid">
      {households.map((household) => (
        <article className="admin-household-card" key={household.id}>
          <div className="admin-household-heading">
            <div>
              <span className="admin-eyebrow">
                {household.guests.length} INVITED{" "}
                {household.guests.length === 1 ? "ADULT" : "ADULTS"}
              </span>
              <h3>{household.display_name}</h3>
            </div>
            <div className="admin-row-actions">
              <button
                className="admin-icon-button"
                onClick={() => onEdit(household)}
                aria-label={`Edit ${household.display_name}`}
                title="Edit household"
              >
                <Pencil size={16} />
              </button>
              <button
                className="admin-icon-button admin-icon-danger"
                onClick={() => onDelete(household)}
                aria-label={`Delete ${household.display_name}`}
                title="Delete household"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <ul className="admin-household-guests">
            {household.guests.map((guest) => (
              <li key={guest.id}>
                <button onClick={() => onRsvp(guest)} title="Update RSVP">
                  {guestName(guest)}
                  {guest.is_plus_one && <small>Plus one</small>}
                </button>
                <AttendanceBadge guest={guest} />
              </li>
            ))}
          </ul>
          <div className="admin-household-contact">
            <p>
              <Mail size={14} />
              {household.primary_email ? (
                <a href={`mailto:${household.primary_email}`}>
                  {household.primary_email}
                </a>
              ) : (
                <span>No email added</span>
              )}
            </p>
            <p>
              <Phone size={14} />
              {household.primary_phone ? (
                <a href={`tel:${household.primary_phone}`}>
                  {household.primary_phone}
                </a>
              ) : (
                <span>No phone added</span>
              )}
            </p>
          </div>
          <div className="admin-household-bottom">
            <button
              className="admin-text-button"
              onClick={() => onAddGuest(household.id)}
            >
              <Plus size={15} /> Add adult
            </button>
            {unanswered && (
              <span className="admin-cell-note">
                {days === null
                  ? "Deadline not set"
                  : days < 0
                    ? "Deadline passed"
                    : `${days} ${days === 1 ? "day" : "days"} until deadline`}
              </span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
