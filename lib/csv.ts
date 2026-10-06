import { z } from "zod";
import {
  emailSchema,
  personName,
  phoneSchema,
} from "@/lib/security/validation";
import type { Household } from "@/types/database";

export type ImportRow = {
  firstName: string;
  lastName: string;
  household: string;
  email: string;
  phone: string;
  plusOneAllowed: boolean;
};
export type ImportIssue = { row: number; message: string };
export type ImportPreview = {
  rows: ImportRow[];
  errors: ImportIssue[];
  warnings: ImportIssue[];
  valid: boolean;
};
const headers = [
  "first name",
  "last name",
  "household",
  "email",
  "phone",
  "plus one allowed",
];
const normalized = (value: string) => value.trim().toLowerCase();
const digits = (value: string) => value.replace(/\D/g, "");
const rowSchema = z.object({
  firstName: personName,
  lastName: personName,
  household: z.string().trim().min(1).max(150),
  email: emailSchema,
  phone: phoneSchema,
  plusOneAllowed: z.boolean(),
});

/** Small, strict RFC 4180 parser: quoted commas/newlines, CRLF, escaped quotes, and UTF-8 BOM. */
export function parseCsv(csv: string): string[][] {
  if (csv.length > 1_000_000)
    throw new Error("The CSV must be smaller than 1 MB.");
  const source = csv.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    closedQuote = false;
  const finishField = () => {
    row.push(field);
    field = "";
    closedQuote = false;
  };
  const finishRow = () => {
    finishField();
    if (row.some((value) => value.trim())) rows.push(row);
    row = [];
    if (rows.length > 2001)
      throw new Error("Import no more than 2,000 guests at a time.");
  };
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
          closedQuote = true;
        }
      } else field += char;
    } else if (char === ",") finishField();
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && source[i + 1] === "\n") i++;
      finishRow();
    } else if (char === '"') {
      if (field || closedQuote)
        throw new Error(
          "A quotation mark is misplaced. Use standard CSV quoting.",
        );
      quoted = true;
    } else {
      if (closedQuote)
        throw new Error("Unexpected text after a closing quotation mark.");
      field += char;
    }
  }
  if (quoted)
    throw new Error("A quoted field is missing its closing quotation mark.");
  if (field || row.length || closedQuote) finishRow();
  return rows;
}

export function previewImport(
  csv: string,
  existing: Household[] = [],
): ImportPreview {
  const result: ImportPreview = {
    rows: [],
    errors: [],
    warnings: [],
    valid: false,
  };
  let table: string[][];
  try {
    table = parseCsv(csv);
  } catch (error) {
    result.errors.push({
      row: 1,
      message:
        error instanceof Error ? error.message : "Unable to read this CSV.",
    });
    return result;
  }
  if (table.length < 2) {
    result.errors.push({
      row: 1,
      message: "Include a header row and at least one guest.",
    });
    return result;
  }
  const head = table[0].map(normalized);
  if (
    new Set(head).size !== head.length ||
    headers.some((header) => !head.includes(header))
  ) {
    result.errors.push({
      row: 1,
      message:
        "Use each required column once: First Name, Last Name, Household, Email, Phone, Plus One Allowed.",
    });
    return result;
  }
  const seen = new Set<string>();
  const contacts = new Map<string, { email: string; phone: string }>();
  const sourceRows: number[] = [];
  for (const [index, columns] of table.slice(1).entries()) {
    const number = index + 2;
    if (columns.length !== head.length) {
      result.errors.push({
        row: number,
        message: "This row has a different number of columns from the header.",
      });
      continue;
    }
    const value = (header: string) => columns[head.indexOf(header)].trim();
    const permission = normalized(value("plus one allowed"));
    if (!["", "yes", "no", "true", "false", "1", "0"].includes(permission)) {
      result.errors.push({
        row: number,
        message: "Plus One Allowed must be yes/no or true/false.",
      });
      continue;
    }
    const candidate = rowSchema.safeParse({
      firstName: value("first name"),
      lastName: value("last name"),
      household: value("household"),
      email: value("email"),
      phone: value("phone"),
      plusOneAllowed: ["yes", "true", "1"].includes(permission),
    });
    if (!candidate.success) {
      for (const issue of candidate.error.issues)
        result.errors.push({
          row: number,
          message: `${String(issue.path[0])}: ${issue.message}`,
        });
      continue;
    }
    const row = candidate.data;
    result.rows.push(row);
    sourceRows.push(number);
    const houseKey = normalized(row.household);
    const key = `${houseKey}\0${normalized(row.firstName)}\0${normalized(row.lastName)}`;
    if (seen.has(key))
      result.errors.push({
        row: number,
        message: "Duplicate exact guest name in this household.",
      });
    seen.add(key);
    const matchingHouses = existing.filter(
      (house) => normalized(house.display_name) === houseKey,
    );
    if (matchingHouses.length > 1)
      result.errors.push({
        row: number,
        message:
          "Multiple existing households have this name. Rename them before importing.",
      });
    const house = matchingHouses[0];
    if (
      house?.guests.some(
        (guest) =>
          normalized(guest.first_name) === normalized(row.firstName) &&
          normalized(guest.last_name) === normalized(row.lastName),
      )
    )
      result.errors.push({
        row: number,
        message: "This guest already exists in this household.",
      });
    const previous = contacts.get(houseKey) || {
      email: house?.primary_email || "",
      phone: house?.primary_phone || "",
    };
    if (
      (previous.email &&
        row.email &&
        normalized(previous.email) !== normalized(row.email)) ||
      (previous.phone &&
        row.phone &&
        digits(previous.phone) !== digits(row.phone))
    )
      result.errors.push({
        row: number,
        message:
          "Rows in one household must use the same household contact information.",
      });
    contacts.set(houseKey, {
      email: previous.email || row.email,
      phone: previous.phone || row.phone,
    });
  }
  // Same names in different households are legitimate, but require an existing, distinguishing contact.
  for (const [index, row] of result.rows.entries()) {
    const sameName = (first: string, last: string) =>
      normalized(first) === normalized(row.firstName) &&
      normalized(last) === normalized(row.lastName);
    const otherRows = result.rows.filter(
      (other) =>
        normalized(other.household) !== normalized(row.household) &&
        sameName(other.firstName, other.lastName),
    );
    const otherHouses = existing.filter(
      (house) =>
        normalized(house.display_name) !== normalized(row.household) &&
        house.guests.some(
          (guest) =>
            !guest.is_plus_one && sameName(guest.first_name, guest.last_name),
        ),
    );
    if (otherRows.length || otherHouses.length) {
      result.warnings.push({
        row: sourceRows[index],
        message:
          "An exact name is shared across households. The guest will need their stored household email or phone to verify.",
      });
      const contact = contacts.get(normalized(row.household))!;
      if (!contact.email && !contact.phone)
        result.errors.push({
          row: sourceRows[index],
          message:
            "This duplicate exact name requires a household email or phone for verification.",
        });
      for (const other of otherHouses)
        if (!other.primary_email && !other.primary_phone)
          result.errors.push({
            row: sourceRows[index],
            message: `Add contact information to the existing household “${other.display_name}” before importing this duplicate name.`,
          });
      const peers = new Map<string, { email: string; phone: string }>();
      peers.set(normalized(row.household), contact);
      for (const other of otherRows)
        peers.set(
          normalized(other.household),
          contacts.get(normalized(other.household))!,
        );
      for (const other of otherHouses)
        peers.set(
          normalized(other.display_name),
          contacts.get(normalized(other.display_name)) || {
            email: other.primary_email || "",
            phone: other.primary_phone || "",
          },
        );
      for (const [houseName, candidate] of peers) {
        const distinctEmail =
          Boolean(candidate.email) &&
          ![...peers].some(
            ([peerName, peer]) =>
              peerName !== houseName &&
              normalized(peer.email) === normalized(candidate.email),
          );
        const distinctPhone =
          Boolean(candidate.phone) &&
          ![...peers].some(
            ([peerName, peer]) =>
              peerName !== houseName &&
              digits(peer.phone) === digits(candidate.phone),
          );
        if (!distinctEmail && !distinctPhone)
          result.errors.push({
            row: sourceRows[index],
            message: `Household “${houseName}” needs an email or phone that distinguishes this exact guest name from the other invitations.`,
          });
      }
    }
  }
  const groupedCount = new Map<string, number>();
  for (const row of result.rows)
    groupedCount.set(
      normalized(row.household),
      (groupedCount.get(normalized(row.household)) || 0) +
        (row.plusOneAllowed ? 2 : 1),
    );
  for (const [house, count] of groupedCount) {
    const existingCount =
      existing.find((item) => normalized(item.display_name) === house)?.guests
        .length || 0;
    if (count + existingCount > 50)
      result.errors.push({
        row: 1,
        message: `Household “${house}” exceeds the limit of 50 invited adult slots.`,
      });
  }
  result.valid = result.errors.length === 0 && result.rows.length > 0;
  return result;
}

export function csvCell(value: unknown) {
  let text = value == null ? "" : String(value);
  // Quoting alone does not prevent spreadsheet formula execution, including whitespace-prefixed formulas.
  if (/^[\s\uFEFF]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text))
    text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function exportHouseholds(households: Household[]) {
  const rows: unknown[][] = [
    [
      "First Name",
      "Last Name",
      "Household",
      "Attendance",
      "Dietary Restrictions",
      "Plus One",
      "Email",
      "Phone",
      "Last Updated",
    ],
  ];
  for (const house of households)
    for (const guest of house.guests)
      rows.push([
        guest.first_name,
        guest.last_name,
        house.display_name,
        guest.rsvp
          ? guest.rsvp.attending
            ? "Attending"
            : "Declined"
          : "No response",
        guest.rsvp?.dietary_restrictions || "",
        guest.is_plus_one ? "Yes" : "No",
        house.primary_email || "",
        house.primary_phone || "",
        guest.rsvp?.updated_at || "",
      ]);
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
