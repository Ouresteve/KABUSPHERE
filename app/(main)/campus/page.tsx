'use client';

import { Megaphone, MapPin, Calendar, Users } from 'lucide-react';

export default function CampusPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      
      {/* Header */}
      <div className="sticky top-0 bg-white border-b z-40 px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#001533]">Campus</h1>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-5 grid grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md transition cursor-pointer">
          <Megaphone className="w-10 h-10 text-[#0047B3] mb-4" />
          <h3 className="font-semibold text-[#001533] text-lg">Confessions</h3>
          <p className="text-gray-600 mt-1">Share anonymously with the campus</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow-md transition cursor-pointer">
          <MapPin className="w-10 h-10 text-[#0047B3] mb-4" />
          <h3 className="font-semibold text-[#001533] text-lg">Lost & Found</h3>
          <p className="text-gray-600 mt-1">Report or find lost items</p>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg text-[#001533]">Upcoming Events</h2>
          <Calendar className="w-5 h-5 text-[#0047B3]" />
        </div>

        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-3xl p-5 shadow-sm hover:shadow transition">
              <div className="flex gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-[#0047B3] to-[#0055CC] rounded-2xl flex-shrink-0 flex items-center justify-center">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#001533]">
                    Kabarak University Innovation Week 2026
                  </p>
                  <p className="text-gray-600 text-sm mt-1">
                    Main Auditorium • Friday • 3:00 PM
                  </p>
                  <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                    <Users className="w-4 h-4" /> 234 students interested
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}