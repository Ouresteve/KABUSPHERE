'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/toast-context';

import { 
  Home, Users, Store, Bell, User, Plus, Search, Heart, 
  MessageCircle, Share2, Eye, MoreVertical, Trash2
} from 'lucide-react';
import {supabase } from '@/lib/supabase';
import Image from 'next/image';
import { subscribeToPushNotifications } from '@/lib/push-notifications';

import { sendPushNotification } from '@/lib/send-notification';
type post_views = {
  id: string;
  user_id: string;
  post_id: string;
  view: boolean;
  liked: boolean;
  created_at: string;
}
type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {full_name?: string; avatar_url?: string | null};
}
type Post = {
  id: string;
  user_id: string;
  content: string;
  post_type: string;
  price?: number;
  whatsapp_number?: string;
  image_url?: string;
  video_url?: string;
  likes_count: number;
  views_count: number;
  comments_count: number;
  is_anonymous: boolean;
  is_official: boolean;
  created_at: string;
  profiles?:{full_name?:string; avatar_url?: string | null};
}

export default function HomePage() {
  const router = useRouter();
  const { user,loading: authLoading } = useAuth();
  const { addToast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [postViews, setPostViews] = useState<post_views[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [viewedPosts, setViewedPosts] = useState<Set<string>>(new Set());
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedPostOwner, setSelectedPostOwner] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentInput, setCommentInput] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

    // PWA Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowInstallPrompt(false);
    } else {
      setShowInstallPrompt(false);
    }

    setDeferredPrompt(null);
  };

  const handleLater = () => {
    setShowInstallPrompt(false);
  };
  // Fetch Posts
  useEffect(() => {
    if(!authLoading && !user){
      router.push('/login');
    }

    // Check if user has completed profile
    const checkAndFetchPosts = async () => {
      if (!user) return;

      // Update user's avatar from Google metadata
      const googleAvatar = user.user_metadata?.avatar_url;
      if (googleAvatar) {
        await supabase
          .from('profiles')
          .update({ avatar_url: googleAvatar })
          .eq('id', user.id);
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (!profile?.full_name) {
        router.push('/onboarding');
        return;
      }

      setLoading(true);
      
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles(full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error){
        console.error("Supabase Error Message: ",error.message);
        console.error("Supabase Error Details: ",error.details);
        console.error("Supabase Error Message: ",error.code);
        

       } else{
         setPosts(data || []);
       }

      // Fetch user's likes
      const { data: likesData } = await supabase
        .from('post_views')
        .select('post_id')
        .eq('user_id', user.id)
        .eq('liked', true);

      if (likesData) {
        setUserLikes(new Set(likesData.map((l) => l.post_id)));
      }
      
      setLoading(false);
    };

    if (!authLoading) {
      checkAndFetchPosts();
    }
  }, [user,authLoading,router]);

  // Track views using Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const postId = entry.target.getAttribute('data-post-id');
            if (postId && !viewedPosts.has(postId) && user) {
              // Mark as viewed in session
              setViewedPosts((prev) => new Set(prev).add(postId));

              // Check if user has already viewed this post
              supabase
                .from('post_views')
                .select('*')
                .eq('user_id', user.id)
                .eq('post_id', postId)
                .single()
                .then(({ data, error }) => {
                  // If record exists, user already viewed it
                  if (data) {
                    setPostViews([data]);
                    return;
                  }

                  // Record new view in post_views table
                  supabase
                    .from('post_views')
                    .insert({ user_id: user.id, post_id: postId })
                    .then(({ error: insertError }) => {
                      if (!insertError) {
                        // Increment views_count only on successful new view
                        supabase
                          .from('posts')
                          .update({ views_count: (posts.find((p) => p.id === postId)?.views_count || 0) + 1 })
                          .eq('id', postId)
                          .then(() => {
                            // Update local state
                            setPosts((prevPosts) =>
                              prevPosts.map((p) =>
                                p.id === postId ? { ...p, views_count: p.views_count + 1 } : p
                              )
                            );
                          });
                      }
                    });
                });
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    // Observe all post elements
    const postElements = document.querySelectorAll('[data-post-id]');
    postElements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [posts, viewedPosts, user]);

  const filteredPosts = posts.filter(post => {
      if(activeFilter === 'All') return true;
      if (activeFilter ==='General') return post.post_type === 'general';
      if(activeFilter === 'Market') return post.post_type ==='market';
      if(activeFilter === 'Confessions') return post.post_type === 'confession';
      if (activeFilter === 'Your Posts') return post.user_id === user?.id; 
      return true;
  })
  const handleLike = async (postId: string) => {
    if (!user) return;

    // Check if already liked
    if (userLikes.has(postId)) {
      return;
    }

    // Optimistic update
    setUserLikes((prev) => new Set(prev).add(postId));
    setPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p
    ));

    // Play sound effect
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const audioContext = new AudioContextClass();
      const now = audioContext.currentTime;
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      osc.connect(gain);
      gain.connect(audioContext.destination);
      
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
      
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      
      osc.start(now);
      osc.stop(now + 0.15);
     /* const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;
  
  const audioContext = new AudioContextClass();
  
  // 1. Fetch your custom sound file from the public folder
  const response = await fetch('/sounds/notification.mp3');
  const arrayBuffer = await response.arrayBuffer();
  
  // 2. Decode the raw audio data into an audio buffer
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // 3. Create a buffer source instead of an oscillator
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  
  // 4. Assemble the audio processing graph
  source.connect(gain);
  gain.connect(audioContext.destination);
  
  // Apply your volume fade settings
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + audioBuffer.duration);
  
  // 5. Start playback immediately
  source.start(now);*/
    } catch (err) {
      console.log('Audio not available:', err);
    }

    // Update database
    const { error } = await supabase
      .from('posts')
      .update({ likes_count: (posts.find((p) => p.id === postId)?.likes_count || 0) + 1 })
      .eq('id', postId);
    
    const { error: likeError } = await supabase    
      .from('post_views')
      .update({ liked: true })
      .eq('user_id', user.id)
      .eq('post_id', postId);
    
    if (error) console.error("Like error:", error);
    if (likeError) console.error("Like record error:", likeError);
  };
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) {
      addToast('Failed to delete post: ' + error.message, 'error');
    } else {
      setPosts((prevPosts) => prevPosts.filter((p) => p.id !== postId));
      setOpenMenuPostId(null);
      addToast('Post deleted successfully', 'success');
    }
  };

  const fetchComments = async (postId: string) => {
    setLoadingComments(true);
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles(full_name, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setComments((prev) => ({
        ...prev,
        [postId]: data as Comment[],
      }));
    }
    setLoadingComments(false);
  };

  const handleAddComment = async (postId: string, postOwner: string) => {
    if (!user || !commentInput.trim()) return;

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: commentInput,

        })
        .select(`
          *,
          profiles(full_name, avatar_url)
        `);

      if (error) {
        console.error('Comment error:', error);
        addToast('Failed to post comment: ' + error.message, 'error');
        return;
      }
      
       const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();


      if (data && data.length > 0) {
        // Add new comment to top of list
        setComments((prev) => ({
          ...prev,
          [postId]: [data[0], ...(prev[postId] || [])],
        }));

        if(postOwner !== user.id) {
          await sendPushNotification(
            postOwner,
            "New Comment",
            `${profile?.full_name || 'Someone'} commented on your post!`,
            `/home`
          );
        }
        
        // Update comments count in local state
        setPosts((prevPosts) =>
          prevPosts.map((p) =>
            p.id === postId
              ? { ...p, comments_count: p.comments_count + 1 }
              : p
          )
        );

        // Update comments count in database
        const currentPost = posts.find((p) => p.id === postId);
        if (currentPost) {
          await supabase
            .from('posts')
            .update({ comments_count: currentPost.comments_count + 1 })
            .eq('id', postId);
        }

        setCommentInput('');
        addToast('Comment posted successfully', 'success');
      }
    } catch (err) {
      console.error('Exception posting comment:', err);
      addToast('Failed to post comment. Please try again.', 'error');
    }
  };

  const handleDeleteComment = async (commentId: string, postId: string) => {
    if (!confirm('Delete this comment?')) return;

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (!error) {
      setComments((prev) => ({
        ...prev,
        [postId]: prev[postId]?.filter((c) => c.id !== commentId) || [],
      }));
      
      setPosts((prevPosts) =>
        prevPosts.map((p) =>
          p.id === postId && p.comments_count > 0
            ? { ...p, comments_count: p.comments_count - 1 }
            : p
        )
      );

      // Update comments count in database
      const currentPost = posts.find((p) => p.id === postId);
      if (currentPost && currentPost.comments_count > 0) {
        await supabase
          .from('posts')
          .update({ comments_count: currentPost.comments_count - 1 })
          .eq('id', postId);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      
      {/* Top Navigation */}
      <div className="sticky top-0 bg-white border-b z-50 px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Image 
              src="/images/logo.jpeg" 
              alt="KABUSphere" 
              width={36} 
              height={36}
              className="rounded-xl"
            />
            <h1 className="text-2xl font-bold tracking-tight text-[#001533]">
              KABU<span className="text-[#0047B3]">SPHERE</span>
            </h1>
          </div>
          {/*subscribeToPushNotifications*/}
          <button
  onClick={async () => {
    if (!user) return;
    await subscribeToPushNotifications(user.id, addToast);
  }}
  className="bg-[#0047B3] text-white px-4 py-2 rounded-2xl text-sm flex items-center gap-2 hover:bg-[#003B99] transition"
  title="Subscribe to push notifications"
>
  <Bell className="w-4 h-4" />
  <span>Subscribe</span>
</button>
          
          
        </div>
      </div>
      {/* Show install prompt if available */}
        {/* Install Prompt Banner */}
  {showInstallPrompt && (
    <div className="mx-4 mt-4 max-w-5xl border border-[#0047B3]/20 rounded-3xl bg-white p-5 shadow-sm lg:mx-auto">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-[#0047B3] rounded-2xl flex items-center justify-center flex-shrink-0">
          <span className="text-white text-2xl">K</span>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-[#001533]">Install KABUSphere</p>
          <p className="text-sm text-black mt-1">Add to your home screen for quick access</p>
        </div>
      </div>

      <div className="flex gap-3 mt-5">
        <button
          onClick={handleLater}
          className="flex-1 py-3 border border-gray-300 rounded-2xl font-medium text-black hover:bg-gray-50 transition"
        >
          Later
        </button>
        <button
          onClick={handleInstall}
          className="flex-1 py-3 bg-[#0047B3] text-white rounded-2xl font-semibold hover:bg-[#003B99] transition"
        >
          Install App
        </button>
      </div>
    </div>
  )}

      {/* Campus Updates */}
      <div className="mx-auto mt-4 max-w-5xl px-4 lg:mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-[#001533]">Campus Updates</h2>
        </div>
        <div className="bg-gradient-to-r from-[#001533] to-[#0047B3] text-white rounded-3xl p-5">
          <div className="text-xs uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full w-fit">Official</div>
          <h3 className="text-lg font-semibold mt-3">No updates yet</h3>
        </div>
      </div>

      {/* Filters */}
     {/* Filters */}
<div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-4 lg:py-6">
  {['All', 'Confessions', 'General', 'Market','Your Posts'].map((filter) => (
    <button
      key={filter}
      onClick={() => setActiveFilter(filter)}
      className={`px-6 py-2.5 rounded-2xl font-medium whitespace-nowrap transition-all ${
        activeFilter === filter 
          ? 'bg-[#0047B3] text-white shadow-sm' 
          : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
      }`}
    >
      {filter}
    </button>
  ))}
</div>

      {/* Feed */}
      <div className="mx-auto max-w-3xl space-y-6 px-4 lg:space-y-8">
        {loading ? (
  <div className="space-y-6">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-white rounded-3xl p-5 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
        <div className="h-20 bg-gray-200 rounded-2xl mt-5"></div>
      </div>
    ))}
  </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            No posts yet.<br />Be the first to share something!
          </div>
        ) : (
          filteredPosts.map((post) => (
            <div key={post.id} data-post-id={post.id} className="rounded-3xl bg-white p-5 shadow-sm lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {post.post_type !== 'confession' && post.profiles?.avatar_url ? (
                    <img
                      src={post.profiles.avatar_url} 
                      alt="User Avatar" 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-600" />
                    </div>
                  )}
                  <p className="text-[#0047B3] font-bold">{post.post_type === 'confession' ? 'Anonymous' : post.profiles?.full_name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at {new Date(post.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {user?.id === post.user_id && (
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenuPostId(openMenuPostId === post.id ? null : post.id)}
                        className="p-1 hover:bg-gray-100 rounded-lg transition"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-600" />
                      </button>
                      {openMenuPostId === post.id && (
                        <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="flex items-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 w-full text-left transition rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {post.image_url && (
                <Image 
                  src={post.image_url} 
                  alt="Post media" 
                  width={500}
                  height={500}
                  className="w-full rounded-2xl mb-4 mt-4" 
                />
              )}
              <p className="text-gray-800 leading-relaxed mt-4">{post.content}</p>
              
              {post.price && (
                <p className="text-[#0047B3] font-bold mt-3">KSh {post.price.toLocaleString()}</p>
              )}
    
              <div className="flex justify-between items-center mt-6 text-gray-600">
                <button 
                 onClick={() => handleLike(post.id)}
                 className="flex items-center gap-2 transition"
                >
                  <Heart className={`w-5 h-5 transition-all ${userLikes.has(post.id) ? 'text-[#0047B3] fill-[#0047B3]' : 'hover:text-red-500'}`} /> 
                  <span>{post.likes_count}</span>
                </button>
                <button 
                  onClick={() => {
                    setSelectedPostId(post.id);
                    setSelectedPostOwner(post.user_id);
                    if (!comments[post.id]) {
                      fetchComments(post.id);
                    }
                  }}
                  className="flex items-center gap-2 hover:text-[#0047B3] transition"
                >
                  <MessageCircle className="w-5 h-5" /> {post.comments_count}
                </button>
                <button className="flex items-center gap-2 hover:text-[#0047B3] transition">
                  <Eye className="w-5 h-5" /> {post.views_count || 0}
                </button>
                {post.whatsapp_number && (
                  <button 
                    onClick={() => {
                      const message = `Hi, I'm interested in this product: ${post.content.substring(0, 50)}...`;
                      const encodedMessage = encodeURIComponent(message);
                      let phoneNumber = post.whatsapp_number!;
                      // Add country code if missing
                      if (!phoneNumber.startsWith('+') && !phoneNumber.startsWith('00')) {
                        phoneNumber = '+254' + phoneNumber;
                      }
                      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
                      window.open(whatsappUrl, '_blank');
                    }}
                    className="bg-green-600 text-white px-5 py-2 rounded-2xl text-sm font-medium hover:bg-green-700 transition"
                  >
                    Message
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

     {/* Floating Post Button */}
<button 
  onClick={() => window.location.href='/create'}
  className="fixed bottom-24 right-6 w-16 h-16 bg-[#0047B3] hover:bg-[#003B99] text-white rounded-3xl shadow-xl flex items-center justify-center z-50 active:scale-95 transition-all duration-200"
>
  <Plus className="w-8 h-8" />
</button>

      {/* Comments Modal */}
      {selectedPostId && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-t-3xl shadow-2xl max-h-[80vh] overflow-hidden flex flex-col mb-20">
            {/* Modal Header */}
            <div className="border-b px-4 py-4 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-[#001533]">Comments</h2>
              <button
                onClick={() => {
                  setSelectedPostId(null);
                  setCommentInput('');
                }}
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-white">
              {loadingComments ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse flex gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : comments[selectedPostId]?.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <MessageCircle className="w-12 h-12 mx-auto opacity-20 mb-2" />
                  No comments yet. Be the first!
                </div>
              ) : (
                comments[selectedPostId]?.map((comment) => (
                  <div key={comment.id} className="flex gap-3 pb-4 border-b last:border-b-0">
                    {comment.profiles?.avatar_url ? (
                      <img
                        src={comment.profiles.avatar_url}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-[#001533] text-sm">
                          {comment.profiles?.full_name}
                        </p>
                        {user?.id === comment.user_id && (
                          <button
                            onClick={() => handleDeleteComment(comment.id, selectedPostId)}
                            className="text-red-500 hover:text-red-700 text-xs font-bold"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs mt-1">
                        {new Date(comment.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-gray-700 text-sm mt-2">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            <div className="border-t bg-white p-4 sticky bottom-0 z-10">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && commentInput.trim()) {
                      handleAddComment(selectedPostId, selectedPostOwner!);
                    }
                  }}
                  placeholder="Write a comment..."
                  className="flex-1 bg-gray-100 rounded-full px-4 py-3 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0047B3] transition"
                />
                <button
                  onClick={() => handleAddComment(selectedPostId, selectedPostOwner!)}
                  disabled={!commentInput.trim()}
                  className="bg-[#0047B3] text-white px-6 py-3 rounded-full font-medium hover:bg-[#003B99] disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}