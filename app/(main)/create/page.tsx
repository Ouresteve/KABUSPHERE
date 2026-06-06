'use client';

import { useState } from 'react';
import { ArrowLeft, Image as ImageIcon, Send, X, Users, Store,MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/toast-context';
import { sendPushNotification } from '@/lib/send-notification';

export default function CreatePostPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<'general' | 'market' | 'confession'>('general');
  const [price, setPrice] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  


  const handleImageSelect =(e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(file) {
        setImage(file);
        setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
  };

  const UploadImageToCloudinary = async (file:File): Promise<string | null> => {
    const formData = new FormData ();
    formData.append('file',file);
    formData.append('upload_preset',process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

    try {
        const res = await fetch(
            `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
            {method: 'POST', body: formData}
        );
        const data =await res.json();
        return data.secure_url;
    }catch(error) {
        console.error(error);
        return null;
    }
  };

  const handlePost = async () => {
    if (!content.trim()) return;

    setLoading(true);

    // Check if user has completed profile
    if (!user) {
      router.push('/login');
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    if (!profile?.full_name) {
      router.push('/onboarding');
      setLoading(false);
      return;
    }

    let image_url = null;
    

    if(image) {
        image_url = await UploadImageToCloudinary(image);
        
    }


    const { error } = await supabase.from('posts').insert({
      user_id: user?.id,
      post_type: postType,
      content: content.trim(),
      image_url,
      video_url: null,
      price: postType === 'market' ? parseFloat(price) || null : null,
      whatsapp_number: postType === 'market' ? whatsappNumber : null,
      is_anonymous: isAnonymous,
      is_official: false,
    });

    if (error) {
      addToast("Failed to create post: " + error.message, 'error');
    } else {
      
      const {data: allUsers} = await supabase
      .from('profiles')
      .select('id')
      .neq('id', user?.id);

      allUsers?.forEach(async (u) => {
        await sendPushNotification(
          u.id,
          "New Post",
          `${postType === 'confession' ? 'Anonymous' : profile.full_name || 'Someone'} just posted in ${postType === 'general' ? 'General' : postType === 'market' ? 'Market' : 'Confessions'} feed!`,
          '/home'
        );
      });
      addToast("Post created successfully!", 'success');
      router.push('/home');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b z-50 px-4 py-4 flex items-center justify-between">
        <button onClick={() => router.push('/home')} className="p-2 -ml-2">
          <ArrowLeft className="w-6 h-6 text-black" />
        </button>
        <h1 className="text-xl font-bold text-[#001533]">Create Post</h1>
        <button
          onClick={handlePost}
          disabled={loading || !content.trim()}
          className="bg-[#0047B3] hover:bg-[#003B99] disabled:bg-gray-300 text-black px-6 py-2 rounded-2xl font-semibold transition"
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Post Type Selector */}
        <div className="grid grid-cols-3 text-black gap-3">
          {[
            { type: 'general' as const, label: 'General', icon: Users },
            { type: 'market' as const, label: 'Market', icon: Store },
            { type: 'confession' as const, label: 'Confession', icon: MessageCircle },
            ].map(({ type, label, icon: Icon }) => (
         <button
             key={type}
             onClick={() => setPostType(type)}
             className={`py-4 rounded-3xl font-medium transition-all flex flex-col items-center gap-2 ${
             postType === type 
            ? 'bg-[#0047B3] text-white shadow' 
            : 'bg-white border border-gray-200 hover:border-gray-300'
            }`}
        >
        <Icon className="w-6 h-6" />
        {label}
    </button>
    ))}
        </div>

        {/* Text Area */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What’s happening on campus today?"
          className="w-full h-52 bg-white border border-gray-200 focus:border-[#0047B3] rounded-3xl p-5 text-lg  text-black leading-relaxed resize-none focus:outline-none"
        />

        {/* Market Fields */}
        {postType === 'market' && (
          <div className="bg-white p-5 rounded-3xl space-y-4 border border-gray-100">
            <div>
              <label className="text-sm text-gray-600 block mb-2">Price (KSh)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 25000"
                className="w-full border border-gray-200 rounded-2xl p-4 text-lg text-black"
              />
            </div>
            <div>
              <label className="text-black text-gray-600 block mb-2">WhatsApp Number</label>
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+254712345678"
                className="w-full border border-gray-200 rounded-2xl p-4 text-lg text-black "
              />
            </div>
          </div>
        )}

         {/* Image Upload */}
        <div className="border-2 border-dashed border-gray-300 rounded-3xl p-8 text-center hover:border-[#0047B3] transition cursor-pointer" onClick={() => document.getElementById('image-upload')?.click()}>
          <ImageIcon className="w-12 h-12 mx-auto text-gray-400" />
          <p className="mt-3 text-blue-500 font-bold">Add Photo</p>
          <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
        </div>

        {imagePreview && (
          <div className="relative">
            <img src={imagePreview} alt="preview" className="w-full rounded-3xl" />
            <button onClick={removeImage} className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}