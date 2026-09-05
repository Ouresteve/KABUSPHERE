export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-5 py-10 text-[#001533] lg:px-8">
      <article className="mx-auto max-w-3xl rounded-3xl bg-white p-6 shadow-sm lg:p-10">
        <a href="/" className="text-sm font-semibold text-[#0047B3]">Back to KABUSphere</a>
        <h1 className="mt-8 text-3xl font-bold">Cookie Policy</h1>
        <p className="mt-3 text-sm text-gray-500">Last updated: September 5, 2026</p>
        <div className="mt-8 space-y-6 leading-relaxed text-gray-700">
          <section><h2 className="text-xl font-semibold text-[#001533]">Essential storage</h2><p className="mt-2">KABUSphere uses browser storage needed for authentication, app preferences, and remembering your cookie choice. These technologies help the service function and are not used for advertising.</p></section>
          <section><h2 className="text-xl font-semibold text-[#001533]">Third-party services</h2><p className="mt-2">Google handles sign-in, Supabase provides authentication and database services, Cloudinary hosts uploaded product images, and WhatsApp handles buyer-seller conversations when you choose to contact a seller.</p></section>
          <section><h2 className="text-xl font-semibold text-[#001533]">Managing preferences</h2><p className="mt-2">You can clear site data through your browser settings. Clearing essential storage may require you to sign in again.</p></section>
        </div>
      </article>
    </main>
  );
}
