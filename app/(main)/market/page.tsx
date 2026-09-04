'use client';

import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Store, User, Heart, MessageCircle, Plus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';

type Product = {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  location: string | null;
  seller_whatsapp_number?: string | null;
  profiles?: { full_name?: string; avatar_url?: string | null } | null;
  product_images?: { image_url: string; display_order: number }[];
};

const categories = ['All', 'Electronics', 'Fashion', 'Books', 'Food', 'Beauty', 'Furniture', 'Services', 'Other'];

export default function MarketPage() {
  const { user, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      const { data, error: productsError } = await supabase
        .from('products')
        .select('*, profiles(full_name, avatar_url), product_images(image_url, display_order)')
        .eq('status', 'Active')
        .order('created_at', { ascending: false });

      if (productsError) {
        setError('We could not load the marketplace right now. Please try again.');
      } else {
        setProducts((data || []) as Product[]);
      }
      setLoading(false);
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user || authLoading) return;
      const { data } = await supabase
        .from('product_favorites')
        .select('product_id')
        .eq('user_id', user.id);
      setFavorites(new Set(data?.map((favorite) => favorite.product_id) || []));
    };
    fetchFavorites();
  }, [user, authLoading]);

  const toggleFavorite = async (productId: string) => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    const isFavorite = favorites.has(productId);
    setFavorites((current) => {
      const next = new Set(current);
      if (isFavorite) next.delete(productId);
      else next.add(productId);
      return next;
    });

    if (isFavorite) {
      await supabase.from('product_favorites').delete().eq('product_id', productId).eq('user_id', user.id);
    } else {
      await supabase.from('product_favorites').insert({ product_id: productId, user_id: user.id });
    }
  };

  const getWhatsAppUrl = (product: Product) => {
    const sellerNumber = product.seller_whatsapp_number;
    if (!sellerNumber) return null;
    const digits = sellerNumber.replace(/\D/g, '');
    const phone = digits.startsWith('254') ? digits : digits.replace(/^0/, '254');
    const message = `Hi, I am interested in your KABUSphere listing: ${product.title}. Is it still available?`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  };

  const visibleProducts = products.filter((product) => {
    const matchesCategory = activeCategory === 'All' || product.category === activeCategory;
    const searchText = `${product.title} ${product.description} ${product.category}`.toLowerCase();
    return matchesCategory && searchText.includes(query.toLowerCase());
  });

  const productImages = selectedProduct?.product_images?.slice().sort((a, b) => a.display_order - b.display_order) || [];

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <div className="sticky top-0 z-40 border-b bg-white px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0047B3]">Kabarak community</p>
            <h1 className="text-2xl font-bold text-[#001533]">Marketplace</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!user && <button onClick={() => window.location.href = '/login'} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[#0047B3] hover:bg-blue-50">Sign in</button>}
            <button
              onClick={() => user ? window.location.href = '/market/list' : window.location.href = '/login'}
              className="hidden items-center gap-2 rounded-xl bg-[#0047B3] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#003B99] lg:flex"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">List an item</span>
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-10">
        <section className="rounded-3xl bg-[#001533] p-6 text-white shadow-sm lg:p-10">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-semibold text-blue-200">Buy from your campus community</p>
            <h2 className="text-3xl font-bold tracking-tight lg:text-5xl">Useful things, closer to home.</h2>
            <p className="mt-4 max-w-xl leading-relaxed text-blue-100">Discover trusted listings from Kabarak students and contact sellers directly on WhatsApp.</p>
          </div>
          <div className="mt-8 flex max-w-2xl items-center gap-3 rounded-2xl bg-white p-2">
            <Search className="ml-3 h-5 w-5 shrink-0 text-gray-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products..." className="min-w-0 flex-1 bg-transparent px-1 py-3 text-gray-800 outline-none" />
            <button onClick={() => setShowFilters(!showFilters)} className="rounded-xl bg-gray-100 p-3 text-gray-700" aria-label="Toggle category filters">
              {showFilters ? <X className="h-5 w-5" /> : <SlidersHorizontal className="h-5 w-5" />}
            </button>
          </div>
        </section>

        {(showFilters || activeCategory !== 'All') && (
          <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button key={category} onClick={() => setActiveCategory(category)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${activeCategory === category ? 'bg-[#0047B3] text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-[#0047B3]'}`}>
                {category}
              </button>
            ))}
          </div>
        )}

        <div className="mt-8 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-[#0047B3]">Latest listings</p>
            <h2 className="mt-1 text-2xl font-bold text-[#001533]">Find your next good thing</h2>
          </div>
          <p className="hidden text-sm text-gray-500 sm:block">{visibleProducts.length} {visibleProducts.length === 1 ? 'item' : 'items'}</p>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl bg-red-50 p-6 text-center text-red-700">{error}</div>
        ) : loading ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
            {[1, 2, 3].map((item) => <div key={item} className="h-96 animate-pulse rounded-2xl bg-white" />)}
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="mt-6 rounded-2xl bg-white p-12 text-center shadow-sm">
            <Store className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-[#001533]">No listings found</h3>
            <p className="mt-2 text-gray-500">Try another search or be the first to list something.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProducts.map((product) => {
              const image = product.product_images?.slice().sort((a, b) => a.display_order - b.display_order)[0]?.image_url;
              const whatsappUrl = getWhatsAppUrl(product);
              return (
                <article key={product.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="relative aspect-[4/3] bg-gray-100">
                    <button type="button" onClick={() => setSelectedProduct(product)} className="block h-full w-full text-left">
                      {image ? <img src={image} alt={product.title} className="h-full w-full object-cover" /> : <Store className="absolute inset-0 m-auto h-12 w-12 text-gray-300" />}
                    </button>
                    <button onClick={() => toggleFavorite(product.id)} className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow-sm" aria-label="Save listing">
                      <Heart className={`h-5 w-5 ${favorites.has(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                    </button>
                    <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-700">{product.condition}</span>
                  </div>
                  <div className="p-3 sm:p-5">
                    <div className="block sm:flex sm:items-start sm:justify-between sm:gap-3">
                      <button type="button" onClick={() => setSelectedProduct(product)} className="line-clamp-2 text-left text-sm font-semibold text-[#001533] hover:text-[#0047B3] sm:text-base">{product.title}</button>
                      <p className="mt-1 shrink-0 text-sm font-bold text-[#0047B3] sm:mt-0 sm:text-base">KSh {Number(product.price).toLocaleString()}</p>
                    </div>
                    <button type="button" onClick={() => setSelectedProduct(product)} className="mt-2 line-clamp-2 text-left text-xs leading-relaxed text-gray-500 sm:text-sm">{product.description}</button>
                    <div className="mt-3 flex min-w-0 items-center gap-1.5 text-[10px] text-gray-500 sm:mt-4 sm:gap-2 sm:text-xs">
                      {product.profiles?.avatar_url ? <img src={product.profiles.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" /> : <User className="h-5 w-5" />}
                      <span className="truncate">{product.profiles?.full_name || 'Kabarak seller'}</span>
                      {product.location && <span className="truncate">• {product.location}</span>}
                    </div>
                    <a href={whatsappUrl || '#'} onClick={(event) => { if (!whatsappUrl) { event.preventDefault(); } }} target="_blank" rel="noreferrer" className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-[11px] font-semibold transition sm:mt-5 sm:gap-2 sm:py-3 sm:text-sm ${whatsappUrl ? 'bg-[#16A34A] text-white hover:bg-[#15803D]' : 'cursor-not-allowed bg-gray-100 text-gray-400'}`}>
                      <MessageCircle className="h-4 w-4" />
                      {whatsappUrl ? 'Buy on WhatsApp' : 'Seller contact unavailable'}
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#001533]/70 p-4 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="product-detail-title" className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4 lg:px-8">
              <p className="text-sm font-semibold uppercase tracking-wider text-[#0047B3]">Product details</p>
              <button type="button" onClick={() => setSelectedProduct(null)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100" aria-label="Close product details"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-6 p-5 lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
              <div>
                <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100">
                  {productImages[0] ? <img src={productImages[0].image_url} alt={selectedProduct.title} className="h-full w-full object-contain" /> : <Store className="mx-auto mt-24 h-14 w-14 text-gray-300" />}
                </div>
                {productImages.length > 1 && <div className="mt-3 grid grid-cols-3 gap-3">{productImages.map((image) => <div key={image.display_order} className="aspect-square overflow-hidden rounded-xl bg-gray-100"><img src={image.image_url} alt={`${selectedProduct.title} image ${image.display_order}`} className="h-full w-full object-cover" /></div>)}</div>}
              </div>
              <div className="flex flex-col">
                <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-wider text-[#0047B3]">{selectedProduct.category}</p><h2 id="product-detail-title" className="mt-2 text-2xl font-bold text-[#001533] lg:text-3xl">{selectedProduct.title}</h2></div><p className="shrink-0 text-xl font-bold text-[#0047B3]">KSh {Number(selectedProduct.price).toLocaleString()}</p></div>
                <div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">{selectedProduct.condition}</span>{selectedProduct.location && <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">{selectedProduct.location}</span>}</div>
                <p className="mt-6 whitespace-pre-wrap leading-relaxed text-gray-600">{selectedProduct.description}</p>
                <div className="mt-6 flex items-center gap-3 border-t pt-5 text-sm text-gray-600">{selectedProduct.profiles?.avatar_url ? <img src={selectedProduct.profiles.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" /> : <User className="h-8 w-8" />}<span>Listed by <strong className="text-[#001533]">{selectedProduct.profiles?.full_name || 'Kabarak seller'}</strong></span></div>
                {getWhatsAppUrl(selectedProduct) ? <a href={getWhatsAppUrl(selectedProduct) || '#'} target="_blank" rel="noreferrer" className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-[#16A34A] py-3.5 font-semibold text-white hover:bg-[#15803D]"><MessageCircle className="h-5 w-5" /> Buy on WhatsApp</a> : <p className="mt-auto rounded-xl bg-gray-100 py-3.5 text-center text-sm text-gray-400">Seller contact unavailable</p>}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}