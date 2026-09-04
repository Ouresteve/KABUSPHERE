'use client';

import { useState } from 'react';
import { ArrowLeft, Check, ImagePlus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

const categories = ['Electronics', 'Fashion', 'Books', 'Food', 'Beauty', 'Furniture', 'Services', 'Other'];
const conditions = ['New', 'Used', 'Like New'];

type SelectedImage = { file: File; preview: string };

export default function ListProductPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [condition, setCondition] = useState(conditions[0]);
  const [location, setLocation] = useState('');
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleImages = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).slice(0, 3 - images.length);
    setImages((current) => [...current, ...files.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
    event.target.value = '';
  };

  const removeImage = (index: number) => {
    setImages((current) => current.filter((_, imageIndex) => imageIndex !== index));
  };

  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || '');
    const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
    if (!response.ok) throw new Error('Image upload failed');
    const data = await response.json();
    return data.secure_url as string;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const { data: sellerProfile } = await supabase.from('profiles').select('whatsapp_number').eq('id', user.id).single();
      if (!sellerProfile?.whatsapp_number) throw new Error('Add a WhatsApp number to your profile before listing an item.');
      const { data: product, error: productError } = await supabase.from('products').insert({
        seller_id: user.id,
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        category,
        condition,
        location: location.trim() || null,
        status: 'Active',
      }).select('id').single();
      if (productError || !product) throw new Error(productError?.message || 'Product could not be created');

      const uploadedImages = await Promise.all(images.map((image) => uploadImage(image.file)));
      if (uploadedImages.length) {
        const { error: imageError } = await supabase.from('product_images').insert(uploadedImages.map((image_url, index) => ({ product_id: product.id, image_url, display_order: index + 1 })));
        if (imageError) throw new Error(imageError.message);
      }
      setSuccess(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not list this item. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6">
        <div className="w-full max-w-md rounded-3xl bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-green-100 text-green-600">
            <Check className="h-10 w-10" strokeWidth={3} />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-[#001533]">Item listed</h1>
          <p className="mt-2 text-gray-500">Your product is now visible to the Kabarak community.</p>
          <button onClick={() => router.push('/market')} className="mt-8 w-full rounded-xl bg-[#0047B3] py-3 font-semibold text-white">View marketplace</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-10">
      <header className="sticky top-0 z-40 border-b bg-white px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <button onClick={() => router.push('/market')} className="rounded-xl p-2 text-gray-700 hover:bg-gray-100" aria-label="Back to marketplace"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-xl font-bold text-[#001533]">List an item</h1>
        </div>
      </header>
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-5 px-4 py-6 lg:px-8 lg:py-10">
        <div className="rounded-2xl bg-white p-5 shadow-sm lg:p-8">
          <h2 className="text-lg font-bold text-[#001533]">Tell buyers about it</h2>
          <div className="mt-5 space-y-4">
            <input required minLength={3} maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Item title" className="w-full rounded-xl border border-gray-200 p-4 text-black outline-none focus:border-[#0047B3]" />
            <textarea required minLength={10} maxLength={5000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe your item" className="h-32 w-full resize-none rounded-xl border border-gray-200 p-4 text-black outline-none focus:border-[#0047B3]" />
            <div className="grid gap-4 sm:grid-cols-2">
              <input required min={0} type="number" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Price (KSh)" className="w-full rounded-xl border border-gray-200 p-4 text-black outline-none focus:border-[#0047B3]" />
              <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Location (optional)" className="w-full rounded-xl border border-gray-200 p-4 text-black outline-none focus:border-[#0047B3]" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white p-4 text-black">{categories.map((item) => <option key={item}>{item}</option>)}</select>
              <select value={condition} onChange={(event) => setCondition(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white p-4 text-black">{conditions.map((item) => <option key={item}>{item}</option>)}</select>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm lg:p-8">
          <div className="flex items-center justify-between"><div><h2 className="text-lg font-bold text-[#001533]">Photos</h2><p className="mt-1 text-sm text-gray-500">Add up to 3 clear photos.</p></div><span className="text-sm text-gray-500">{images.length}/3</span></div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {images.map((image, index) => <div key={image.preview} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100"><img src={image.preview} alt={`Preview ${index + 1}`} className="h-full w-full object-cover" /><button type="button" onClick={() => removeImage(index)} className="absolute right-2 top-2 rounded-full bg-white p-1.5 text-gray-700 shadow" aria-label="Remove photo"><X className="h-4 w-4" /></button></div>)}
            {images.length < 3 && <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-[#0047B3] hover:text-[#0047B3]"><ImagePlus className="h-7 w-7" /><span className="mt-2 text-xs font-semibold">Add photo</span><input type="file" accept="image/*" multiple className="hidden" onChange={handleImages} /></label>}
          </div>
        </div>
        {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={submitting || authLoading} className="w-full rounded-xl bg-[#0047B3] py-4 font-semibold text-white transition hover:bg-[#003B99] disabled:bg-gray-300">{submitting ? 'Listing item...' : 'List item'}</button>
      </form>
    </div>
  );
}
