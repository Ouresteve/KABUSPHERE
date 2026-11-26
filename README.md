
```markdown
# KABUSPHERE

**Your campus. Your people. One place to connect.**

KABUSPHERE (KABUSphere) is a campus social network and marketplace built for the Kabarak University community. Students can browse listings, buy and sell items, offer services, chat, and connect — all within a trusted campus environment.

🌐 **Live:** [kabusphere.app](https://www.kabusphere.app)

---

## Features

- **Marketplace** – Browse and list items for sale within the campus community
- **Clubs** – Discover approved clubs, request membership, apply to add a club, and manage club details and badges
- **Chat** – Direct messaging between users
- **Campus Feed** – Stay connected with the Kabarak community
- **Profiles & Onboarding** – Personalized profiles with opt-in school badges and awarded club badges
- **Push Notifications** – Stay updated with web push
- **Admin tools** – Review club applications and assign roles within each club

---

## Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Framework    | Next.js 16 (App Router)             |
| UI           | React 19, Tailwind CSS 4, Lucide    |
| Backend      | Supabase (Auth, Database)           |
| Media        | Cloudinary                          |
| Auth         | Google OAuth + Supabase Auth        |
| Notifications| Web Push                            |
| Hosting      | Vercel                              |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm / yarn / pnpm / bun
- Supabase project
- Cloudinary account
- Google Cloud OAuth credentials

### 1. Clone the repository

```bash
git clone https://github.com/Ouresteve/KABUSPHERE.git
cd KABUSPHERE
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Environment variables

Create a `.env.local` file in the root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=https://www.kabusphere.app

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset

NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

For club logos, configure the Cloudinary unsigned upload preset to accept only PNG, JPEG, and WebP images and enforce a 5 MB maximum upload size. Browser-side validation improves usability but is not a security boundary.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
app/
├── (auth)/          # Authentication pages
├── (main)/          # Main app routes
│   ├── admin/       # Admin dashboard
│   ├── campus/      # Campus feed
│   ├── clubs/       # Club directory, applications, and memberships
│   ├── chat/        # Messaging
│   ├── create/      # Create listings
│   ├── home/        # Home
│   ├── market/      # Marketplace
│   ├── onboarding/  # User onboarding
│   ├── profile/     # User profiles
│   └── services/    # Legacy route redirecting to Clubs
├── api/             # API routes (e.g. push notifications)
components/ui/       # UI components
lib/                 # Utilities and helpers
public/              # Static assets
```

---

## Scripts

| Command         | Description              |
|-----------------|--------------------------|
| `npm run dev`   | Start development server |
| `npm run build` | Build for production     |
| `npm run start` | Start production server  |
| `npm run lint`  | Run ESLint               |

---

## Deployment

The project is configured for easy deployment on **Vercel**.

1. Push your code to GitHub
2. Import the repository in [Vercel](https://vercel.com)
3. Add the environment variables
4. Run the migrations in `supabase/migrations` in timestamp order in the Supabase SQL Editor. The club management and badges migration depends on the clubs directory migration.
5. In the Admin Console, create school badges and assign verified school affiliations to users. Club admins can edit their club details and award club badges; platform admins can suspend and reactivate clubs.
6. Deploy

---

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

---

## License

This project is private and intended for the Kabarak University community.

---

Built with ❤️ for Kabarak
```

---
