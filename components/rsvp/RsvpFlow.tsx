"use client";
import { useRef, useState } from "react";
import { ArrowUpRight, ArrowLeft, LockKeyhole, Check } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Locale } from "@/lib/i18n/types";
import type { PublicHousehold } from "@/types/database";
import { Monogram } from "@/components/wedding/Monogram";
import { PageIntro } from "@/components/wedding/PageIntro";
type Answer = {
  guestId: string;
  attending: boolean | null;
  dietaryRestrictions: string;
  firstName: string;
  lastName: string;
  adultConfirmed: boolean;
};
type Stage = "lookup" | "verification" | "household" | "confirmation";
export function RsvpFlow({ locale, t }: { locale: Locale; t: Dictionary }) {
  const [stage, setStage] = useState<Stage>("lookup");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [verification, setVerification] = useState("");
  const [household, setHousehold] = useState<PublicHousehold | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [deadline, setDeadline] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState(false);
  const heading = useRef<HTMLDivElement>(null);
  const r = t.rsvp;
  function announce() {
    requestAnimationFrame(() => {
      heading.current?.focus();
      heading.current?.scrollIntoView({ behavior: "instant", block: "start" });
    });
  }
  function errorMessage(code: string) {
    return code === "rate_limited"
      ? r.limited
      : code === "closed"
        ? r.closed
        : code === "expired"
          ? r.expired
          : code === "unavailable"
            ? r.unavailable
            : r.generic;
  }
  async function lookup(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/rsvp/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          ...(stage === "verification" ? { verification } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(errorMessage(data.code));
        return;
      }
      if (data.status === "verified") {
        const invitation = data.household as PublicHousehold;
        setHousehold(invitation);
        setAnswers(
          invitation.guests.map((g) => ({
            guestId: g.id,
            attending: g.rsvp?.attending ?? null,
            dietaryRestrictions: g.rsvp?.dietary_restrictions || "",
            firstName: g.first_name,
            lastName: g.last_name,
            adultConfirmed: false,
          })),
        );
        setDeadline(data.deadline);
        setStage("household");
        announce();
      } else {
        if (stage === "verification") setError(r.generic);
        else {
          setStage("verification");
          announce();
        }
      }
    } catch {
      setError(r.unavailable);
    } finally {
      setBusy(false);
    }
  }
  function update(guestId: string, values: Partial<Answer>) {
    setAnswers((previous) =>
      previous.map((a) => (a.guestId === guestId ? { ...a, ...values } : a)),
    );
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !household) return;
    setError("");
    if (answers.some((a) => a.attending === null)) {
      setError(r.complete);
      return;
    }
    for (const guest of household.guests) {
      const answer = answers.find((a) => a.guestId === guest.id)!;
      if (guest.is_plus_one && answer.attending) {
        if (
          !answer.adultConfirmed ||
          !answer.firstName.trim() ||
          !answer.lastName.trim()
        ) {
          setError(r.adultError);
          return;
        }
        if (
          !answers.find((a) => a.guestId === guest.sponsor_guest_id)?.attending
        ) {
          setError(r.sponsor);
          return;
        }
      }
    }
    setBusy(true);
    try {
      const response = await fetch("/api/rsvp/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          responses: answers.map((a) => {
            const guest = household.guests.find((g) => g.id === a.guestId)!;
            return {
              guestId: a.guestId,
              attending: a.attending,
              dietaryRestrictions: a.attending ? a.dietaryRestrictions : "",
              ...(guest.is_plus_one && a.attending
                ? {
                    firstName: a.firstName,
                    lastName: a.lastName,
                    adultConfirmed: true,
                  }
                : {}),
            };
          }),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(errorMessage(data.code));
        if (data.code === "expired") {
          setStage("lookup");
          setHousehold(null);
          setAnswers([]);
          announce();
        }
        return;
      }
      setStage("confirmation");
      announce();
    } catch {
      setError(r.unavailable);
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    setBusy(true);
    try {
      await fetch("/api/rsvp/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
    } catch {
      /* Clear the in-memory invitation even if the connection is lost. Server sessions expire after 15 minutes. */
    } finally {
      setStage("lookup");
      setHousehold(null);
      setAnswers([]);
      setVerification("");
      setError("");
      setRecovery(false);
      setBusy(false);
      announce();
    }
  }
  const deadlineLabel = deadline
    ? new Intl.DateTimeFormat(locale, {
        dateStyle: "long",
        timeZone: "America/Tijuana",
      }).format(new Date(deadline))
    : null;
  return (
    <div className="rsvp-page">
      <div ref={heading} tabIndex={-1} className="rsvp-stage-heading">
        {stage === "lookup" || stage === "verification" ? (
          <PageIntro eyebrow={r.eyebrow} title={r.title} intro={r.intro} />
        ) : stage === "household" ? (
          <div className="invitation-title">
            <p className="eyebrow">{r.household}</p>
            <h1>{r.heading}</h1>
            <p>{r.householdIntro}</p>
          </div>
        ) : (
          <div className="confirmation-header">
            <Monogram />
            <h1>{r.thanks}</h1>
            <p>{answers.some((a) => a.attending) ? r.accepted : r.declined}</p>
          </div>
        )}
      </div>
      {stage === "lookup" || stage === "verification" ? (
        <div className="rsvp-panel">
          <form onSubmit={lookup} aria-busy={busy}>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            {stage === "lookup" ? (
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="first-name">{r.first}</label>
                  <input
                    id="first-name"
                    name="firstName"
                    autoComplete="given-name"
                    required
                    maxLength={100}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="last-name">{r.last}</label>
                  <input
                    id="last-name"
                    name="lastName"
                    autoComplete="family-name"
                    required
                    maxLength={100}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <>
                <h2 className="verification-heading">{r.verifyTitle}</h2>
                <p className="verification-copy">{r.verifyText}</p>
                <div className="field">
                  <label htmlFor="verification">{r.verification}</label>
                  <input
                    id="verification"
                    name="verification"
                    type="text"
                    autoComplete="off"
                    required
                    maxLength={254}
                    value={verification}
                    onChange={(e) => setVerification(e.target.value)}
                  />
                </div>
              </>
            )}
            <button
              type="submit"
              disabled={busy}
              className="button button-primary full-width"
            >
              {busy ? r.finding : stage === "lookup" ? r.find : r.verify}
              <ArrowUpRight size={16} />
            </button>
            <p className="rsvp-privacy">
              <LockKeyhole size={14} />
              {r.privacy}
            </p>
          </form>
          <div className="recovery-area">
            <button
              className="link-button"
              type="button"
              aria-expanded={recovery}
              aria-controls="invitation-recovery"
              onClick={() => setRecovery(!recovery)}
            >
              {r.help}
            </button>
            {recovery && (
              <p
                id="invitation-recovery"
                className="recovery-message"
                role="status"
              >
                {r.recovery}
              </p>
            )}
            {stage === "verification" && (
              <button
                type="button"
                className="link-button full-width"
                onClick={reset}
                disabled={busy}
              >
                <ArrowLeft
                  size={13}
                  style={{ display: "inline", marginRight: 10 }}
                />
                {r.different}
              </button>
            )}
          </div>
        </div>
      ) : null}
      {stage === "household" && household && (
        <>
          <form className="rsvp-panel" onSubmit={submit} aria-busy={busy}>
            <div className="household-label">
              <h2>{household.display_name}</h2>
              <span>{t.common.adult}</span>
            </div>
            <p
              className="rsvp-privacy"
              style={{ marginTop: 0, marginBottom: 20 }}
            >
              {r.adultNote}
            </p>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            {household.guests.map((guest) => {
              const answer = answers.find((a) => a.guestId === guest.id)!;
              return (
                <fieldset className="guest-response" key={guest.id}>
                  <legend>
                    {guest.is_plus_one && !guest.first_name
                      ? r.plus
                      : `${guest.first_name} ${guest.last_name}`}
                  </legend>
                  <div className="guest-fields">
                    <p id={`attendance-${guest.id}`}>{r.attending}</p>
                    <div
                      className="attendance-options"
                      role="group"
                      aria-labelledby={`attendance-${guest.id}`}
                    >
                      <label className="attendance-option">
                        <input
                          required
                          type="radio"
                          name={`attendance-${guest.id}`}
                          checked={answer.attending === true}
                          onChange={() => update(guest.id, { attending: true })}
                        />
                        {r.yes}
                      </label>
                      <label className="attendance-option">
                        <input
                          required
                          type="radio"
                          name={`attendance-${guest.id}`}
                          checked={answer.attending === false}
                          onChange={() =>
                            update(guest.id, { attending: false })
                          }
                        />
                        {r.no}
                      </label>
                    </div>
                    {guest.is_plus_one && answer.attending && (
                      <>
                        <div className="form-grid">
                          <div className="field">
                            <label htmlFor={`first-${guest.id}`}>
                              {r.first}
                            </label>
                            <input
                              id={`first-${guest.id}`}
                              required
                              maxLength={100}
                              autoComplete="off"
                              value={answer.firstName}
                              onChange={(e) =>
                                update(guest.id, { firstName: e.target.value })
                              }
                            />
                          </div>
                          <div className="field">
                            <label htmlFor={`last-${guest.id}`}>{r.last}</label>
                            <input
                              id={`last-${guest.id}`}
                              required
                              maxLength={100}
                              autoComplete="off"
                              value={answer.lastName}
                              onChange={(e) =>
                                update(guest.id, { lastName: e.target.value })
                              }
                            />
                          </div>
                        </div>
                        <label className="adult-checkbox">
                          <input
                            required
                            type="checkbox"
                            checked={answer.adultConfirmed}
                            onChange={(e) =>
                              update(guest.id, {
                                adultConfirmed: e.target.checked,
                              })
                            }
                          />
                          {r.plusAdult}
                        </label>
                      </>
                    )}
                    {answer.attending && (
                      <div className="field">
                        <label htmlFor={`dietary-${guest.id}`}>
                          {r.dietary} <span>({r.optional})</span>
                        </label>
                        <textarea
                          id={`dietary-${guest.id}`}
                          maxLength={1000}
                          rows={3}
                          value={answer.dietaryRestrictions}
                          onChange={(e) =>
                            update(guest.id, {
                              dietaryRestrictions: e.target.value,
                            })
                          }
                          placeholder={r.dietaryHint}
                        />
                      </div>
                    )}
                  </div>
                </fieldset>
              );
            })}
            <button
              className="button button-primary full-width"
              disabled={busy}
              type="submit"
            >
              {busy ? r.submitting : r.submit}
              <Check size={16} />
            </button>
            {deadlineLabel && (
              <p className="deadline-note">
                {r.deadline} {deadlineLabel}
              </p>
            )}
          </form>
          <div className="edit-response">
            <button className="link-button" disabled={busy} onClick={reset}>
              {r.different}
            </button>
          </div>
        </>
      )}
      {stage === "confirmation" && household && (
        <>
          <section className="rsvp-panel">
            <p className="eyebrow">{r.review}</p>
            {answers.map((answer) => {
              const guest = household.guests.find(
                (g) => g.id === answer.guestId,
              )!;
              const name = guest.is_plus_one
                ? answer.firstName
                  ? `${answer.firstName} ${answer.lastName}`
                  : r.plus
                : `${guest.first_name} ${guest.last_name}`;
              return (
                <div className="confirmation-row" key={answer.guestId}>
                  <h3>{name}</h3>
                  <p>{answer.attending ? r.attendingShort : r.declinedShort}</p>
                  {answer.attending && (
                    <small>{answer.dietaryRestrictions || r.dietaryNone}</small>
                  )}
                </div>
              );
            })}
          </section>
          <div className="edit-response">
            <button
              type="button"
              onClick={reset}
              disabled={busy}
              className="text-link link-button"
            >
              {r.edit}
              <ArrowUpRight size={15} />
            </button>
            <p>{r.editHint}</p>
          </div>
        </>
      )}
    </div>
  );
}
