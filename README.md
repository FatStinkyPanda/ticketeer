# 🎫 Ticketeer

**MSSP Incident Ticket Generation Platform — AI-Powered, Privacy-First**

> All AI agents developing this project **must** strictly adhere to the
> [Universal Development Philosophy & Core Principles](./DEVELOPMENT_PHILOSOPHY.md).
> No exceptions. No shortcuts. No regressions.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Core Constraints & Non-Negotiables](#2-core-constraints--non-negotiables)
3. [Architecture Overview](#3-architecture-overview)
4. [Technology Stack](#4-technology-stack)
5. [Project Structure](#5-project-structure)
6. [Feature Specifications](#6-feature-specifications)
   - 6.1 [Alert Input Form (UI)](#61-alert-input-form-ui)
   - 6.2 [PII Detection & Prevention](#62-pii-detection--prevention)
   - 6.3 [AI Provider & Model Selection](#63-ai-provider--model-selection)
   - 6.4 [API Key & Settings Management](#64-api-key--settings-management)
   - 6.5 [Ticket Generation Engine](#65-ticket-generation-engine)
   - 6.6 [Ticket Display & Export](#66-ticket-display--export)
   - 6.7 [Persistence Layer](#67-persistence-layer)
7. [AI Agent Instructions](#7-ai-agent-instructions)
8. [PII Rules — Definitive Reference](#8-pii-rules--definitive-reference)
9. [API Integration Specifications](#9-api-integration-specifications)
   - 9.1 [Anthropic Claude](#91-anthropic-claude)
   - 9.2 [Google Gemini](#92-google-gemini)
   - 9.3 [OpenRouter](#93-openrouter)
10. [Prompt Construction Specification](#10-prompt-construction-specification)
11. [Settings & Persistence Specification](#11-settings--persistence-specification)
12. [Testing Requirements](#12-testing-requirements)
13. [GitHub & CI/CD](#13-github--cicd)
14. [Development Roadmap & Task List](#14-development-roadmap--task-list)
15. [Definition of Done](#15-definition-of-done)

---

## 1. Project Overview

**Ticketeer** is a desktop/web application built for Managed Security Service Providers (MSSPs). It provides a clean, structured UI for security analysts to input raw alert data from a SIEM/IDS/IPS and submit it — via AI API — to receive a fully or partially populated incident ticket formatted according to the MSSP ticket standard defined in [`MSSP_Ticket_Agent_Instructions.md`](./MSSP_Ticket_Agent_Instructions.md).

### What Ticketeer Does

1. Accepts structured alert fields from the analyst via a form UI.
2. Enforces strict PII/confidentiality rules **locally, before any data leaves the system**.
3. Packages the alert data with the AI agent instructions into a complete, structured prompt.
4. Sends the prompt to the analyst's chosen AI provider (Claude, Gemini, or OpenRouter).
5. Receives and displays the populated ticket with unfilled-placeholder highlighting.
6. Allows the analyst to directly **edit** the ticket in-place before export.
7. Enables **AI-assisted revision** of a selected ticket section: the analyst highlights text, provides an instruction, and the AI rewrites just that section — with PII scanning applied to all revision inputs before any data leaves the system.
8. Persists API keys, settings, and last-used provider/model locally and securely.

### What Ticketeer Does NOT Do

- Ticketeer does **not** send PII or public IP addresses as identifiable data to any API without explicit analyst acknowledgement and appropriate field handling.
- Ticketeer does **not** store ticket content, IP addresses, or customer data in any remote system.
- Ticketeer does **not** fabricate, assume, or pre-fill ticket fields with invented data.
- Ticketeer is **not** a replacement for analyst judgment — it is a productivity tool.

---

## 2. Core Constraints & Non-Negotiables

These rules are enforced at the application level and must never be weakened, bypassed, or removed:

### PII / Confidentiality Rules

| Rule | Enforcement Point |
|---|---|
| Source IP must be a private RFC 1918 address, OR the analyst must explicitly toggle "Public IP" | UI validation — form will not submit otherwise |
| Destination IP must be a private RFC 1918 address, OR the analyst must explicitly toggle "Public IP" | UI validation — form will not submit otherwise |
| Analyst name ("Reported by") is always entered by the human. The AI agent NEVER fills this in. | Prompt instruction + UI label |
| Customer name is never entered into the UI or sent to the API | No such field exists in the form |
| No free-text field accepts full names, email addresses, SSNs, or other PII | Local regex/pattern validation before API submission |

### AI Agent Behavioral Rules (enforced via prompt)

All of these are passed verbatim to the AI agent as system instructions on every request:

- Never fabricate data. Leave unfilled fields as original placeholders.
- Never invent IP addresses, domain names, ports, timestamps, or analyst names.
- Never cite AI-generated content as a source.
- Never reword placeholders to appear filled in.
- Incomplete tickets are correct and expected when data is missing.
- All sources must be primary or reputable secondary references (NVD, CISA, vendor advisories, AbuseIPDB).

---

## 3. Architecture Overview

```
┌────────────────────────────────────────────────────────────────────┐
│                        TICKETEER APPLICATION                       │
│                                                                    │
│  ┌──────────────┐    ┌───────────────────┐    ┌────────────────┐  │
│  │  Alert Input │    │  PII Guard Layer  │    │ Prompt Builder │  │
│  │     Form     │───▶│  (local, pre-API) │───▶│   & Packager   │  │
│  │    (UI)      │    │                   │    │                │  │
│  └──────────────┘    └───────────────────┘    └───────┬────────┘  │
│                                                        │           │
│  ┌──────────────┐    ┌───────────────────┐            │           │
│  │   Settings   │    │  Provider Router  │◀───────────┘           │
│  │   Manager    │    │ Claude/Gemini/OR   │                        │
│  │  (local enc) │    └─────────┬─────────┘                        │
│  └──────────────┘              │                                   │
│                                ▼                                   │
│  ┌──────────────┐    ┌───────────────────┐                        │
│  │   Ticket     │◀───│   API Response    │                        │
│  │  Renderer    │    │    Handler        │                        │
│  │  & Exporter  │    └───────────────────┘                        │
│  └──────────────┘                                                  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              Local Persistence (encrypted store)             │ │
│  │  API Keys · Last Provider/Model · Settings · Preferences     │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

**Data flow is strictly one-directional for sensitive fields:** UI → Local PII Guard → Prompt Builder → API (outbound only). No ticket data or IP addresses are ever stored remotely.

---

## 4. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend Framework | React (TypeScript) | Strict mode enabled |
| Styling | Tailwind CSS | Utility-first; no inline styles |
| State Management | Zustand | Lightweight, persistent-friendly |
| Local Persistence | `electron-store` (Electron) or `localStorage` with AES encryption (web) | API keys encrypted at rest |
| HTTP Client | Native `fetch` | No axios — minimize dependencies |
| Testing | Vitest + React Testing Library | 100% coverage required |
| Linting | ESLint + Prettier | Enforced in CI |
| Build Tool | Vite | Fast HMR and production builds |
| Package Manager | pnpm | Speed and lockfile integrity |
| CI/CD | GitHub Actions | Test, lint, build on every push/PR |

> **Target runtime:** Electron desktop app (primary) with a web fallback build. Electron enables native encrypted local storage for API keys and provides an offline-capable experience suitable for air-gapped MSSP environments.

---

## 5. Project Structure

```
ticketeer/
├── .github/
│   └── workflows/
│       ├── ci.yml                        # Lint, test, build on push/PR
│       └── release.yml                   # Tag-based release builds
├── src/
│   ├── main/                             # Electron main process
│   │   ├── index.ts
│   │   └── store.ts                      # Encrypted electron-store setup
│   ├── renderer/                         # React app (renderer process)
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── AlertForm/
│   │   │   │   ├── AlertForm.tsx         # Main alert input form
│   │   │   │   ├── AlertForm.test.tsx
│   │   │   │   ├── IpAddressField.tsx    # IP input with RFC1918 enforcement
│   │   │   │   ├── IpAddressField.test.tsx
│   │   │   │   └── index.ts
│   │   │   ├── TicketViewer/
│   │   │   │   ├── TicketViewer.tsx      # Rendered ticket display
│   │   │   │   ├── TicketViewer.test.tsx
│   │   │   │   └── index.ts
│   │   │   ├── Settings/
│   │   │   │   ├── SettingsPanel.tsx     # API keys, model selection, config
│   │   │   │   ├── SettingsPanel.test.tsx
│   │   │   │   ├── ApiKeyField.tsx       # Masked key input with save/delete
│   │   │   │   ├── ApiKeyField.test.tsx
│   │   │   │   └── index.ts
│   │   │   ├── ProviderSelector/
│   │   │   │   ├── ProviderSelector.tsx  # AI provider + model dropdown
│   │   │   │   ├── ProviderSelector.test.tsx
│   │   │   │   └── index.ts
│   │   │   └── shared/
│   │   │       ├── LoadingSpinner.tsx
│   │   │       ├── ErrorBanner.tsx
│   │   │       └── CopyButton.tsx
│   │   ├── hooks/
│   │   │   ├── useTicketGeneration.ts    # API call orchestration hook
│   │   │   ├── useTicketGeneration.test.ts
│   │   │   ├── useSettings.ts            # Settings persistence hook
│   │   │   └── useSettings.test.ts
│   │   ├── services/
│   │   │   ├── piiGuard.ts               # PII detection & blocking
│   │   │   ├── piiGuard.test.ts
│   │   │   ├── promptBuilder.ts          # Constructs full API prompt
│   │   │   ├── promptBuilder.test.ts
│   │   │   ├── providers/
│   │   │   │   ├── anthropic.ts          # Claude API client
│   │   │   │   ├── anthropic.test.ts
│   │   │   │   ├── gemini.ts             # Google Gemini API client
│   │   │   │   ├── gemini.test.ts
│   │   │   │   ├── openrouter.ts         # OpenRouter API client
│   │   │   │   ├── openrouter.test.ts
│   │   │   │   └── providerRouter.ts     # Routes to correct provider
│   │   │   └── encryption.ts             # AES encryption for key storage
│   │   ├── store/
│   │   │   ├── alertStore.ts             # Alert form state (Zustand)
│   │   │   ├── settingsStore.ts          # Settings/API keys state (Zustand)
│   │   │   └── ticketStore.ts            # Generated ticket state (Zustand)
│   │   ├── types/
│   │   │   ├── alert.types.ts            # AlertData interface
│   │   │   ├── ticket.types.ts           # TicketResult interface
│   │   │   ├── provider.types.ts         # Provider/model interfaces
│   │   │   └── settings.types.ts         # Settings interfaces
│   │   └── constants/
│   │       ├── providers.ts              # Provider names, model lists
│   │       ├── rfc1918.ts                # RFC 1918 ranges for validation
│   │       └── agentInstructions.ts      # The MSSP ticket instruction text (verbatim)
├── assets/
│   └── MSSP_Ticket_Agent_Instructions.md # Source of truth for ticket instructions
├── DEVELOPMENT_PHILOSOPHY.md            # Universal Dev Philosophy (linked from README)
├── MSSP_Ticket_Agent_Instructions.md    # AI agent ticket instructions (verbatim copy)
├── README.md                            # THIS FILE
├── package.json
├── pnpm-lock.yaml
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── .eslintrc.json
```

---

## 6. Feature Specifications

### 6.1 Alert Input Form (UI)

The alert input form is the primary interaction surface. It collects all alert fields and submits them for ticket generation.

#### Form Fields

| Field Label | Internal Key | Type | Required | Notes |
|---|---|---|---|---|
| Time | `timestamp` | Text input | No | Free-form; accepts formats like `Mar 4, 2026 @ 00:52:58.969` |
| Alert Category | `alert_category` | Text input | No | e.g., `Attempted Administrator Privilege Gain` |
| Alert Signature | `alert_signature` | Text input | **Yes** | e.g., `ET EXPLOIT Apache log4j RCE Attempt...`. This becomes the Alert Name in the ticket. |
| Source IP | `src_ip` | IP input + toggle | No | See IP field rules below |
| Source Port | `src_port` | Number input | No | 1–65535 |
| Destination IP | `dest_ip` | IP input + toggle | No | See IP field rules below |
| Destination Port | `dest_port` | Number input | No | 1–65535 |
| Protocol | `proto` | Select or text | No | e.g., `TCP`, `UDP`, `ICMP` |
| Application Protocol | `app_proto` | Text input | No | e.g., `http`, `https`, `dns`, `tls` |
| Reported by | `reported_by` | Text input | No | Analyst name. Never AI-generated. Left blank = placeholder in ticket. |

#### IP Address Field Rules (CRITICAL — see §8 for full PII spec)

Each IP field (Source IP, Destination IP) is a **custom component** with the following behavior:

1. **Default mode:** Private IP only. The input validates that the entered address falls within RFC 1918 ranges:
   - `10.0.0.0/8`
   - `172.16.0.0/12`
   - `192.168.0.0/16`
2. **If the analyst enters a public IP without toggling:** Display a red inline error — `"Public IP addresses cannot be submitted without marking this field as public. Toggle 'Public IP' to acknowledge."` The form cannot be submitted.
3. **"Public IP" toggle:** A clearly labeled checkbox/toggle adjacent to the IP field labeled `"This is a public IP (I acknowledge this)"`. When enabled, the IP field accepts any valid IPv4 address.
4. **In the prompt sent to the AI:** Public IPs are passed normally. The AI agent handles AbuseIPDB lookups per its instructions. The public/private status is also passed in the prompt metadata so the agent is not required to re-classify.

#### Submit Behavior

- The **Generate Ticket** button is disabled until `alert_signature` is populated.
- On submit, all form data passes through the **PII Guard Layer** (§6.2) before touching the prompt builder.
- A loading state is shown while the API call is in progress with an animated spinner and status message.
- Errors from the API are displayed inline, with the original form data preserved for re-submission.

---

### 6.2 PII Detection & Prevention

**The PII Guard is a synchronous, local validation layer.** It runs on all field values before any data is packaged into the API prompt. It is not a network call — it is entirely client-side logic.

#### What the PII Guard Checks

| Check | Pattern/Rule | Action on Failure |
|---|---|---|
| IP is public without toggle | Public IPv4 not in RFC 1918, toggle not set | Block submission; show field error |
| Email addresses in any text field | Standard email regex | Block submission; show error + field highlight |
| Social Security Number patterns | `\d{3}-\d{2}-\d{4}` and variants | Block submission |
| Phone numbers | E.164 and NANP patterns | Block submission |
| Full name patterns in non-analyst fields | Heuristic: `[A-Z][a-z]+ [A-Z][a-z]+` in free-text fields | Warn; do not block (names may be in alert signatures) |
| Credit card number patterns | Luhn algorithm check + pattern match | Block submission |

> **Design principle:** The PII guard prefers false positives (blocking valid data) over false negatives (allowing PII through). When in doubt, block and prompt the analyst to review the field.

#### PII Guard Output

Returns one of:
- `{ valid: true }` — proceed to prompt builder
- `{ valid: false, errors: Array<{ field: string; message: string }> }` — display errors, halt submission

---

### 6.3 AI Provider & Model Selection

The UI includes a **Provider & Model Selector** component, accessible from both the main form and the settings panel.

#### Supported Providers

| Provider | Identifier | API Key Setting Key |
|---|---|---|
| Anthropic Claude | `anthropic` | `anthropicApiKey` |
| Google Gemini | `gemini` | `geminiApiKey` |
| OpenRouter | `openrouter` | `openrouterApiKey` |

#### Model Lists

Model lists are fetched dynamically from each provider's model listing API at startup (if an API key is present) and cached for the session. A fallback static list is provided for each provider in `constants/providers.ts` in case the dynamic fetch fails.

**Static fallback model lists (minimum):**

- **Anthropic:** `claude-opus-4-5`, `claude-sonnet-4-5`, `claude-haiku-4-5`
- **Gemini:** `gemini-2.5-pro`, `gemini-2.0-flash`, `gemini-1.5-pro`
- **OpenRouter:** `openai/gpt-4o`, `anthropic/claude-opus-4-5`, `google/gemini-2.5-pro`, `meta-llama/llama-3.1-405b-instruct` (and others from the OpenRouter model list API)

#### Persistence

- The last-used provider and model are saved to local persistent storage immediately on change.
- On application restart, the last-used provider and model are restored and pre-selected in the UI.
- If the last-used model is no longer available (e.g., deprecated), the selector falls back to the first model in the provider's list and notifies the user.

---

### 6.4 API Key & Settings Management

All API keys and settings are managed through the **Settings Panel**, accessible from a gear icon in the main navigation.

#### API Key Fields

For each provider (Anthropic, Gemini, OpenRouter), the settings panel includes:

1. **Masked input field** — Shows `••••••••[last 4 chars]` when a key is saved. Placeholder text when empty.
2. **Reveal button** — Temporarily shows the full key for verification.
3. **Save button** — Saves the key to encrypted local storage.
4. **Delete button** — Removes the key from storage with a confirmation prompt.
5. **Validation indicator** — On save, the key format is validated (e.g., Anthropic keys start with `sk-ant-`). An optional "Test" button can make a minimal test API call to verify the key is valid.

#### Settings Fields (Beyond API Keys)

| Setting | Type | Default | Notes |
|---|---|---|---|
| Default AI Provider | Select | (last used) | Synced with provider selector |
| Default Model | Select | (last used) | Synced with model selector |
| Theme | Select | `system` | `light`, `dark`, `system` |
| Max Output Tokens | Number | `4096` | Sent with each API request |

#### Security Requirements for Key Storage

- **Electron build:** API keys are stored in `electron-store` with AES-256 encryption. The encryption key is derived from a machine-specific identifier (hardware fingerprint) so keys cannot be trivially copied between machines.
- **Web build:** API keys are stored in `localStorage` encrypted with AES-256 via the `crypto-js` library, using a session-derived key stored in `sessionStorage`.
- **In-memory during runtime:** Keys are decrypted into memory only when an API call is made, and cleared from memory immediately after the call completes.
- **No key is ever included in a log, error message, or console output.**

---

### 6.5 Ticket Generation Engine

This is the core orchestration layer. It is invoked when the analyst submits the alert form.

#### Processing Pipeline (in order)

```
1. AlertForm.onSubmit(formData)
        ↓
2. PII Guard: validate(formData)
   → If invalid: return errors to form; halt
        ↓
3. PromptBuilder: buildPrompt(formData, agentInstructions)
   → Produces: { systemPrompt, userMessage }
        ↓
4. ProviderRouter: route(provider, model, prompt, apiKey)
   → Selects correct API client
        ↓
5. API Client: call(systemPrompt, userMessage, model, apiKey, maxTokens)
   → Returns: rawTicketText (string)
        ↓
6. TicketStore: setTicket(rawTicketText)
        ↓
7. TicketViewer: render(rawTicketText)
```

#### Error Handling

- **Network errors:** Display a user-facing error with the original form preserved for retry.
- **API auth errors (401/403):** Display `"API key invalid or expired — check Settings."` with a link to the settings panel.
- **Rate limit errors (429):** Display `"Rate limit reached. Please wait and try again."` with a retry button.
- **Context length errors:** Display `"The prompt exceeded the model's context limit. Try a shorter alert or a model with a larger context window."`
- **All other API errors:** Display the provider's error message in a collapsible section for analyst review. Never swallow API errors silently.

---

### 6.6 Ticket Display & Export

Once a ticket is generated, it is displayed in the **Ticket Viewer** panel.

#### Display Requirements

- Render the ticket as **monospaced preformatted text** to preserve the exact template structure.
- Clearly display unfilled placeholders (e.g., `[Customer Name Here]`) in a distinct amber/orange color so the analyst knows what still needs manual completion.
- A legend below the ticket explains the highlighted placeholder convention.
- Display the provider name and model used to generate the ticket as a small, non-intrusive label.
- Display a timestamp of when the ticket was generated.

#### Export / Copy Options

- **Copy to Clipboard** — Copies the full raw ticket text.
- **Download as .txt** — Saves the ticket as a plain-text file named `ticket_[timestamp].txt`.
- **Download as .md** — Saves the ticket as a Markdown file.

#### Edit Mode

The analyst can click **Edit** to enter an inline edit mode:

- The monospaced `<pre>` display is replaced by a full-height `<textarea>` pre-filled with the current ticket content.
- The analyst can type freely to fill in placeholders, correct AI output, or add context.
- **Save** commits the edits to the ticket store and returns to read mode.
- **Cancel** discards changes and returns to read mode.
- While in edit mode, the placeholder legend is hidden (all text is editable directly in the textarea).

#### AI Revision Panel

Below the ticket content, a persistent **"Revise a Section with AI"** panel allows targeted AI rewrites:

1. **Select text** in the ticket (read mode) or the edit textarea (edit mode) and click **"Use Selection"** — the selected text is captured into the "Selected section" textarea.
   - Alternatively, the analyst can paste any text directly into the "Selected section" textarea.
2. Enter a **Revision instruction** (e.g., `"Make this section more concise and professional."`).
3. Click **"Revise with AI"** — the application:
   - Runs the **PII Guard's `scanFreeText`** on both the selected text and the instruction. If any PII pattern is detected in either input, the revision is blocked and an error is shown. No data is sent to the API.
   - If clean, calls the configured AI provider using `buildRevisionPrompt` (a targeted revision prompt, distinct from the full ticket generation prompt).
   - Displays the **revised text preview** below the inputs.
4. The analyst can **Apply** (replaces the selected text in the ticket with the revision) or **Discard** (clears the preview without changes).

**Key constraints:**
- `isRevising` spinner is shown on the Revise button during the API call.
- PII checks run synchronously before any async API call begins — no loading state is shown for fast-failing PII violations.
- All revision prompts use the same system prompt (MSSP Agent Instructions) as ticket generation.

---

### 6.7 Persistence Layer

| Data | Storage Method | Encrypted | Persists Across Restarts |
|---|---|---|---|
| API Keys | `electron-store` (Electron) / AES `localStorage` (web) | ✅ Yes | ✅ Yes |
| Last Used Provider | `electron-store` / `localStorage` | ❌ No | ✅ Yes |
| Last Used Model | `electron-store` / `localStorage` | ❌ No | ✅ Yes |
| Settings (theme, tokens) | `electron-store` / `localStorage` | ❌ No | ✅ Yes |
| Alert Form State | In-memory (Zustand) | N/A | ❌ No (intentional — no data retention) |
| Generated Ticket | In-memory (Zustand) | N/A | ❌ No (intentional — no data retention) |

> **Important:** Alert form data and generated tickets are **never** persisted to disk. This is an intentional security design — analysts working on sensitive MSSP tickets should not have partially-completed ticket data automatically saved.

---

## 7. AI Agent Instructions

The complete MSSP Ticket Agent Instructions are stored verbatim in two places:

1. **File:** [`MSSP_Ticket_Agent_Instructions.md`](./MSSP_Ticket_Agent_Instructions.md) — the source of truth.
2. **Code constant:** `src/renderer/constants/agentInstructions.ts` — the text loaded into prompts at runtime.

**The text in `agentInstructions.ts` must always exactly match `MSSP_Ticket_Agent_Instructions.md`.** Any update to the instructions file requires a corresponding update to the constant, covered by a dedicated unit test.

The instructions are passed as the **system prompt** on every API call. See §10 for the full prompt construction specification.

---

## 8. PII Rules — Definitive Reference

This section is the definitive, machine-readable specification of all PII and confidentiality rules enforced by Ticketeer.

### IP Address Rules

```
RFC 1918 Private Ranges:
  10.0.0.0    – 10.255.255.255   (10.0.0.0/8)
  172.16.0.0  – 172.31.255.255   (172.16.0.0/12)
  192.168.0.0 – 192.168.255.255  (192.168.0.0/16)

Excluded (not considered public, not accepted):
  127.0.0.0/8      (loopback)
  169.254.0.0/16   (link-local)
  0.0.0.0          (invalid)

Rules:
  1. An IP field value MUST be a valid IPv4 address in dotted-decimal notation.
  2. If the IP is within an RFC 1918 range → always allowed.
  3. If the IP is NOT within RFC 1918, loopback, or link-local:
       a. AND the "Public IP" toggle for that field is OFF → BLOCK. Show error.
       b. AND the "Public IP" toggle for that field is ON  → ALLOW. Pass to prompt.
  4. IPv6 addresses are not currently supported. Show a "Not supported" error.
```

### Analyst Name Rules

```
  1. "Reported by" is always a human-entered value.
  2. If left blank → the ticket will contain [Analyst Name Here] as the placeholder.
     This is correct behavior.
  3. The AI agent is NEVER permitted to fill in the analyst name field.
     The prompt explicitly instructs the agent to leave [Analyst Name Here] as-is.
  4. The application NEVER pre-fills this field with the agent's name or any AI-generated value.
```

### Customer Name Rules

```
  1. There is NO "Customer Name" field in the UI.
  2. Customer name is NEVER sent to the AI.
  3. The ticket will always contain [Customer Name Here] as the placeholder.
  4. The analyst fills this in manually after copying/downloading the ticket.
```

### Free-Text Field PII Scanning (Alert Form)

```
  Fields scanned: timestamp, alert_category, alert_signature, proto, app_proto, reported_by

  Block patterns:
    Email:          /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/
    SSN:            /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/
    Phone (NANP):   /(\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/
    Credit Card:    /\b(?:\d[ -]?){13,16}\b/ with Luhn validation

  Warn patterns (do not block):
    Full names:     /\b[A-Z][a-z]{1,30}\s[A-Z][a-z]{1,30}\b/
    (Warn only — alert signatures can contain technology/company names)
```

### AI Revision Free-Text PII Scanning (`scanFreeText`)

Before any AI revision API call, **both** the selected ticket section and the revision instruction are independently scanned using `piiGuard.scanFreeText()`:

```
  Inputs scanned: selectedText (ticket section), instruction (revision directive)

  Block patterns (same as alert form):
    Email, SSN, Phone (NANP), Credit Card (Luhn-validated)

  Returns:
    { safe: true }                      — inputs are clean; proceed to API
    { safe: false, violations: [...] }  — block; show error; no API call made

  Note: Full-name pattern is NOT applied here (analyst may legitimately quote
  a ticket section that contains a client-submitted name in the signature text).
```

---

## 9. API Integration Specifications

All three providers receive the **same logical prompt** (system + user). The formatting and endpoint differ per provider.

### 9.1 Anthropic Claude

- **Endpoint:** `POST https://api.anthropic.com/v1/messages`
- **Auth Header:** `x-api-key: <ANTHROPIC_API_KEY>`
- **Required Header:** `anthropic-version: 2023-06-01`
- **Request Body:**
  ```json
  {
    "model": "<selected_model>",
    "max_tokens": <maxOutputTokens>,
    "system": "<systemPrompt>",
    "messages": [
      { "role": "user", "content": "<userMessage>" }
    ]
  }
  ```
- **Response:** `response.content[0].text`
- **Key format validation:** Starts with `sk-ant-`

### 9.2 Google Gemini

- **Endpoint:** `POST https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent?key=<GEMINI_API_KEY>`
- **Request Body:**
  ```json
  {
    "system_instruction": {
      "parts": [{ "text": "<systemPrompt>" }]
    },
    "contents": [
      { "role": "user", "parts": [{ "text": "<userMessage>" }] }
    ],
    "generationConfig": {
      "maxOutputTokens": <maxOutputTokens>
    }
  }
  ```
- **Response:** `response.candidates[0].content.parts[0].text`
- **Key format validation:** Alphanumeric, typically 39 characters

### 9.3 OpenRouter

- **Endpoint:** `POST https://openrouter.ai/api/v1/chat/completions`
- **Auth Header:** `Authorization: Bearer <OPENROUTER_API_KEY>`
- **Required Headers:**
  - `HTTP-Referer: https://github.com/FatStinkyPanda/ticketeer`
  - `X-Title: Ticketeer`
- **Request Body:**
  ```json
  {
    "model": "<selected_model>",
    "max_tokens": <maxOutputTokens>,
    "messages": [
      { "role": "system", "content": "<systemPrompt>" },
      { "role": "user", "content": "<userMessage>" }
    ]
  }
  ```
- **Response:** `response.choices[0].message.content`
- **Key format validation:** Starts with `sk-or-`

---

## 10. Prompt Construction Specification

The prompt builder (`src/renderer/services/promptBuilder.ts`) constructs two strings for every API call:

### System Prompt

The system prompt is **the full, verbatim text of `MSSP_Ticket_Agent_Instructions.md`**, loaded from `constants/agentInstructions.ts`.

No modifications, no summarization, no truncation. The complete instructions are sent on every call.

### User Message

The user message is a structured block containing all provided alert fields:

```
You are completing a ticket for the following security alert. Use the instructions above to fill in the ticket template as completely as the provided data allows.

ALERT DATA:
---
{{#if timestamp}}Time: {{timestamp}}{{/if}}
{{#if alert_category}}alert.category: {{alert_category}}{{/if}}
{{#if alert_signature}}alert.signature: {{alert_signature}}{{/if}}
{{#if src_ip}}src_ip: {{src_ip}} [{{src_ip_type}}]{{/if}}
{{#if src_port}}src_port: {{src_port}}{{/if}}
{{#if dest_ip}}dest_ip: {{dest_ip}} [{{dest_ip_type}}]{{/if}}
{{#if dest_port}}dest_port: {{dest_port}}{{/if}}
{{#if proto}}proto: {{proto}}{{/if}}
{{#if app_proto}}app_proto: {{app_proto}}{{/if}}
{{#if reported_by}}Reported by (analyst name — use this value in the "Reported by" field exactly as provided): {{reported_by}}{{/if}}
---

Where [PRIVATE] or [PUBLIC] appears after an IP address, this indicates the IP classification as determined by the application before sending to you. Use this classification directly.

Generate the completed ticket now. Output only the ticket text — no preamble, no explanation, no markdown formatting around the ticket content.
```

**Template variables:**
- `{{src_ip_type}}` and `{{dest_ip_type}}` are either `PRIVATE` or `PUBLIC`, determined by the PII Guard before the API call.
- Only fields that have non-empty values are included in the message. Empty fields are omitted entirely — the agent infers "not provided" from their absence.

### Revision Prompt (`buildRevisionPrompt`)

Used exclusively by the AI Revision feature (§6.6). The system prompt is identical to ticket generation (verbatim `AGENT_INSTRUCTIONS`). The user message is a targeted revision block:

```
You are revising a specific section of an incident ticket.

Original section:
---
{{selectedText}}
---

Revision instruction: {{instruction}}

Return ONLY the revised text for this section. Preserve the plain-text formatting style — no markdown, no preamble, no surrounding commentary.
```

- `{{selectedText}}` — the text selected by the analyst from the ticket (post PII scan)
- `{{instruction}}` — the analyst's revision directive (post PII scan)
- Both inputs are independently scanned by `scanFreeText` before this prompt is constructed.

---

## 11. Settings & Persistence Specification

### Electron Store Schema

```typescript
interface TicketeerSettings {
  // API Keys (AES-256 encrypted)
  anthropicApiKey: string | null;
  geminiApiKey: string | null;
  openrouterApiKey: string | null;

  // Last used provider/model (plaintext)
  lastProvider: 'anthropic' | 'gemini' | 'openrouter' | null;
  lastModel: string | null;

  // User preferences
  theme: 'light' | 'dark' | 'system';
  maxOutputTokens: number; // default: 4096
}
```

### Settings Mutation Rules

- Keys are encrypted **before** being written to the store. Plaintext keys never touch the disk.
- Keys are decrypted **on demand** — only when `providerRouter.call()` is invoked.
- The `lastProvider` and `lastModel` values are updated **immediately** when the user changes the selection in the UI.
- Deleting a key sets its store value to `null` and clears it from memory.

---

## 12. Testing Requirements

### Mandate

> **100% test coverage and 100% test pass rate are required at all times throughout development.**
> No code is merged to `main` without all tests passing. No test is written to artificially pass.

### Test Stack

- **Unit tests:** Vitest + `@testing-library/react`
- **Coverage:** Vitest's built-in V8 coverage provider
- **Assertion:** Vitest `expect` API

### Coverage Requirements

Run with:
```bash
pnpm test:coverage
```

Coverage thresholds enforced in `vitest.config.ts`:
```typescript
coverage: {
  provider: 'v8',
  thresholds: {
    lines: 100,
    functions: 100,
    branches: 100,
    statements: 100,
  }
}
```

### Current Test Status

> **459 tests · 24 test files · 100% pass rate · 100% coverage** (statements, branches, functions, lines)

### Required Test Suites

| Module | Tests Required |
|---|---|
| `piiGuard.ts` | All RFC 1918 ranges pass; all public IPs without toggle fail; email/SSN/phone/CC patterns detected; valid alert signatures not flagged; `scanFreeText` returns safe/unsafe correctly for all PII patterns |
| `promptBuilder.ts` | System prompt equals verbatim agent instructions; user message includes only provided fields; IP type tags correct; empty fields omitted; `buildRevisionPrompt` contains selected text, instruction, revision context header, separator lines, and "Return ONLY" directive |
| `IpAddressField.tsx` | Private IPs accepted; public IPs blocked without toggle; public IPs accepted with toggle; invalid IPs rejected; IPv6 rejected |
| `AlertForm.tsx` | Form disabled without signature; PII errors displayed; submit calls generation hook; loading state shown; API errors displayed |
| `anthropic.ts` | Correct endpoint called; correct headers sent; response parsed correctly; 401/429/500 errors handled |
| `gemini.ts` | Same as anthropic equivalents for Gemini endpoint |
| `openrouter.ts` | Same as anthropic equivalents; OpenRouter-specific headers sent |
| `providerRouter.ts` | Routes to correct client per provider selection |
| `SettingsPanel.tsx` | Key saved on click; key deleted on confirm; masked display; reveal toggle; validation indicator shown |
| `ProviderSelector.tsx` | All three providers selectable; model list populated; last-used persisted |
| `useSettings.ts` | Loads from store on mount; saves on change; encryption round-trip integrity |
| `useTicketGeneration.ts` | Invokes PII guard → prompt builder → provider router; sets loading/error/ticket state; `updateContent` updates ticket in store; `reviseSection` blocks on PII violations; `reviseSection` succeeds with correct provider/model/key; `isRevising` state transitions correctly |
| `TicketViewer.tsx` | Placeholder highlighting; edit mode enter/save/cancel; textarea pre-filled; `onUpdateContent` called on save; AI revision panel: disabled states, Revise button spinner, revision preview display, Apply/Discard behavior, null result handling; `Use Selection` captures window.getSelection (read mode) and textarea selectionStart/End (edit mode) |
| `agentInstructions.ts` | Constant text exactly matches `MSSP_Ticket_Agent_Instructions.md` content |
| `encryption.ts` | Encrypt then decrypt returns original; different values produce different ciphertext |

---

## 13. GitHub & CI/CD

### Repository

**`https://github.com/FatStinkyPanda/ticketeer`**

### Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Always deployable. Protected. Requires passing CI and PR review. |
| `develop` | Integration branch. All feature branches merge here first. |
| `feature/<name>` | Individual feature work |
| `fix/<name>` | Bug fixes |
| `release/<version>` | Release preparation |

### Commit Convention

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add Gemini API client
fix: block public IPs without toggle
test: add 100% coverage for piiGuard
chore: update dependencies
docs: expand README with API specs
refactor: extract IP validation to shared util
```

### CI Workflow (`.github/workflows/ci.yml`)

Runs on every push and pull request to `main` and `develop`:

```yaml
steps:
  - Checkout
  - Setup Node + pnpm
  - Install dependencies (pnpm install --frozen-lockfile)
  - Lint (pnpm lint)
  - Type check (pnpm typecheck)
  - Run tests with coverage (pnpm test:coverage)
  - Fail if any coverage threshold < 100%
  - Build (pnpm build)
```

**The CI pipeline is the gate. Nothing merges to `main` if CI does not pass.**

### Release Workflow (`.github/workflows/release.yml`)

Triggered by a `v*` tag push (e.g., `v1.0.0`):

```yaml
steps:
  - All CI steps (must pass)
  - Build Electron distributables (Windows .exe, macOS .dmg, Linux .AppImage)
  - Create GitHub Release with built artifacts attached
```

---

## 14. Development Roadmap & Task List

AI agents executing the DEV workflow must work through this list in order. Mark tasks complete by replacing `[ ]` with `[x]` in this file and committing the change.

### Phase 0 — Repository Bootstrap

- [ ] Initialize repository at `https://github.com/FatStinkyPanda/ticketeer`
- [ ] Create project with Vite + React + TypeScript template
- [ ] Configure pnpm, ESLint, Prettier, Tailwind CSS
- [ ] Configure Vitest with V8 coverage and 100% thresholds
- [ ] Set up GitHub Actions CI workflow
- [ ] Add `DEVELOPMENT_PHILOSOPHY.md` and `MSSP_Ticket_Agent_Instructions.md` to repo root
- [ ] Create `agentInstructions.ts` constant from instructions file
- [ ] Write test: `agentInstructions.ts` content equals file content
- [ ] Set up Electron with `electron-store` and AES encryption
- [ ] Establish all TypeScript interfaces in `src/renderer/types/`
- [ ] Confirm: all tests pass, coverage 100%
- [ ] Commit and push: `chore: project bootstrap`

### Phase 1 — Core Services (No UI)

- [ ] Implement `encryption.ts` with AES-256 encrypt/decrypt
- [ ] Write 100% tests for `encryption.ts`
- [ ] Implement `piiGuard.ts` with all rules from §8
- [ ] Write 100% tests for `piiGuard.ts`
- [ ] Implement `promptBuilder.ts` per §10 specification
- [ ] Write 100% tests for `promptBuilder.ts`
- [ ] Implement `anthropic.ts` API client per §9.1
- [ ] Write 100% tests for `anthropic.ts` (mocked fetch)
- [ ] Implement `gemini.ts` API client per §9.2
- [ ] Write 100% tests for `gemini.ts` (mocked fetch)
- [ ] Implement `openrouter.ts` API client per §9.3
- [ ] Write 100% tests for `openrouter.ts` (mocked fetch)
- [ ] Implement `providerRouter.ts`
- [ ] Write 100% tests for `providerRouter.ts`
- [ ] Confirm: all tests pass, coverage 100%
- [ ] Commit and push: `feat: implement core services layer`

### Phase 2 — State & Persistence

- [ ] Implement Zustand stores: `alertStore`, `settingsStore`, `ticketStore`
- [ ] Implement `useSettings.ts` hook with encrypted persistence
- [ ] Write 100% tests for `useSettings.ts`
- [ ] Implement `useTicketGeneration.ts` hook
- [ ] Write 100% tests for `useTicketGeneration.ts`
- [ ] Confirm: all tests pass, coverage 100%
- [ ] Commit and push: `feat: implement state management and persistence`

### Phase 3 — UI Components

- [ ] Implement `IpAddressField.tsx` with RFC 1918 enforcement and public toggle
- [ ] Write 100% tests for `IpAddressField.tsx`
- [ ] Implement `AlertForm.tsx` with all fields from §6.1
- [ ] Write 100% tests for `AlertForm.tsx`
- [ ] Implement `ProviderSelector.tsx` with dynamic model lists and fallback
- [ ] Write 100% tests for `ProviderSelector.tsx`
- [ ] Implement `ApiKeyField.tsx` (masked, reveal, save, delete, validation)
- [ ] Write 100% tests for `ApiKeyField.tsx`
- [ ] Implement `SettingsPanel.tsx`
- [ ] Write 100% tests for `SettingsPanel.tsx`
- [x] Implement `TicketViewer.tsx` with placeholder highlighting, copy, download, edit mode, and AI revision panel
- [x] Write 100% tests for `TicketViewer.tsx`
- [ ] Implement `LoadingSpinner`, `ErrorBanner`, `CopyButton` shared components
- [ ] Write tests for all shared components
- [ ] Confirm: all tests pass, coverage 100%
- [ ] Commit and push: `feat: implement UI component layer`

### Phase 4 — Integration & Assembly

- [ ] Assemble `App.tsx` with full navigation and layout
- [ ] Wire `AlertForm` → `useTicketGeneration` → `TicketViewer` end-to-end
- [ ] Wire `SettingsPanel` → `useSettings` → persistence end-to-end
- [ ] Wire `ProviderSelector` ↔ `settingsStore` with last-used persistence
- [ ] Implement full error display pipeline from API errors to UI
- [ ] Implement theme support (light/dark/system)
- [ ] Write integration tests for full form-to-ticket pipeline
- [ ] Confirm: all tests pass, coverage 100%
- [ ] Commit and push: `feat: full application integration`

### Phase 5 — Electron Packaging

- [ ] Configure Electron main process with IPC for settings store
- [ ] Implement machine-specific encryption key derivation
- [ ] Configure `electron-builder` for Windows, macOS, and Linux targets
- [ ] Set up release GitHub Actions workflow with artifact upload
- [ ] Test builds on each platform
- [ ] Confirm: all tests pass, coverage 100%
- [ ] Commit and push: `feat: electron packaging and release pipeline`

### Phase 6 — Polish & Production Readiness

- [ ] Accessibility audit (keyboard navigation, ARIA labels, screen reader support)
- [ ] Add keyboard shortcut: `Ctrl/Cmd + Enter` to submit form
- [ ] Add "Clear Form" button with confirmation
- [x] Add "New Ticket" button in ticket viewer to reset form
- [x] Add inline ticket editing (Edit/Save/Cancel) and AI-assisted section revision (Revise with AI)
- [x] Add `scanFreeText` PII guard for revision inputs
- [x] Verify all error states have user-readable messages
- [x] Verify all loading states are correctly shown/hidden
- [ ] README final review — update all task checkboxes
- [ ] Tag release `v1.0.0`
- [ ] Confirm: all tests pass, coverage 100%
- [ ] Final commit and push: `release: v1.0.0`

---

## 15. Definition of Done

A feature is **done** when ALL of the following are true:

```
✅ Implementation is complete and working as specified
✅ All tests for the feature are written and passing
✅ Test coverage for all files touched remains at 100%
✅ No existing tests have been broken
✅ Code passes ESLint and Prettier with zero warnings
✅ TypeScript compiles with zero errors (strict mode)
✅ The change has been committed to the correct branch with a Conventional Commit message
✅ CI pipeline passes on the pushed branch
✅ The corresponding task checkbox in the Roadmap section of this README has been checked
✅ No placeholder, mock, or simulated behavior has been introduced
✅ The Universal Development Philosophy has been followed in full
```

---

> *This README is the single source of truth for Ticketeer. All architectural decisions, feature specifications, constraints, and task tracking live here. When in doubt, this document governs.*

*Last updated: 2026-03-04*
