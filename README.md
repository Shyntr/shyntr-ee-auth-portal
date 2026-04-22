# Shyntr EE Auth Portal

`shyntr-ee-auth-portal` is the enterprise auth portal runtime for Shyntr.

This repository is responsible for rendering the user-facing authentication experience, including login, consent, and logout pages. It is intended to host enterprise-specific runtime presentation concerns such as branded auth rendering, runtime theme application, and tenant-scoped published branding consumption.

## Scope

This repository owns:

- Branded login, consent, and logout rendering
- Runtime theme application
- Tenant-scoped published branding consumption
- Auth UI presentation

This repository does not own:

- Branding persistence
- Branding editor UX
- Backend management API ownership
- Backend auth domain truth

## Backend dependency

This runtime depends on the Shyntr backend for auth transaction state and continuation. The backend remains the source of truth for:

- Login and consent challenge state
- Tenant context derived from auth/backend state
- Auth continuation and redirect behavior
- Available login methods and protocol-specific handling

The portal should treat backend-provided published branding as runtime input. It should not introduce local ownership of branding data or modify auth protocol semantics.

## Runtime architecture

- Framework: Next.js App Router
- Styling: Tailwind CSS with shared CSS variables
- Package manager: Yarn 1.22.x
- Container runtime: Docker using Next.js standalone output

## Local development

### Prerequisites

- Node.js 22.x
- Yarn 1.22.x

### Environment

The runtime expects backend origins to be configured through environment variables:

- `SHYNTR_INTERNAL_API_URL`
- `SHYNTR_PUBLIC_API_URL`

Example local values:

```bash
SHYNTR_INTERNAL_API_URL=http://localhost:7497
SHYNTR_PUBLIC_API_URL=http://localhost:7496
```

### Install and run

```bash
yarn install --frozen-lockfile
yarn dev
```

The development server listens on `http://localhost:3000`.

## Production build

Build the application:

```bash
yarn build
```

Start the production server:

```bash
yarn start
```

Build the Docker image:

```bash
docker build -t shyntr/shyntr-ee-auth-portal:latest .
```

Run the Docker image:

```bash
docker run -d -p 3000:3000 --name shyntr-ee-auth-portal shyntr/shyntr-ee-auth-portal:latest
```

## CI and release artifacts

GitHub Actions builds and publishes the runtime container image for this repository. The current Docker artifact target is:

- `shyntr/shyntr-ee-auth-portal`

## License

See the existing repository license materials for current licensing terms.
