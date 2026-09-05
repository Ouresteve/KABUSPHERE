'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { User } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [fullName, setFullName] = useState('');
  const [course, setCourse] = useState('');
  const [year, setYear] = useState('Year 1');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pageLoading, setPageLoading] = useState(true);

  // Check if user has already completed profile
  useEffect(() => {
    const checkProfile = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      // Pre-fill name from Google metadata
      const nameFromGoogle = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0];
      setFullName(nameFromGoogle);

      const { data } = await supabase
        .from('profiles')
        .select('full_name, course, year, whatsapp_number')
        .eq('id', user.id)
        .single();

      setPageLoading(false);
      if (data?.full_name) setFullName(data.full_name);
      if (data?.course) setCourse(data.course);
      if (data?.year) setYear(data.year);
      setWhatsappNumber(data?.whatsapp_number || '');
    };

    if (!authLoading) {
      checkProfile();
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate required fields
    if (!fullName.trim() || !course.trim()) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (!user) {
      setError('User not found');
      setLoading(false);
      return;
    }

    // Use avatar from Google metadata if available
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;

    // Use upsert: inserts if it doesn't exist, updates if it does
    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: fullName,
        avatar_url: avatarUrl,
        course: course,
        year: year,
        whatsapp_number: whatsappNumber.trim() || null,
      });

    setLoading(false);

    if (upsertError) {
      setError(upsertError.message);
    } else {
      router.push('/home');
    }
  };

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0047B3] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#001533] to-[#0047B3] px-6 pt-12 pb-8 text-white">
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-4 border-4 border-white/30 overflow-hidden">
            {user?.user_metadata?.avatar_url ? (
              <img 
                src={user.user_metadata.avatar_url} 
                alt="User Avatar" 
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-12 h-12" />
            )}
          </div>
          <h2 className="text-2xl font-bold">Complete Your Profile</h2>
          <p className="text-blue-100 mt-2 text-center">Help us get to know you better</p>
        </div>
      </div>

      {/* Form Container */}
      <div className="px-6 -mt-6 pb-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-lg p-8 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-[#001533] mb-2">Name <span className="text-red-500">*</span></label>
            <input
              required
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your full name"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#0047B3] transition text-black"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#001533] mb-2">Course of Study <span className="text-red-500">*</span></label>
            <select
              required
              value={course}
              onChange={e => setCourse(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#0047B3] transition bg-white text-black"
            >
              <option value="">Select your course</option>
              <option>Bachelor of Science in Computer Science</option>
              <option>Bachelor of Science in Information Technology</option>
              <option>Bachelor of Science in Data Science and Analytics</option>
              <option>Bachelor of Science in Telecommunications</option>
              <option>Bachelor of Science in Cyber Security</option>
              <option>Diploma in Computer Science</option>
              <option>Diploma in Information Technology</option>
              <option>Certificate in Information Technology</option>
              <option>Bachelor of Business Management (BBM)</option>
              <option>Bachelor of Commerce (BCom)</option>
              <option>Bachelor of Science in Economics and Finance</option>
              <option>Bachelor of Science in Procurement &amp; Logistics</option>
              <option>Bachelor of Science in Hospitality Management</option>
              <option>Diploma in Business Management</option>
              <option>Diploma in Procurement &amp; Logistics Management</option>
              <option>Certificate in Business Management</option>
              <option>Bachelor of Science in Nursing (Direct Entry)</option>
              <option>Bachelor of Science in Clinical Medicine</option>
              <option>Bachelor of Science in Public Health</option>
              <option>Bachelor of Science in Human Nutrition &amp; Dietetics</option>
              <option>Diploma in Clinical Medicine and Surgery</option>
              <option>Diploma in Nursing (KRCHN)</option>
              <option>Bachelor of Pharmacy (BPharm)</option>
              <option>Bachelor of Laws (LLB)</option>
              <option>Diploma in Law</option>
              <option>Bachelor of Education (Arts)</option>
              <option>Bachelor of Education (Science)</option>
              <option>Bachelor of Arts in Counseling Psychology</option>
              <option>Bachelor of Theology</option>
              <option>Diploma in Education (Arts)</option>
              <option>Diploma in Theology</option>
              <option>Bachelor of Mass Communication</option>
              <option>Bachelor of Music Production &amp; Technology</option>
              <option>Diploma in Mass Communication</option>
              <option>Diploma in Music</option>
              <option>Diploma in Electrical &amp; Electronics Engineering</option>
              <option>Diploma in Project Management</option>
              <option>Diploma in Human Resource Management</option>
              <option>Certificate in Electrical &amp; Electronics Engineering</option>
              <option>Bachelor of Science in Business Administration</option>
              <option>Bachelor of Science in Accounting</option>
              <option>Bachelor of Science in Economics</option>
              <option>Bachelor of Science in Engineering</option>
              <option>Bachelor of Science in Civil Engineering</option>
              <option>Bachelor of Science in Mechanical Engineering</option>
              <option>Bachelor of Science in Electrical Engineering</option>
              <option>Bachelor of Science in Agriculture</option>
              <option>Bachelor of Science in Environmental Science</option>
              <option>Bachelor of Arts in Psychology</option>
              <option>Bachelor of Arts in Social Work</option>
              <option>Bachelor of Arts in Law</option>
              <option>Bachelor of Science in Tourism and Hospitality Management</option>
              <option>Bachelor of Arts in Communication</option>
              <option>Bachelor of Arts in English</option>
              <option>Bachelor of Arts in History</option>
              <option>Bachelor of Science in Mathematics</option>
              <option>Bachelor of Science in Physics</option>
              <option>Bachelor of Science in Chemistry</option>
              <option>Bachelor of Science in Biology</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#001533] mb-2">Current Year</label>
            <select
              value={year}
              onChange={e => setYear(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#0047B3] transition bg-white text-black"
            >
              <option>Year 1</option>
              <option>Year 2</option>
              <option>Year 3</option>
              <option>Year 4</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#001533] mb-2">WhatsApp Number</label>
            <input
              type="tel"
              value={whatsappNumber}
              onChange={e => setWhatsappNumber(e.target.value)}
              placeholder="e.g. 0712345678"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-[#0047B3] transition text-black"
            />
            <p className="mt-2 text-xs text-gray-500">Used by buyers when they contact you about a listing.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#001533] to-[#0047B3] text-white font-semibold py-3 rounded-lg hover:shadow-lg disabled:opacity-50 transition mt-8"
          >
            {loading ? 'Saving Profile...' : 'Get Started'}
          </button>

          <p className="text-xs text-gray-500 text-center mt-4">
           You need to complete this profile to access posts and use all features.
          </p>
        </form>
      </div>
    </div>
  );
}
