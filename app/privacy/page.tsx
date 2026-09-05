export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-5 py-10 text-[#001533] lg:px-8">
      <article className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-sm lg:p-10">
        <a href="/" className="text-sm font-semibold text-[#0047B3]">Back to KABUSphere</a>
        <h1 className="mt-8 text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-3 text-sm text-gray-500">Last updated: September 5, 2026</p>
        <div className="mt-8 space-y-6 leading-relaxed text-gray-700">
          <section><h2 className="text-xl font-semibold text-[#001533]">What we collect</h2><p className="mt-2">We collect account details provided through Google sign-in, profile information you choose to add, posts, listings, favorites, reports, and service activity needed to operate KABUSphere.</p></section>
          <section><h2 className="text-xl font-semibold text-[#001533]">How we use information</h2><p className="mt-2">We use this information to authenticate members, display community content, operate the marketplace, connect buyers and sellers through WhatsApp, protect the service, and improve the product.</p></section>
          <section><h2 className="text-xl font-semibold text-[#001533]">Sharing</h2><p className="mt-2">Public marketplace listings may show the seller name, avatar, product details, and seller-provided contact number. WhatsApp conversations continue on WhatsApp and are governed by its policies. We do not sell personal information.</p></section>
          <section><h2 className="text-xl font-semibold text-[#001533]">Your choices</h2><p className="mt-2">You can edit your profile, manage or remove your listings, sign out, and contact the KABUSphere team about account or data questions.</p></section>
          <section><h2 className="text-xl font-semibold text-[#001533]">Contact</h2><p className="mt-2">For privacy questions, contact the KABUSphere team through the support channel provided in the app.</p></section>
        </div>
      </article>
    </main>
  );
}
