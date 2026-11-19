# KABUSphere

> **The campus market, made closer.**

KABUSphere is a campus community and marketplace for the Kabarak University community. It brings campus listings, community posts, student services, profiles, and notifications together in one place so students can discover useful things and connect with one another more easily.

**Live application:** [kabusphere.vercel.app](https://kabusphere.vercel.app)

## What KABUSphere provides

- **Marketplace** — Browse listings and publish items for sale within the campus community.
- **Campus feed** — Share and discover updates, questions, and conversations from campus.
- **Student services** — Discover services offered by members of the community.
- **Profiles** — Complete an account, manage profile details, and view your marketplace activity.
- **Authentication** — Sign in with Google through Supabase Auth. Access is intended for Kabarak community accounts.
- **Notifications** — Progressive Web App support and web push notification infrastructure.
- **Administration** — Admin-only dashboard access for basic platform and activity metrics.

## Product flow

1. Visit the public marketplace and browse available listings.
2. Sign in with a Google account when you want to participate.
3. Complete onboarding and add your profile details.
4. Browse the marketplace, publish a listing, share a campus post, or explore services.
5. Contact sellers using the contact details they provide and arrange transactions directly.

KABUSphere does not take custody of products or guarantee transactions arranged between users. Review the [Terms of Use](/terms) and [Privacy Policy](/privacy) before deploying or operating the service.

## Technology

| Area | Technology |
| --- | --- |
| Application | Next.js 16 with the App Router |
| UI | React 19, Tailwind CSS 4, Lucide React |
| Authentication and data | Supabase Auth and Supabase Database |
| Image uploads | Cloudinary |
| Notifications | Web Push and a service worker |
| Hosting | Vercel |
| Language | TypeScript |

## Getting started

### Prerequisites

- Node.js 18 or newer
- npm (the repository includes `package-lock.json`)
- A Supabase project
- Google OAuth credentials configured for Supabase Auth
- A Cloudinary account and unsigned upload preset
- VAPID keys if web push notifications are enabled

### 1. Clone and install

```bash
git clone https://github.com/Ouresteve/KABUSPHERE.git
cd KABUSPHERE
npm install
```

### 2. Configure environment variables

Create `.env.local` in the repository root:

```env
NEXT_PUBLIC_SITE_URL=https://kabusphere.vercel.app

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-unsigned-upload-preset

NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Canonical site URL used for metadata and the sitemap. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public Supabase client key. |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Yes for image uploads | Cloudinary cloud name. |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Yes for image uploads | Cloudinary unsigned upload preset. |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Yes for push notifications | Public VAPID key used by the browser. |
| `VAPID_PRIVATE_KEY` | Yes for push notifications | Private VAPID key used by the server. Keep this secret. |

Do not commit `.env.local`, private keys, service-role keys, or OAuth client secrets. The public Supabase anon key and public VAPID key are designed for client-side use; server-only secrets are not.

### 3. Configure Supabase

Before using the application, configure:

- Google as an enabled Supabase Auth provider.
- The application URL and callback URL in the Google and Supabase settings.
- The database tables and policies expected by the application, including user profiles, posts, listings, favorites, services, and notification subscriptions.
- An administrator profile role for accounts that need access to the admin dashboard.

The OAuth callback route is `/auth/callback`. In local development, add the corresponding local URL to the allowed redirect URLs in Supabase.

### 4. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

| Route | Description | Access |
| --- | --- | --- |
| `/` | Public landing page | Public |
| `/market` | Marketplace listings | Public browsing; sign-in for participation |
| `/market/list` | Create a marketplace listing | Authenticated |
| `/market/manage` | Manage your listings | Authenticated |
| `/home` | Campus feed | Authenticated |
| `/create` | Create a campus post | Authenticated |
| `/services` | Student services | Authenticated |
| `/profile` | Profile and account activity | Authenticated |
| `/onboarding` | New-user onboarding | Authenticated |
| `/admin` | Administrative metrics | Admin |
| `/login` | Google sign-in | Public |
| `/privacy` | Privacy policy | Public |
| `/terms` | Terms of use | Public |
| `/cookies` | Cookie information | Public |

## Project structure

```text
app/
├── (auth)/                 Authentication and OAuth callback routes
├── (main)/                 Authenticated application routes
│   ├── admin/              Admin dashboard
│   ├── campus/             Campus community area
│   ├── chat/               Conversation interface
│   ├── create/             Campus post creation
│   ├── home/               Community feed
│   ├── market/             Marketplace, listing, and management routes
│   ├── onboarding/         New-user setup
│   ├── profile/            Profile and account activity
│   └── services/           Student services
├── api/                    Server-side API routes
├── privacy/                Privacy policy page
├── terms/                  Terms of use page
└── cookies/                Cookie information page
components/ui/              Shared UI components
lib/                        Supabase, authentication, toast, and push helpers
public/                     Static assets, manifest, and service worker
```

## Available commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run lint` | Run ESLint. |
| `npm run build` | Create a production build. |
| `npm run start` | Start the production server after building. |

Run the lint check before opening a pull request:

```bash
npm run lint
```

## Deployment

KABUSphere is configured for deployment on Vercel:

1. Import the repository into Vercel.
2. Add the environment variables from `.env.local` to the project settings.
3. Configure the production URL in `NEXT_PUBLIC_SITE_URL`.
4. Add the production OAuth callback URL (`https://your-domain.example/auth/callback`) to Supabase and Google OAuth settings.
5. Deploy and verify sign-in, listing uploads, marketplace browsing, and notification setup.

For production, use separate Supabase, Cloudinary, OAuth, and VAPID configuration from local development where possible.

## Contributing

Contributions are welcome. For a focused change:

1. Create a branch from the current default branch.
2. Make the smallest change that addresses the issue.
3. Run `npm run lint` and any relevant checks.
4. Update this README when setup, routes, environment variables, or user-facing behavior changes.
5. Open a pull request with a clear description and verification notes.

Please avoid committing secrets, generated build output, or unrelated formatting changes.

## Privacy and community expectations

Users are responsible for accurate listings, respectful conduct, and safe transactions. Do not publish fraudulent, dangerous, abusive, discriminatory, illegal, or misleading content. Personal information should only be shared when necessary and with the appropriate consent.

See the in-app [Privacy Policy](/privacy), [Terms of Use](/terms), and [Cookie Information](/cookies).

## License and project status

This is a private project intended for the Kabarak University community. No open-source license is currently specified.

Built with care for Kabarak.
