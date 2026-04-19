# AGENTS.md

## Purpose

This repository is the enterprise auth portal runtime for Shyntr.

It owns:
- branded login/consent/logout rendering
- runtime theme application
- tenant-scoped published branding consumption
- auth UI presentation

It does NOT own:
- branding persistence
- branding editor UX
- backend domain truth
- management API ownership

---

## Core Rules

- Treat Shyntr backend as the source of truth
- Treat published branding as runtime input, not local truth
- Keep auth flow correctness intact
- Never weaken tenant isolation
- Never log secrets, tokens, passwords, raw assertions, or session contents
- All code-facing text must be in English

---

## Auth Contract Rules

Do not break:
- login flow
- consent flow
- logout flow
- challenge continuity
- redirect continuity
- tenant-scoped auth routes

Do not let branding work modify auth protocol semantics.

Branding must be a rendering concern unless explicitly designed otherwise.

---

## Branding Rules

This portal renders published branding only.

Expected behavior:
- resolve tenant from the active auth transaction
- load published branding for that tenant
- apply branding at runtime
- gracefully fall back to system defaults if branding is unavailable

Do not edit branding from this repository.
Do not render draft branding in normal runtime flows.

---

## Theme Application Rules

Prefer CSS variables and bounded theme mapping.

Apply branding to:
- page background
- widget/card container
- logo placement
- text colors
- button colors
- input colors
- border radius / border weight / shadow

Avoid broad rewrites of existing auth components.

---

## Runtime Safety Rules

- Failure to load branding must not break login or consent
- Fallback to default theme must be deterministic
- Do not block auth continuation because branding is unavailable
- Do not create redirect loops or SSR-only brittle behavior

---

## Tenant Rules

- Never hardcode tenant IDs
- Never mix branding across tenants
- Tenant context must be derived from confirmed backend/auth state
- Do not trust query params alone when stronger backend state exists

---

## Change Completeness Checklist

Before finalizing, verify:
- branding fetch path
- default fallback behavior
- CSS variable mapping
- layout/card/footer integration
- login page
- consent page
- logout page
- no auth flow regression

---

## Testing Rules

Minimum validation:
- branded tenant renders published theme
- missing branding falls back to default theme
- branding failure does not break auth flow
- tenant A branding does not appear for tenant B
- login/consent still continue correctly

Use integration-style validation where possible.

---

## Review Output Preference

When reviewing or implementing:
1. Current state
2. Problem / risk
3. Files to change
4. Full updated files
5. Targeted validation

Return full files unless explicitly asked for diffs.