export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-5 py-10 text-[#001533] lg:px-8">
      <article className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-sm lg:p-10">
        <a href="/" className="text-sm font-semibold text-[#0047B3]">Back to KABUSphere</a>
        <h1 className="mt-8 text-3xl font-bold">Terms of Use</h1>
        <p className="mt-3 text-sm text-gray-500">Last updated: September 5, 2026</p>
        <div className="mt-8 space-y-6 leading-relaxed text-gray-700">
          <section><h2 className="text-xl font-semibold text-[#001533]">Using KABUSphere</h2><p className="mt-2">KABUSphere is a campus community and marketplace for Kabarak users. You must provide accurate information, protect your account, and use the service lawfully and respectfully.</p></section>
          <section><h2 className="text-xl font-semibold text-[#001533]">Marketplace listings</h2><p className="mt-2">Sellers are responsible for accurate listings, availability, pricing, images, contact details, and lawful products or services. KABUSphere does not take custody of products or guarantee transactions arranged through WhatsApp.</p></section>
          <section><h2 className="text-xl font-semibold text-[#001533]">Prohibited conduct</h2><p className="mt-2">Do not post fraudulent, dangerous, abusive, discriminatory, illegal, or misleading content. Do not impersonate another person, misuse contact information, or attempt to compromise the service.</p></section>
          <section><h2 className="text-xl font-semibold text-[#001533]">Moderation</h2><p className="mt-2">We may hide or remove content, listings, or accounts that violate these terms or threaten the safety and reliability of the community.</p></section>
          <section><h2 className="text-xl font-semibold text-[#001533]">Changes</h2><p className="mt-2">We may update these terms as KABUSphere evolves. Continued use after an update means you accept the revised terms.</p></section>
        </div>
      </article>
    </main>
  );
}
