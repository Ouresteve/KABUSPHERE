'use client';

import { useEffect, useState } from 'react';

const consentKey = 'kabusphere-cookie-consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(window.localStorage.getItem(consentKey) === null);
  }, []);

  const choose = (value: 'accepted' | 'declined') => {
    window.localStorage.setItem(consentKey, value);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside className="fixed inset-x-4 bottom-4 z-[200] rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl sm:left-auto sm:max-w-md" role="dialog" aria-label="Cookie preferences">
      <h2 className="font-semibold text-[#001533]">Cookies and local storage</h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        KABUSphere uses essential browser storage to keep the app reliable and remember your cookie choice. We do not use advertising cookies.
      </p>
      <div className="mt-4 flex gap-3">
        <button onClick={() => choose('declined')} className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">Decline optional</button>
        <button onClick={() => choose('accepted')} className="flex-1 rounded-xl bg-[#0047B3] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#003B99]">Accept</button>
      </div>
      <p className="mt-3 text-xs text-gray-500"><a className="text-[#0047B3] underline" href="/privacy">Privacy</a> · <a className="text-[#0047B3] underline" href="/cookies">Cookie policy</a></p>
    </aside>
  );
}
