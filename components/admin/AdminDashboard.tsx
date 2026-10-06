"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDashed,
  House,
  LayoutDashboard,
  LogOut,
  Mail,
  Plus,
  Search,
  Upload,
  UsersRound,
  X,
} from "lucide-react";
import { CsvImport } from "./CsvImport";
import {
  DeleteConfirmation,
  GuestForm,
  HouseholdForm,
  RsvpForm,
} from "./AdminForms";
import { GuestTable } from "./GuestTable";
import { HouseholdCards } from "./HouseholdCards";
import {
  AdminApiError,
  adminRequest,
  formatDate,
  guestName,
  type AdminData,
  type AdminGuest,
  type AdminHousehold,
  type AdminView,
  type GuestFilter,
} from "./types";

type DialogState =
  | { kind: "household"; household?: AdminHousehold }
  | { kind: "guest"; guest?: AdminGuest; householdId?: string }
  | { kind: "rsvp"; guest: AdminGuest }
  | { kind: "delete-household"; household: AdminHousehold }
  | { kind: "delete-guest"; guest: AdminGuest }
  | null;

const navigation = [
  { view: "overview", label: "Overview", icon: LayoutDashboard },
  { view: "guests", label: "Guest list", icon: UsersRound },
  { view: "households", label: "Households", icon: House },
  { view: "unanswered", label: "Unanswered", icon: Mail },
  { view: "import", label: "Import guests", icon: Upload },
] as const;
const viewTitles: Record<AdminView, { title: string; description: string }> = {
  overview: {
    title: "The celebration, at a glance.",
    description: "Every invitation. Every response. All coming together.",
  },
  guests: {
    title: "Your people.",
    description:
      "Manage invited adults, plus-one permissions, and individual responses.",
  },
  households: {
    title: "Every invitation.",
    description: "Keep guests and contact details together by household.",
  },
  unanswered: {
    title: "A few replies to come.",
    description: "Households where no invited guest has responded yet.",
  },
  import: {
    title: "A seat at the celebration.",
    description:
      "Upload, review, and confirm your guest list in a few considered steps.",
  },
};

export function AdminDashboard({
  data,
  onRefresh,
  onSessionExpired,
  onLogout,
}: {
  data: AdminData;
  onRefresh: () => Promise<void>;
  onSessionExpired: () => void;
  onLogout: () => Promise<void>;
}) {
  const [view, setView] = useState<AdminView>("overview");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<GuestFilter>("all");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [openedAt] = useState(() => Date.now());
  const guests = useMemo(
    () =>
      data.households.flatMap((household) =>
        household.guests.map((guest) => ({ guest, household })),
      ),
    [data],
  );
  const attending = guests.filter(
    ({ guest }) => guest.rsvp?.attending === true,
  ).length;
  const declined = guests.filter(
    ({ guest }) => guest.rsvp?.attending === false,
  ).length;
  const awaiting = guests.length - attending - declined;
  const unanswered = data.households.filter(
    (household) =>
      household.guests.length > 0 &&
      household.guests.every((guest) => !guest.rsvp),
  );
  const responseRate = guests.length
    ? Math.round(((attending + declined) / guests.length) * 100)
    : 0;
  const days = data.deadline
    ? Math.ceil((new Date(data.deadline).valueOf() - openedAt) / 86400000)
    : null;
  const searchTerm = search.trim().toLocaleLowerCase("en-US");
  const visibleGuests = guests.filter(({ guest, household }) => {
    const matches =
      !searchTerm ||
      `${guestName(guest)} ${household.display_name}`
        .toLocaleLowerCase("en-US")
        .includes(searchTerm);
    return (
      matches &&
      (filter === "all" ||
        (filter === "attending" && guest.rsvp?.attending === true) ||
        (filter === "declined" && guest.rsvp?.attending === false) ||
        (filter === "unanswered" && !guest.rsvp) ||
        (filter === "plus-one" && guest.plus_one_allowed))
    );
  });
  const householdSource = view === "unanswered" ? unanswered : data.households;
  const visibleHouseholds = householdSource.filter(
    (household) =>
      !searchTerm ||
      `${household.display_name} ${household.primary_email || ""} ${household.primary_phone || ""} ${household.guests.map(guestName).join(" ")}`
        .toLocaleLowerCase("en-US")
        .includes(searchTerm),
  );
  const latestGuests = [...guests]
    .sort((a, b) =>
      (b.guest.rsvp?.updated_at || "").localeCompare(
        a.guest.rsvp?.updated_at || "",
      ),
    )
    .slice(0, 8);

  function navigate(next: AdminView, nextFilter: GuestFilter = "all") {
    setView(next);
    setSearch("");
    setFilter(nextFilter);
    setError("");
  }
  async function mutate(
    path: string,
    payload: Record<string, unknown>,
    method = "POST",
    message = "Changes saved.",
  ) {
    try {
      await adminRequest(`/api/admin/${path}`, payload, method);
      await onRefresh();
      setNotice(message);
    } catch (cause) {
      if (
        cause instanceof AdminApiError &&
        (cause.status === 401 || cause.status === 403)
      )
        onSessionExpired();
      throw cause;
    }
  }
  async function exportCsv() {
    setExporting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/export", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          onSessionExpired();
          return;
        }
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Unable to export RSVPs.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `sarah-and-juan-rsvps-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice("Your RSVP export is ready.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to download the export.",
      );
    } finally {
      setExporting(false);
    }
  }
  async function logout() {
    setLoggingOut(true);
    try {
      await onLogout();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign out.");
    } finally {
      setLoggingOut(false);
    }
  }
  const tableActions = {
    onEdit: (guest: AdminGuest) => setDialog({ kind: "guest", guest }),
    onRsvp: (guest: AdminGuest) => setDialog({ kind: "rsvp", guest }),
    onDelete: (guest: AdminGuest) => setDialog({ kind: "delete-guest", guest }),
  };

  return (
    <div className="admin-root admin-shell">
      <aside className="admin-sidebar">
        <Link
          href="/"
          className="admin-brand"
          aria-label="Sarah and Juan wedding website"
        >
          <span className="admin-brand-monogram">
            S<span>&</span>J
          </span>
          <span>
            SARAH AND JUAN<small>WEDDING MANAGEMENT</small>
          </span>
        </Link>
        <div className="admin-sidebar-divider" />
        <p className="admin-sidebar-label">THE DETAILS</p>
        <nav className="admin-navigation" aria-label="Wedding administration">
          {navigation.map(({ view: navView, label, icon: Icon }) => (
            <button
              key={navView}
              onClick={() => navigate(navView)}
              className={view === navView ? "active" : ""}
              aria-current={view === navView ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={1.6} />
              <span>{label}</span>
              {navView === "unanswered" && unanswered.length > 0 && (
                <small>{unanswered.length}</small>
              )}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <div className="admin-wedding-note">
            <span className="admin-eyebrow">THE DAY WE’RE WAITING FOR</span>
            <p>August 27, 2027</p>
            <small>
              Siempre Valle
              <br />
              Valle de Guadalupe, México
            </small>
          </div>
          <Link href="/" className="admin-sidebar-link">
            View wedding website <ArrowUpRight size={16} />
          </Link>
          <button
            className="admin-sidebar-link"
            onClick={logout}
            disabled={loggingOut}
          >
            {loggingOut ? "Signing out…" : "Sign out"}
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <span>
            Sarah and Juan <span className="admin-topbar-separator">/</span>{" "}
            <strong>
              {navigation.find((item) => item.view === view)?.label}
            </strong>
          </span>
          <span className="admin-private-label">
            <span /> PRIVATE WORKSPACE
          </span>
        </header>
        <main className="admin-main">
          <div className="admin-page-heading">
            <div>
              <span className="admin-eyebrow">
                AUGUST 27, 2027 · SIEMPRE VALLE
              </span>
              <h1>{viewTitles[view].title}</h1>
              <p>{viewTitles[view].description}</p>
            </div>
            <div className="admin-page-actions">
              <button
                className="admin-button admin-button-secondary"
                onClick={exportCsv}
                disabled={exporting}
              >
                <ArrowDownToLine size={16} />
                {exporting ? "Exporting…" : "Export RSVPs"}
              </button>
              {view !== "import" && (
                <button
                  className="admin-button admin-button-primary"
                  onClick={() => setDialog({ kind: "household" })}
                >
                  <Plus size={17} /> Add household
                </button>
              )}
            </div>
          </div>
          {notice && (
            <div className="admin-notice" role="status">
              <Check size={16} />
              {notice}
              <button
                className="admin-icon-button"
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {error && (
            <p className="admin-alert admin-alert-error" role="alert">
              {error}
            </p>
          )}
          {view === "overview" && (
            <>
              <div className="admin-stat-grid">
                <button
                  className="admin-stat-card"
                  onClick={() => navigate("households")}
                >
                  <span>
                    Total households
                    <House size={18} />
                  </span>
                  <strong>{data.households.length}</strong>
                  <small>Invitations to celebrate</small>
                </button>
                <button
                  className="admin-stat-card"
                  onClick={() => navigate("guests")}
                >
                  <span>
                    Total invited guests
                    <UsersRound size={18} />
                  </span>
                  <strong>{guests.length}</strong>
                  <small>Includes approved plus ones</small>
                </button>
                <button
                  className="admin-stat-card"
                  onClick={() => navigate("guests", "attending")}
                >
                  <span>
                    Attending
                    <Check size={18} />
                  </span>
                  <strong>{attending}</strong>
                  <small>Ready to celebrate</small>
                </button>
                <button
                  className="admin-stat-card"
                  onClick={() => navigate("guests", "declined")}
                >
                  <span>
                    Declined
                    <X size={18} />
                  </span>
                  <strong>{declined}</strong>
                  <small>There in spirit</small>
                </button>
                <button
                  className="admin-stat-card"
                  onClick={() => navigate("guests", "unanswered")}
                >
                  <span>
                    Awaiting response
                    <CircleDashed size={18} />
                  </span>
                  <strong>{awaiting}</strong>
                  <small>Individual guest responses</small>
                </button>
                <button
                  className="admin-stat-card admin-stat-featured"
                  onClick={() => navigate("guests", "attending")}
                >
                  <span>
                    Expected headcount
                    <UsersRound size={18} />
                  </span>
                  <strong>{attending}</strong>
                  <small>Confirmed attending adults</small>
                </button>
                <button
                  className="admin-stat-card"
                  onClick={() => navigate("unanswered")}
                >
                  <span>
                    Unanswered households
                    <Mail size={18} />
                  </span>
                  <strong>{unanswered.length}</strong>
                  <small>No guest response yet</small>
                </button>
              </div>
              <div className="admin-overview-row">
                <section className="admin-panel admin-response-panel">
                  <div className="admin-panel-heading">
                    <div>
                      <h2>Little by little, together.</h2>
                      <p>Your RSVP progress</p>
                    </div>
                    <strong className="admin-response-percent">
                      {responseRate}
                      <span>%</span>
                    </strong>
                  </div>
                  <div
                    className="admin-progress"
                    role="progressbar"
                    aria-label="Guests who have responded"
                    aria-valuenow={responseRate}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span
                      className="admin-progress-attending"
                      style={{
                        width: `${guests.length ? (attending / guests.length) * 100 : 0}%`,
                      }}
                    />
                    <span
                      className="admin-progress-declined"
                      style={{
                        width: `${guests.length ? (declined / guests.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="admin-progress-legend">
                    <span>
                      <i className="attending" />
                      {attending} attending
                    </span>
                    <span>
                      <i className="declined" />
                      {declined} declined
                    </span>
                    <span>
                      <i />
                      {awaiting} awaiting
                    </span>
                  </div>
                </section>
                <section className="admin-panel admin-deadline-panel">
                  <CalendarDays size={24} strokeWidth={1.3} />
                  <div>
                    <span className="admin-eyebrow">RSVP DEADLINE</span>
                    <h2>
                      {data.deadline
                        ? formatDate(data.deadline)
                        : "To be decided"}
                    </h2>
                    <p>
                      {days === null
                        ? "Set the deadline in wedding configuration when you’re ready."
                        : days < 0
                          ? "Guest editing is closed. You can still update responses here."
                          : `${days} ${days === 1 ? "day" : "days"} for guests to respond.`}
                    </p>
                  </div>
                </section>
              </div>
              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <h2>Your guest list</h2>
                    <p>
                      {guests.length
                        ? "Most recent responses first"
                        : "The beginning of a beautiful gathering"}
                    </p>
                  </div>
                  <button
                    className="admin-text-button"
                    onClick={() => navigate("guests")}
                  >
                    View all guests <ChevronRight size={16} />
                  </button>
                </div>
                <GuestTable guests={latestGuests} {...tableActions} />
              </section>
            </>
          )}
          {(view === "guests" ||
            view === "households" ||
            view === "unanswered") && (
            <>
              {view === "unanswered" && (
                <div className="admin-info-banner">
                  <Bell size={18} />
                  <p>
                    {days === null
                      ? "The RSVP deadline has not been set."
                      : days < 0
                        ? "The RSVP deadline has passed."
                        : `${days} ${days === 1 ? "day" : "days"} until the RSVP deadline.`}{" "}
                    Contact details are available below. No reminders are sent
                    automatically.
                  </p>
                </div>
              )}
              <div className="admin-list-toolbar">
                <label className="admin-search">
                  <Search size={17} />
                  <span className="admin-sr-only">
                    Search {view === "guests" ? "guests" : "households"}
                  </span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={
                      view === "guests"
                        ? "Search guests or households…"
                        : "Search names or contact details…"
                    }
                  />
                </label>
                {view === "guests" && (
                  <button
                    className="admin-button admin-button-secondary"
                    disabled={data.households.length === 0}
                    onClick={() => setDialog({ kind: "guest" })}
                  >
                    <Plus size={16} /> Add adult
                  </button>
                )}
              </div>
              {view === "guests" ? (
                <section className="admin-panel">
                  <div className="admin-filter-bar" aria-label="Filter guests">
                    {(
                      [
                        { value: "all", label: "All guests" },
                        { value: "attending", label: "Attending" },
                        { value: "declined", label: "Declined" },
                        { value: "unanswered", label: "No response" },
                        { value: "plus-one", label: "Plus one allowed" },
                      ] as { value: GuestFilter; label: string }[]
                    ).map((item) => (
                      <button
                        key={item.value}
                        onClick={() => setFilter(item.value)}
                        className={filter === item.value ? "active" : ""}
                        aria-pressed={filter === item.value}
                      >
                        {item.label}
                      </button>
                    ))}
                    <span>{visibleGuests.length} guests</span>
                  </div>
                  <GuestTable guests={visibleGuests} {...tableActions} />
                </section>
              ) : (
                <HouseholdCards
                  households={visibleHouseholds}
                  daysUntilDeadline={days}
                  unanswered={view === "unanswered"}
                  onEdit={(household) =>
                    setDialog({ kind: "household", household })
                  }
                  onAddGuest={(householdId) =>
                    setDialog({ kind: "guest", householdId })
                  }
                  onDelete={(household) =>
                    setDialog({ kind: "delete-household", household })
                  }
                  onRsvp={(guest) => setDialog({ kind: "rsvp", guest })}
                />
              )}
            </>
          )}
          {view === "import" && <CsvImport onImported={onRefresh} />}
          <footer className="admin-workspace-footer">
            <span>Made for Sarah and Juan.</span>
            <span>AUGUST 27, 2027</span>
          </footer>
        </main>
      </div>
      {dialog?.kind === "household" && (
        <HouseholdForm
          household={dialog.household}
          onClose={() => setDialog(null)}
          onSave={(payload) =>
            mutate(
              "households",
              payload,
              dialog.household ? "PATCH" : "POST",
              dialog.household
                ? "Household updated."
                : "Household created. You can now add invited adults.",
            )
          }
        />
      )}
      {dialog?.kind === "guest" && (
        <GuestForm
          guest={dialog.guest}
          households={data.households}
          householdId={dialog.householdId}
          onClose={() => setDialog(null)}
          onSave={(payload) =>
            mutate(
              "guests",
              payload,
              dialog.guest ? "PATCH" : "POST",
              "Guest saved.",
            )
          }
        />
      )}
      {dialog?.kind === "rsvp" && (
        <RsvpForm
          guest={dialog.guest}
          onClose={() => setDialog(null)}
          onSave={(payload) =>
            mutate("rsvps", payload, "POST", "RSVP updated.")
          }
        />
      )}
      {dialog?.kind === "delete-household" && (
        <DeleteConfirmation
          title="Delete this household?"
          description={`Remove ${dialog.household.display_name} and all ${dialog.household.guests.length} invited guests?`}
          onClose={() => setDialog(null)}
          onDelete={() =>
            mutate(
              "households",
              { id: dialog.household.id },
              "DELETE",
              "Household deleted.",
            )
          }
        />
      )}
      {dialog?.kind === "delete-guest" && (
        <DeleteConfirmation
          title="Remove this guest?"
          description={`Remove ${guestName(dialog.guest)}${dialog.guest.plus_one_allowed ? " and their approved plus one" : ""} from the guest list?`}
          onClose={() => setDialog(null)}
          onDelete={() =>
            mutate(
              "guests",
              { id: dialog.guest.id },
              "DELETE",
              "Guest removed.",
            )
          }
        />
      )}
    </div>
  );
}
