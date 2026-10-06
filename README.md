# Sarah and Juan

A custom bilingual wedding website and private RSVP application for **August 27, 2027**, at **Siempre Valle, Valle de Guadalupe, Ensenada, Baja California, Mexico**. The invitation experience supports English and Mexican Spanish (`es-MX`); the administration interface is English.

Built with Next.js App Router, React, TypeScript, Tailwind CSS, Supabase PostgreSQL, and Supabase Auth, ready to deploy on Vercel. The exact installed versions are recorded in `package-lock.json`.

## Design direction

Public typography and primary buttons share the darker mauve `#82707F`, configured with `--text` in `app/globals.css`. Primary buttons, including every RSVP action, use white labels and a slightly darker hover state. White labels on mauve have a contrast ratio of 4.59:1. Mauve text on ivory has a contrast ratio of 4.18:1, below WCAG AA for small text; the existing contrast checks will report that limitation. Light text remains on dark sections and photo overlays. The admin theme and error colors remain independent.

The editorial design pairs warm ivory (`#F7F4ED`), vineyard olive (`#424A39`), muted plum (`#675165`), sage (`#A6AC98`), and warm stone (`#D9D1C3`). Generous spacing, fine rules, architectural shapes, and restrained motion reflect the written Valle de Guadalupe setting. Cormorant Garamond headings and Manrope interface text are bundled locally through Fontsource; neither is a cursive/script typeface. The reusable S&J SVG monogram appears in navigation, the footer, placeholders, and RSVP confirmation, with companion favicon and Open Graph artwork.

## Project status and content boundaries

The ceremony and reception are at Siempre Valle. The ceremony time and RSVP deadline have **not** been supplied. The wedding is adults-only. Story copy, engagement photographs, recommendations, travel arrangements, FAQ answers beyond the confirmed policy, and the honeymoon fund link remain clearly identified placeholders. No personal history, venue arrangements, vendors, guest records, or photographs of the couple have been invented.

The referenced venue photograph was not present among the available attachments. The visual design therefore uses the written venue direction and neutral image placeholders. Replace those assets when the original venue and engagement photographs are available.

Without configured Supabase credentials, public content can be reviewed, but private functions report that the service is unavailable. There is no fake invitation mode and no public sample guest directory. A successful local build or browser test does **not** prove that a real Supabase project, authentication account, deployment, or domain has been connected. Follow the staging checklist below before sending the shared QR code.

## Architecture

```text
app/                    Public pages, metadata, admin entry, and server API routes
components/wedding/     Shared navigation, monogram, image layouts, and gallery
components/rsvp/        Name lookup, household responses, and confirmation
components/admin/       Authenticated guest and household management
content/wedding.ts      Typed wedding facts and editable bilingual content
lib/i18n/               Centralized translations and locale helpers
lib/security/           Validation, rate limits, identity, and request protections
lib/supabase/           Server-side Supabase clients
supabase/migrations/    Schema, constraints, RLS, and private database functions
tests/                  Unit and browser verification
public/                 Static artwork and future wedding photographs
```

Public routes are `/`, `/our-story`, `/things-to-do`, `/travel`, `/faq`, `/honeymoon-fund`, `/gallery`, and `/rsvp`. `/admin` is the private management entry. The two languages share components; the `wedding-locale` cookie persists the choice across navigation. The initial canonical domain is `https://sarahandjuan.com`.

### Private invitation flow

1. A guest enters a required first and last name. The server normalizes leading/trailing whitespace and case, then compares **both full fields exactly**. There is no fuzzy matching, prefix search, autocomplete, or public search result list. Accents remain significant.
2. One unambiguous matching name identifies its household. Duplicate names require the full email address or phone number already held for that invitation. Unresolved names follow the same secondary verification response, and failures use a generic message. The site never returns stored verification contact details or accepts a new recovery contact as proof.
3. Identity resolution, household projection, and session issuance occur atomically in PostgreSQL. A short-lived random invitation token is held in an HttpOnly cookie restricted to the RSVP API. Only its hash is stored in PostgreSQL. Household data is returned only within the verified scope. Identity is not stored in localStorage. Editing household contacts or invitation members revokes existing invitation sessions.
4. The server checks every submitted member against the verified household and accepts only existing invited adults and preallocated approved adult plus-one slots. A client cannot add household members or increase the invitation capacity. A plus-one permission creates a reserved slot tied to the inviting guest.
5. Submission is atomic and consumes the verification session. The guest receives a reviewable confirmation. To edit, the guest verifies again; the server enforces `RSVP_DEADLINE` when configured.

Shared PostgreSQL rate-limit buckets protect lookup across server instances. Hashed session identifiers and keyed request identifiers avoid storing raw session tokens and raw IP addresses. On Vercel, the limiter uses the platform's trusted client-IP header; non-Vercel development deliberately shares one bucket. Adapt the trusted proxy boundary before hosting elsewhere. Rate checks remove expired sessions and rate windows older than one day. Private API responses are not cacheable. The service role is used only on the server; authentication and explicit administrator authorization precede admin actions. Exact-name access remains a deliberate tradeoff: a person who already knows an unambiguous invited name can identify that invitation, as required by the name-based QR flow. It is not an email ownership challenge.

## 1. Local installation

Use a current Node.js LTS version supported by the installed Next.js release (Node.js 22 or later) and npm. Install the locked dependencies:

```sh
npm ci
```

Copy `.env.example` to `.env.local`; on PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Set `NEXT_PUBLIC_SITE_URL=http://localhost:3000` for development, add the Supabase values described below, then start the site:

```sh
npm run dev
```

Open `http://localhost:3000`. Environment changes require restarting the development server. Keep `.env.local` out of source control. Public layout review is possible with the private-service values left empty.

TypeScript 6 and ESLint 9 are pinned to the compatible tooling line: the newer TypeScript 7 parser/tooling combination was not compatible with this project's lint stack at implementation time. Use the lockfile and re-run all checks before changing those versions. The production dependency audit passed with zero reported vulnerabilities during implementation. The full dependency audit still reported five high-severity development-tool findings through the transitive `braces` chain; the available `braces` 3.0.3 release had no patched upgrade for those findings. These are not a claim that the entire dependency tree is vulnerability-free. Recheck `npm audit` and `npm audit --omit=dev` before release, and update compatible tooling when fixes become available.

## 2. Environment variables

| Variable                        | Exposure              | Purpose                                                                                                               |
| ------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`          | Public                | Canonical origin and deployment origin; production is `https://sarahandjuan.com`.                                     |
| `NEXT_PUBLIC_SUPABASE_URL`      | Public                | Project API URL from Supabase project settings.                                                                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public                | Project anon key for Supabase Auth; private tables remain inaccessible.                                               |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server only           | Privileged server access to the private schema. Never prefix it with `NEXT_PUBLIC_`.                                  |
| `RSVP_SESSION_SECRET`           | Server only           | At least 32 random characters, used for keyed security identifiers.                                                   |
| `RSVP_DEADLINE`                 | Server only, optional | Final permitted RSVP instant, as an ISO 8601 timestamp with an explicit timezone. Empty means no configured deadline. |
| `PLAYWRIGHT_BASE_URL`           | Test only, optional   | Existing server used by browser tests; otherwise Playwright starts development locally.                               |

Generate a session secret locally; put the result in your environment manager, never in this README:

```sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Use independent staging and production credentials. Never paste the service role, real guest CSVs, contact information, or invitation session cookies into issues, screenshots, browser bundles, or committed files.

## 3. Supabase project setup

1. Create a Supabase project for the application and store the database password securely.
2. Copy the project API URL, anon key, and service-role key into the appropriate environment variables.
3. Apply the database migration in section 4 **before** using invitation or admin functions.
4. Enable email/password authentication for the two administrators. Disable public signups if they are not needed. There is no guest account registration flow.
5. Set the Supabase Auth site URL to the deployed production origin and add only the development or preview redirect origins actually needed.
6. Create and authorize the first administrator as described in section 6.

Use a separate project for realistic staging verification. Real guest information belongs only in the project and authorized exports, not in source control. See [Supabase's environment guidance](https://supabase.com/docs/guides/deployment/managing-environments).

## 4. Database migrations

The initial migration is `supabase/migrations/202610050001_wedding.sql`. For a new project, either paste that complete file into the Supabase SQL Editor and run it once, or use the Supabase CLI:

```sh
npx supabase init
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Run `supabase init` once to create local CLI configuration if `supabase/config.toml` does not exist yet; keep the supplied migrations. Confirm the selected project before applying changes. Keep subsequent schema changes in new timestamped migration files and apply them in order; do not edit an already deployed migration. Avoid running a local database reset against production. The SQL Editor route is convenient for initial setup; if switching to CLI deployment afterward, align migration history before pushing. Follow [Supabase's migration workflow](https://supabase.com/docs/guides/deployment/database-migrations).

The normalized core uses UUID primary keys for `households`, `guests`, `rsvps`, and `admin_users`. A household owns contact information and invitation members; each guest has one RSVP record. Approved plus-one slots retain an association with their sponsor. Server-only session and rate-limit tables support scoped, expiring access. Database constraints and transactional functions enforce the same boundaries as the API. There is no real or invented guest seed data.

## 5. Row Level Security setup

RLS and permission revocations are included in the migration. All invitation and administration tables are private: anonymous and ordinary authenticated clients have no direct table access. Security-sensitive database functions are also restricted to the service role. Do not add an anonymous read policy for lookup, and do not expose the service key to make a browser query work.

In the Supabase dashboard, confirm RLS is enabled on every application table. From a client using the anon key, attempt to read `households`, `guests`, and `rsvps`; the request must return no protected records or be denied. Repeat using a logged-in Auth user who is **not** listed in `admin_users`. API responses to that user must also deny admin access. A successful Supabase Auth login alone never grants permission to wedding data.

## 6. Creating the first admin

1. In Supabase **Authentication → Users**, create an email/password account for an authorized administrator. Use a strong, unique password and the correct confirmed email setting for that account.
2. Copy that user's Auth UUID.
3. In the project's SQL Editor, authorize that specific account:

```sql
insert into public.admin_users (user_id)
values ('REPLACE_WITH_AUTH_USER_UUID');
```

4. Visit `/admin` and log in with the account's email and password.
5. Repeat for the other administrator. Verify an unlisted Auth account cannot load or modify any admin data.

To revoke wedding-management access, remove that user's `admin_users` row using a trusted Supabase administrator. Manage account recovery and password resets through Supabase Auth. Creating an Auth account or changing browser state cannot make someone an application administrator.

## 7. Importing guests and managing invitations

In `/admin`, open the CSV Import tab, upload a UTF-8 CSV or paste its text, inspect the validation preview, confirm that every invitee is an adult, and explicitly confirm the import. No records are committed during preview. The server repeats validation before the atomic import.

Use these exact column headings:

```csv
First Name,Last Name,Household,Email,Phone,Plus One Allowed
```

Use one row per named invited adult. Give members of the same invitation the same household value and consistent household contact information. Use accurate email addresses and full phone numbers that guests will recognize for duplicate-name verification. `Plus One Allowed` accepts `yes`/`no`, `true`/`false`, or `1`/`0`; an empty value means no permission. The application creates the approved unnamed adult slot. Do not include children, invent placeholder guests, or manually add extra plus-one rows to increase capacity. Each upload is limited to 2,000 named guests, a CSV size of 1 MB, and a maximum of 50 adult slots per household.

The preview flags missing names/households, malformed email or phone, duplicate rows, and duplicate exact names. Resolve blocking errors before importing. Duplicate exact names across distinct invitations need at least one independently distinguishing stored email or phone number for each invitation. Add those household contacts **before** adding legitimate duplicate-name guests; sharing both contacts across the matching invitations would make verification ambiguous and is blocked. Do not merge people solely because their names match. The same constraint applies to manual guest and household edits. The preview and server validation are authoritative about accepted values and conflicts with existing invitations.

The dashboard supports household and guest editing, moving guests between households, plus-one permissions, contact details, manual attendance and dietary corrections, and response filters. The unanswered view helps identify invitations needing personal follow-up; the app sends no automatic messages. CSV export includes names, household, attendance, dietary restrictions, plus-one status, contacts, and last update. Exported contact and dietary data is private; share only with the intended planning team and use a secure channel.

## 8. Adding wedding photographs

Place final images under `public/images/`, using descriptive filenames and web-friendly dimensions. Update the typed image configuration in `content/wedding.ts` with image paths, meaningful English/Spanish alternative text, aspect ratios, and optional captions. The image components use Next.js Image for responsive delivery where appropriate. Retain portrait and landscape variants so the editorial layouts work on mobile.

Use actual photographs supplied by Sarah and Juan; do not replace placeholders with generated lookalikes. Select an image for the homepage hero, images for the story/editorial sections, and gallery images. Remove visible placeholder labels only after assigning the corresponding real asset. If hosting photographs remotely, explicitly configure approved image hostnames in `next.config.ts` rather than accepting arbitrary URLs. Replace the monogram sharing image only when an approved photograph is available, and check the crop at mobile, desktop, and social-preview sizes.

## 9. Editing English content

Wedding facts and editable page content live in `content/wedding.ts`. Reusable interface text, navigation, form labels, confirmations, and errors live in `lib/i18n/dictionaries.ts`. Update each English (`en`) entry in its existing typed structure; avoid hard-coded strings inside page components. Keep unknown information visibly pending and never add unconfirmed logistics or personal history.

## 10. Editing Spanish content

Update the matching `es-MX` entries in the same configuration and dictionary files. Use natural Mexican Spanish. Keep both locales complete when adding a new content field or interface string. The language selector writes the `wedding-locale` cookie; the server renders the selected locale and sets the document's `lang`. Test the new text on narrow screens because translations vary in length. Admin text may remain English.

## 11. Editing ceremony time and RSVP deadline

The ceremony time is intentionally unset in `content/wedding.ts`. When confirmed, enter the time and its localized display labels in that configuration, including the venue's timezone context where needed. Do not infer the ceremony time from the wedding date or add a placeholder clock time to calendar metadata.

The separate RSVP deadline is `RSVP_DEADLINE`. Leave it empty until decided, then set a full ISO timestamp with an explicit offset or `Z` in every relevant deployment and redeploy. Verify the deadline in Valle de Guadalupe local time, confirm both language displays, and test immediately before and after the configured instant. The API enforces the deadline independently of browser controls. The database also has an optional `wedding_settings.rsvp_deadline` override; it starts as `NULL`. If both values are set, the earlier deadline wins. Keep it `NULL` when managing the deadline only through the environment.

## 12. Editing Travel content

Use the typed travel sections in `content/wedding.ts`. Each section can be enabled or disabled and holds bilingual text. The planned areas are getting there, lodging, transportation, parking, border/international travel, and venue information. Publish hotels, room blocks, shuttles, airport suggestions, parking details, and border instructions only after confirming them. Empty sections display a graceful pending state rather than fabricated arrangements.

## 13. Editing Things to Do

Populate the recommendations structure in `content/wedding.ts`. Each recommendation supports a name, category, bilingual description, image, website URL, map URL, address, and optional personal note. Categories cover wineries, restaurants/food, experiences, sightseeing, relaxation, and nearby activities. Keep the list empty until Sarah and Juan approve recommendations. Verify external URLs and map destinations before publishing.

## 14. Editing FAQ and Our Story

Edit the FAQ array in `content/wedding.ts`; the UI renders it as an accessible accordion. The only confirmed policy is an adults-only wedding with no children. Add dress code, arrival time, transport, parking, weather guidance, RSVP deadline, plus-one policy wording, and lodging answers only after they are approved. Keep answers equivalent in both languages.

The same content file contains the clearly marked Our Story copy and optional milestones. Replace them with the couple's real writing when available. Do not infer relationship dates, how they met, or other biographical details.

## 15. Adding the Honeymoon Fund URL

Set the honeymoon-fund URL and bilingual message in `content/wedding.ts` when a provider has been selected. Until then, the page shows its pending state without a working payment action. Use the provider's HTTPS destination and verify it before publishing. The site links out to the provider; it does not collect card numbers, banking details, or payments.

## 16. Deploying to Vercel

1. Keep this application in a private source repository and connect that repository to a new Vercel project.
2. Use the detected Next.js framework preset, the repository root, `npm ci`, and the normal Next.js build command. Do not configure a static export: authenticated APIs require a server runtime.
3. Add environment variables from section 2 in Vercel. Choose the proper Production/Preview scopes; use a separate Supabase project and secrets for previews. Ensure the public origin matches that deployment.
4. Apply migrations to the intended Supabase project, create authorized administrators, and deploy.
5. Run the verification commands below locally and perform the real staging invitation lifecycle checks against the connected deployment.
6. Check HTTPS, images, metadata, headers, locale persistence, admin login/logout, lookup limits, CSV behavior, and direct API access before making the site the destination of printed cards.

Vercel deployments do not automatically run Supabase SQL migrations. Keep database deployment and application deployment coordinated. Rotating a secret or changing a build-time `NEXT_PUBLIC_` variable requires a new deployment. Never claim the service is live until the production URL and connected backend have actually been tested.

## 17. Connecting sarahandjuan.com

In Vercel **Project → Settings → Domains**, add `sarahandjuan.com` and optionally `www.sarahandjuan.com`. At the domain's DNS provider, enter the exact records Vercel currently requests. Avoid copying an old IP address from a tutorial; preserve unrelated mail records. Choose `https://sarahandjuan.com` as the canonical origin and redirect the `www` alias if used. See [Vercel's domain setup instructions](https://vercel.com/docs/domains/working-with-domains/add-a-domain).

Wait for Vercel to verify DNS and issue HTTPS. Set the production `NEXT_PUBLIC_SITE_URL`, Supabase Auth site URL, and allowed redirects to the final origin, then redeploy and verify them. Test both `/` and `/rsvp` on a real phone using cellular data. Every printed Save the Date may use the **same** QR destination: `https://sarahandjuan.com/rsvp` (or the homepage with its prominent RSVP action). No household identifiers, credentials, or personalized codes belong in the printed URL.

## Verification and release checklist

Local verification completed on October 5, 2026: production build, ESLint, TypeScript, and 26 PostgreSQL/CSV tests passed. Against the optimized production server, 113 browser checks passed across desktop and 375/390/768px widths. Three repeated authenticated accessibility cases are intentionally desktop-only; the public accessibility checks run at every size. These results cover the test boundaries described below, not a connected Supabase deployment.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Playwright covers desktop and mobile widths of 375, 390, and 768 pixels. Tests run against a local application by default; set `PLAYWRIGHT_BASE_URL` to target an already running local or staging server. Browser tests cover public navigation, overflow, language persistence, keyboard-accessible controls, placeholder presentation, metadata, and unauthenticated boundaries. Synthetic network fixtures inside browser tests exercise private UI flows, including plus-one confirmation, declined responses, generic verification failure, and re-verification; they are not real backend integration tests and never enter production data. Unit and database tests cover business rules and validation. Inspect the HTML report after a failed browser test; captured traces and screenshots may contain page content, so use synthetic staging identities for private-flow tests.

Before launch, use synthetic adults in a dedicated Supabase staging project to verify: a unique name; duplicate exact names with correct and incorrect stored contacts; an unresolved name; household review; attendance and dietary submission; declined confirmation; approved and disallowed plus ones; altered guest IDs; repeated/session-expired submission; re-verification before editing; before/after-deadline handling; unauthenticated and unauthorized admin API access; valid and invalid CSV imports; export; deleting/moving household members; and login/logout. Confirm that anonymous Supabase clients cannot read invitation tables or invoke private functions.

Test actual iOS Safari and Android Chrome, screen-reader labels, keyboard focus, reduced motion, photo crops, and the final printed QR code. Check counts against known staging records. Run a final export as an authorized admin and compare it with the dashboard. Configure database backups, retain secrets in the deployment manager, and avoid request-body logging for private routes. These connected checks require a real configured environment; they are not substitutes for the local automated suite.
