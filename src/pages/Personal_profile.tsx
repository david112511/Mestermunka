import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Navigation from '../components/Navigation';
import { Heart, Share2, MessageCircle, MessageSquare, UserPlus, X } from 'lucide-react';

// Felhasználói profil interfész meghatározása
interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  user_type: string;
  followersCount: number;
}

// Hozzászólás interfész meghatározása
interface Comment {
  id: string;
  content: string;
  created_at: string;
  author: { first_name: string; last_name: string };
}

// Bejegyzés interfész meghatározása
interface Post {
  id: string;
  author_id: string;
  content: string;
  create_at: string;
  media_url: string | null;
  likes: number;
  likedBy: string[];
  comments: Comment[];
  author: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string | null;
  };
}

// Követett felhasználó interfész meghatározása
interface FollowUser {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

const PersonalProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [totalLikes, setTotalLikes] = useState<number>(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [openCommentSections, setOpenCommentSections] = useState<{ [key: string]: boolean }>({});
  const [commentLoading, setCommentLoading] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followSuccess, setFollowSuccess] = useState(false);
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'followers' | 'following'>('posts');
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);

  // Első betöltéskor lekéri az aktuális felhasználó azonosítóját és figyeli az autentikációs állapot változását
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        setCurrentUserId(user ? user.id : null);
      } catch (error) {
        console.error('Hiba az aktuális felhasználó lekérésekor:', (error as Error).message);
      }
    };
    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUserId(session?.user?.id || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Biztosítja, hogy az isFollowing állapot szinkronban legyen az adatbázissal
  useEffect(() => {
    const checkFollowingStatus = async () => {
      if (!currentUserId || !userId) return;
      try {
        const { data: followData, error: followError } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', currentUserId)
          .eq('followed_id', userId);
        if (followError) throw followError;
        console.log('Követési állapot:', { currentUserId, userId, followData });
        setIsFollowing(!!followData?.length);
      } catch (error) {
        console.error('Hiba a követési állapot ellenőrzésekor:', (error as Error).message);
      }
    };
    checkFollowingStatus();
  }, [currentUserId, userId]);

  // Lekéri a felhasználói profilt, bejegyzéseket, mentett bejegyzéseket, követőket és követett felhasználókat
  useEffect(() => {
    const fetchProfileAndPosts = async () => {
      if (!userId) return;

      try {
        // Felhasználói profil lekérése
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, user_type')
          .eq('id', userId)
          .single();

        if (profileError || !profileData) {
          throw new Error(profileError?.message || 'Felhasználó nem található');
        }

        // Követők számának lekérése
        const { data: followersData, error: followersError } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('followed_id', userId);

        if (followersError) {
          console.error('Hiba a követők számának lekérésekor:', followersError.message, followersError.details);
          throw followersError;
        }

        const followersCount = followersData?.length || 0;
        setProfile({ ...profileData, followersCount });

        // Követők listájának lekérése
        const { data: followersProfiles, error: followersProfilesError } = await supabase
          .from('follows')
          .select(`
            follower_id,
            profiles:follower_id(id, first_name, last_name, avatar_url)
          `)
          .eq('followed_id', userId);

        if (followersProfilesError) {
          console.error('Hiba a követők lekérésekor:', followersProfilesError.message, followersProfilesError.details);
          throw followersProfilesError;
        }
        console.log('Követők:', followersProfiles);

        setFollowers(
          followersProfiles
            ?.map((f: any) => ({
              id: f.profiles?.id,
              first_name: f.profiles?.first_name,
              last_name: f.profiles?.last_name,
              avatar_url: f.profiles?.avatar_url,
            }))
            .filter((f): f is FollowUser => !!f.id) || []
        );

        // Követett felhasználók listájának lekérése
        const { data: followingProfiles, error: followingProfilesError } = await supabase
          .from('follows')
          .select(`
            followed_id,
            profiles:followed_id(id, first_name, last_name, avatar_url)
          `)
          .eq('follower_id', userId);

        if (followingProfilesError) {
          console.error('Hiba a követett felhasználók lekérésekor:', followingProfilesError.message, followingProfilesError.details);
          throw followingProfilesError;
        }
        console.log('Követett felhasználók:', followingProfiles);

        setFollowing(
          followingProfiles
            ?.map((f: any) => ({
              id: f.profiles?.id,
              first_name: f.profiles?.first_name,
              last_name: f.profiles?.last_name,
              avatar_url: f.profiles?.avatar_url,
            }))
            .filter((f): f is FollowUser => !!f.id) || []
        );

        // Bejegyzések lekérése
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            id, author_id, content, create_at, media_url,
            comments(*, author:profiles(id, first_name, last_name)),
            author:profiles(id, first_name, last_name, avatar_url)
          `)
          .eq('author_id', userId)
          .order('create_at', { ascending: false });

        if (postsError) {
          console.error('Hiba a bejegyzések lekérésekor:', postsError.message, postsError.details);
          throw postsError;
        }
        console.log('Lekért bejegyzések:', postsData);

        // Tetszik jelzések lekérése
        const { data: likesData, error: likesError } = await supabase
          .from('likes')
          .select('post_id, user_id');

        if (likesError) {
          console.error('Hiba a kedvelések lekérésekor:', likesError.message, likesError.details);
          throw likesError;
        }

        // Mentett bejegyzések lekérése (csak saját profil esetén)
        let savedPostsWithLikes: Post[] = [];
        if (currentUserId === userId) {
          const { data: savedPostsData, error: savedPostsError } = await supabase
            .from('saved_posts')
            .select(`
              post_id,
              posts!inner(
                id, author_id, content, create_at, media_url,
                comments(*, author:profiles(id, first_name, last_name)),
                author:profiles(id, first_name, last_name, avatar_url)
              )
            `)
            .eq('user_id', currentUserId)
            .order('created_at', { ascending: false });

          if (savedPostsError) {
            console.error('Hiba a mentett bejegyzések lekérésekor:', savedPostsError.message, savedPostsError.details);
            throw savedPostsError;
          }
          console.log('Mentett bejegyzések:', savedPostsData);

          savedPostsWithLikes = (savedPostsData || []).map((sp) => ({
            ...sp.posts,
            likes: likesData?.filter((like) => like.post_id === sp.posts.id).length || 0,
            likedBy: likesData?.filter((like) => like.post_id === sp.posts.id).map((like) => like.user_id) || [],
            comments: (sp.posts.comments || []).map((comment: any) => ({
              id: comment.id,
              content: comment.content,
              created_at: comment.created_at,
              author: {
                first_name: comment.author?.first_name || 'Ismeretlen',
                last_name: comment.author?.last_name || '',
              },
            })),
          }));
        }

        const postsWithLikes = (postsData || []).map((post) => ({
          ...post,
          likes: likesData?.filter((like) => like.post_id === post.id).length || 0,
          likedBy: likesData?.filter((like) => like.post_id === post.id).map((like) => like.user_id) || [],
          comments: (post.comments || []).map((comment: any) => ({
            id: comment.id,
            content: comment.content,
            created_at: comment.created_at,
            author: {
              first_name: comment.author?.first_name || 'Ismeretlen',
              last_name: comment.author?.last_name || '',
            },
          })),
        }));

        const totalLikesCount = postsWithLikes.reduce((sum, post) => sum + post.likes, 0);
        setPosts(postsWithLikes);
        setSavedPosts(savedPostsWithLikes);
        setTotalLikes(totalLikesCount);
      } catch (error) {
        console.error('Hiba a profil és bejegyzések lekérésekor:', (error as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndPosts();
  }, [userId, currentUserId]);

  // Tetszik változásokra való feliratkozás
  useEffect(() => {
    const likesSubscription = supabase
      .channel('likes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes' },
        (payload) => {
          const { eventType, new: newLike, old: oldLike } = payload;
          setPosts((prevPosts) =>
            prevPosts.map((post) => {
              if (eventType === 'INSERT' && newLike.post_id === post.id) {
                return {
                  ...post,
                  likes: post.likes + 1,
                  likedBy: [...post.likedBy, newLike.user_id],
                };
              } else if (eventType === 'DELETE' && oldLike.post_id === post.id) {
                return {
                  ...post,
                  likes: post.likes - 1,
                  likedBy: post.likedBy.filter((uid) => uid !== oldLike.user_id),
                };
              }
              return post;
            })
          );
          setSavedPosts((prevPosts) =>
            prevPosts.map((post) => {
              if (eventType === 'INSERT' && newLike.post_id === post.id) {
                return {
                  ...post,
                  likes: post.likes + 1,
                  likedBy: [...post.likedBy, newLike.user_id],
                };
              } else if (eventType === 'DELETE' && oldLike.post_id === post.id) {
                return {
                  ...post,
                  likes: post.likes - 1,
                  likedBy: post.likedBy.filter((uid) => uid !== oldLike.user_id),
                };
              }
              return post;
            })
          );
          const newTotalLikes = posts.reduce((sum, post) => {
            if (eventType === 'INSERT' && newLike.post_id === post.id) return sum + 1;
            if (eventType === 'DELETE' && oldLike.post_id === post.id) return sum - 1;
            return sum + post.likes;
          }, 0);
          setTotalLikes(newTotalLikes);
        }
      )
      .subscribe((status, error) => {
        console.log('Tetszik feliratkozás állapota:', status);
        if (status === 'CLOSED') {
          console.warn('Tetszik feliratkozás váratlanul lezárult:', error);
        }
      });

    return () => {
      supabase.removeChannel(likesSubscription);
    };
  }, [posts]);

  // Hozzászólások változásaira való feliratkozás
  useEffect(() => {
    const commentsSubscription = supabase
      .channel('comments-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        async (payload) => {
          const newComment = payload.new;
          const { data: authorData, error: authorError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .eq('id', newComment.author_id)
            .single();

          if (authorError) {
            console.error('Hiba a hozzászólás szerzőjének lekérésekor:', authorError.message);
            return;
          }

          const formattedComment = {
            id: newComment.id,
            content: newComment.content,
            created_at: newComment.created_at,
            author: {
              first_name: authorData?.first_name || 'Ismeretlen',
              last_name: authorData?.last_name || '',
            },
          };

          setPosts((prevPosts) =>
            prevPosts.map((post) =>
              post.id === newComment.post_id
                ? { ...post, comments: [...post.comments, formattedComment] }
                : post
            )
          );
          setSavedPosts((prevPosts) =>
            prevPosts.map((post) =>
              post.id === newComment.post_id
                ? { ...post, comments: [...post.comments, formattedComment] }
                : post
            )
          );
        }
      )
      .subscribe((status, error) => {
        console.log('Hozzászólás feliratkozás állapota:', status);
        if (status === 'CLOSED') {
          console.warn('Hozzászólás feliratkozás váratlanul lezárult:', error);
        }
      });

    return () => {
      supabase.removeChannel(commentsSubscription);
    };
  }, []);

  // Mentett bejegyzések változásaira való feliratkozás
  useEffect(() => {
    if (!currentUserId || currentUserId !== userId) return;

    const savedPostsSubscription = supabase
      .channel(`saved-posts-${currentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'saved_posts', filter: `user_id=eq.${currentUserId}` },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newSave = payload.new;
            const { data: postData, error: postError } = await supabase
              .from('posts')
              .select(`
                id, author_id, content, create_at, media_url,
                comments(*, author:profiles(id, first_name, last_name)),
                author:profiles(id, first_name, last_name, avatar_url)
              `)
              .eq('id', newSave.post_id)
              .single();

            if (postError) {
              console.error('Hiba a mentett bejegyzés lekérésekor:', postError.message);
              return;
            }

            const { data: likesData, error: likesError } = await supabase
              .from('likes')
              .select('post_id, user_id')
              .eq('post_id', newSave.post_id);

            if (likesError) {
              console.error('Hiba a kedvelések lekérésekor:', likesError.message);
              return;
            }

            const newPost = {
              ...postData,
              likes: likesData?.length || 0,
              likedBy: likesData?.map((like) => like.user_id) || [],
              comments: (postData.comments || []).map((comment: any) => ({
                id: comment.id,
                content: comment.content,
                created_at: comment.created_at,
                author: {
                  first_name: comment.author?.first_name || 'Ismeretlen',
                  last_name: comment.author?.last_name || '',
                },
              })),
            };

            setSavedPosts((prev) => [newPost, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            const oldSave = payload.old;
            setSavedPosts((prev) => prev.filter((post) => post.id !== oldSave.post_id));
          }
        }
      )
      .subscribe((status, error) => {
        console.log('Mentett bejegyzés feliratkozás állapota:', status);
        if (status === 'CLOSED') {
          console.warn('Mentett bejegyzés feliratkozás váratlanul lezárult:', error);
        }
      });

    return () => {
      supabase.removeChannel(savedPostsSubscription);
    };
  }, [currentUserId, userId]);

  // Tetszik kezelése
  const handleLike = async (id: string) => {
    if (!currentUserId) {
      alert('Kérjük, jelentkezz be a kedveléshez!');
      return;
    }

    try {
      const { data: existingLike, error: selectError } = await supabase
        .from('likes')
        .select('*')
        .eq('post_id', id)
        .eq('user_id', currentUserId);

      if (selectError) throw selectError;

      if (existingLike?.length === 0) {
        const { error: insertError } = await supabase
          .from('likes')
          .insert({ post_id: id, user_id: currentUserId });
        if (insertError) throw insertError;
      } else {
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', id)
          .eq('user_id', currentUserId);
        if (deleteError) throw deleteError;
      }
    } catch (error) {
      console.error('Hiba a kedvelés során:', (error as Error).message);
      alert('Hiba történt a kedvelés során!');
    }
  };

  // Hozzászólás kezelése
  const handleComment = async (id: string) => {
    if (!currentUserId) {
      alert('Kérjük, jelentkezz be a hozzászóláshoz!');
      return;
    }

    const comment = commentInputs[id];
    if (!comment || !comment.trim()) {
      setCommentError('Kérjük, írj egy hozzászólást!');
      return;
    }

    setCommentError(null);
    setCommentLoading(id);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({ post_id: id, author_id: currentUserId, content: comment });

      if (error) throw error;

      setCommentInputs((prev) => ({ ...prev, [id]: '' }));
    } catch (error) {
      setCommentError('Hiba történt a hozzászólás hozzáadása során. Kérjük, próbáld újra!');
      console.error('Hiba a hozzászólás hozzáadásakor:', (error as Error).message);
    } finally {
      setCommentLoading(null);
    }
  };

  // Hozzászólási szekció váltása
  const toggleCommentSection = (postId: string) => {
    if (!currentUserId) {
      alert('Kérjük, jelentkezz be a hozzászólások megtekintéséhez!');
      return;
    }
    setOpenCommentSections((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  // Megosztás kezelése
  const handleShare = (postId: string) => {
    if (!userId) return;
    const postUrl = `${window.location.origin}/personal-profile/${userId}#${postId}`;
    navigator.clipboard.writeText(postUrl).then(() => {
      alert('A bejegyzés linkje a vágólapra másolva!');
    }).catch((err) => {
      console.error('Hiba a link másolásakor:', err);
    });
  };

  // Üzenetküldés kezelése
  const handleMessage = () => {
    if (!currentUserId) {
      alert('Kérjük, jelentkezz be az üzenetküldéshez!');
      return;
    }
    if (userId) {
      navigate(`/messages/${userId}`);
    }
  };

  // Követés/követés megszüntetése kezelése
  const handleFollow = async () => {
    if (!currentUserId) {
      alert('Kérjük, jelentkezz be a követéshez!');
      return;
    }
    if (!userId) return;

    setFollowLoading(true);
    try {
      const { data: existingFollow, error: checkError } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('followed_id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Hiba a követési kapcsolat ellenőrzésekor:', checkError.message);
        throw checkError;
      }

      if (existingFollow && !isFollowing) {
        alert('Már követed ezt a felhasználót!');
        setIsFollowing(true);
        setFollowLoading(false);
        return;
      }

      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('followed_id', userId);

        if (error) throw error;
        setIsFollowing(false);
        setProfile((prev) => (prev ? { ...prev, followersCount: prev.followersCount - 1 } : null));
        setFollowers((prev) => prev.filter((f) => f.id !== currentUserId));
        alert('Sikeresen megszüntetted a követést!');
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: currentUserId, followed_id: userId });

        if (error) throw error;
        setFollowSuccess(true);
        setTimeout(async () => {
          setFollowSuccess(false);
          setIsFollowing(true);
          setProfile((prev) => (prev ? { ...prev, followersCount: prev.followersCount + 1 } : null));
          const { data: currentUserProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_url')
            .eq('id', currentUserId)
            .single();
          if (profileError) {
            console.error('Hiba az aktuális felhasználó profiljának lekérésekor:', profileError.message);
            return;
          }
          if (currentUserProfile) {
            setFollowers((prev) => [
              ...prev,
              {
                id: currentUserProfile.id,
                first_name: currentUserProfile.first_name,
                last_name: currentUserProfile.last_name,
                avatar_url: currentUserProfile.avatar_url,
              },
            ]);
          }
          alert('Sikeresen követted a felhasználót!');
        }, 1000);
      }
    } catch (error) {
      console.error('Hiba a követés kezelésében:', (error as Error).message);
      alert('Hiba történt a követés során!');
    } finally {
      setFollowLoading(false);
    }
  };

  // Felhasználói kattintás kezelése, átirányítás a profiloldalra
  const handleUserClick = (clickedUserId: string) => {
    navigate(`/personal-profile/${clickedUserId}`);
    setShowFollowModal(false);
  };

  // Bejegyzések renderelése
  const renderPosts = (postList: Post[]) => (
    postList.length > 0 ? (
      postList.map((post) => (
        <div key={post.id} className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <img
                src={post.author?.avatar_url || 'https://via.placeholder.com/40'}
                alt={`${post.author?.first_name} ${post.author?.last_name}`}
                className="w-10 h-10 rounded-full object-cover mr-3"
              />
              <span className="font-semibold text-gray-800">
                {post.author?.first_name} {post.author?.last_name}
              </span>
            </div>
            <button
              className="text-gray-600 hover:text-primary transition-colors"
              onClick={() => handleShare(post.id)}
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
          <p className="text-gray-700">{post.content}</p>
          {post.media_url ? (
            post.media_url.includes('.mp4') || post.media_url.includes('.mov') ? (
              <video
                src={post.media_url}
                controls
                className="mt-4 rounded-lg w-full object-cover h-64"
              />
            ) : (
              <img
                src={post.media_url}
                alt="Bejegyzés média"
                className="mt-4 rounded-lg w-full object-cover h-64"
              />
            )
          ) : null}
          <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-4">
              <button
                className="flex items-center text-gray-600 hover:text-primary transition-colors"
                onClick={() => handleLike(post.id)}
              >
                <Heart
                  className={`h-5 w-5 mr-1 ${post.likedBy.includes(currentUserId || '') ? 'text-red-500' : ''}`}
                />
                <span>{post.likes}</span>
              </button>
              <button
                className="flex items-center text-gray-600 hover:text-primary transition-colors"
                onClick={() => toggleCommentSection(post.id)}
              >
                <MessageCircle className="h-5 w-5 mr-1" />
                <span>{post.comments.length}</span>
              </button>
            </div>
            <div className="text-sm text-gray-500">
              {new Date(post.create_at).toLocaleString()}
            </div>
          </div>

          {openCommentSections[post.id] && (
            <div className="mt-4 bg-white rounded-xl shadow-sm p-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Hozzászólások</h4>
              <div className="max-h-60 overflow-y-auto space-y-3">
                {post.comments.length > 0 ? (
                  post.comments
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((comment) => (
                      <div
                        key={comment.id}
                        className="border-b border-gray-200 pb-3 last:border-b-0"
                      >
                        <div className="flex items-start">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <span className="font-semibold text-gray-800">
                                {comment.author.first_name} {comment.author.last_name}:
                              </span>
                              <span className="ml-2 text-xs text-gray-400">
                                {new Date(comment.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-gray-700 mt-1">{comment.content}</p>
                          </div>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-gray-500 text-center py-4">Még nincs hozzászólás, legyél az első!</p>
                )}
              </div>
              {currentUserId && (
                <div className="mt-4">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      className="flex-1 p-2 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Hagyj egy hozzászólást!"
                      value={commentInputs[post.id] || ''}
                      onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleComment(post.id);
                        }
                      }}
                      disabled={commentLoading === post.id}
                    />
                    <button
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300"
                      onClick={() => handleComment(post.id)}
                      disabled={commentLoading === post.id}
                    >
                      {commentLoading === post.id ? 'Küldés...' : 'Hozzászólás'}
                    </button>
                  </div>
                  {commentError && (
                    <p className="text-red-500 text-sm mt-2">{commentError}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))
    ) : (
      <p className="text-gray-500 text-center">
        {activeTab === 'posts'
          ? 'Ez a felhasználó még nem tett közzé bejegyzést.'
          : 'Még nincs mentett bejegyzés.'}
      </p>
    )
  );

  // Betöltési állapot
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Betöltés...</p>
      </div>
    );
  }

  // Felhasználó nem található
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Felhasználó nem található</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        {/* Felhasználói információk */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img
                src={profile.avatar_url || 'https://via.placeholder.com/150'}
                alt={`${profile.first_name} ${profile.last_name}`}
                className="w-24 h-24 rounded-full object-cover"
              />
              <div className="ml-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile.first_name} {profile.last_name}
                </h1>
                <div className="flex items-center gap-2">
                  <p className="text-gray-600">
                    {profile.user_type === 'trainer' ? 'Fitness Edző' : 'Közösségi Tag'}
                  </p>
                  {currentUserId !== userId && (
                    <button
                      className={`flex items-center px-3 py-1 rounded-lg transition-colors ${
                        followLoading
                          ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                          : followSuccess
                          ? 'bg-green-500 text-white'
                          : isFollowing
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      }`}
                      onClick={handleFollow}
                      disabled={followLoading}
                    >
                      {followLoading ? (
                        'Feldolgozás...'
                      ) : followSuccess ? (
                        '✅'
                      ) : isFollowing ? (
                        'Követed'
                      ) : (
                        <>
                          <UserPlus className="h-4 w-4 mr-1" />
                          Követés
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-sm text-gray-700 flex flex-col items-end gap-2">
                <button
                  className="hover:underline"
                  onClick={() => setShowFollowModal(true)}
                >
                  <strong>Követők száma:</strong> {profile.followersCount}
                </button>
                <span>
                  <strong>Összes kedvelés:</strong> {totalLikes}
                </span>
              </div>
              {currentUserId !== userId && (
                <button
                  className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  onClick={handleMessage}
                >
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Üzenet
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Követők/követések modális ablak */}
        {showFollowModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Követők és Követések</h2>
                <button onClick={() => setShowFollowModal(false)}>
                  <X className="h-6 w-6 text-gray-600" />
                </button>
              </div>
              <div className="flex border-b border-gray-200 mb-4">
                <button
                  className={`flex-1 py-2 text-center ${activeTab === 'followers' ? 'border-b-2 border-blue-500 font-semibold' : 'text-gray-500'}`}
                  onClick={() => setActiveTab('followers')}
                >
                  Követők ({followers.length})
                </button>
                <button
                  className={`flex-1 py-2 text-center ${activeTab === 'following' ? 'border-b-2 border-blue-500 font-semibold' : 'text-gray-500'}`}
                  onClick={() => setActiveTab('following')}
                >
                  Követések ({following.length})
                </button>
              </div>
              <div className="space-y-4">
                {activeTab === 'followers' ? (
                  followers.length > 0 ? (
                    followers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
                        onClick={() => handleUserClick(user.id)}
                      >
                        <div className="flex items-center">
                          <img
                            src={user.avatar_url || 'https://via.placeholder.com/40'}
                            alt={`${user.first_name} ${user.last_name}`}
                            className="w-10 h-10 rounded-full object-cover mr-3"
                          />
                          <span className="font-medium">
                            {user.first_name} {user.last_name}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center">Még nincs követő.</p>
                  )
                ) : (
                  following.length > 0 ? (
                    following.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2 hover:bg-gray-100 rounded-lg cursor-pointer"
                        onClick={() => handleUserClick(user.id)}
                      >
                        <div className="flex items-center">
                          <img
                            src={user.avatar_url || 'https://via.placeholder.com/40'}
                            alt={`${user.first_name} ${user.last_name}`}
                            className="w-10 h-10 rounded-full object-cover mr-3"
                          />
                          <span className="font-medium">
                            {user.first_name} {user.last_name}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center">Még nem követ senkit.</p>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bejegyzések és mentett bejegyzések váltása */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`flex-1 py-2 text-center ${activeTab === 'posts' ? 'border-b-2 border-blue-500 font-semibold' : 'text-gray-500'}`}
            onClick={() => setActiveTab('posts')}
          >
            Bejegyzések ({posts.length})
          </button>
          {currentUserId === userId && (
            <button
              className={`flex-1 py-2 text-center ${activeTab === 'saved' ? 'border-b-2 border-blue-500 font-semibold' : 'text-gray-500'}`}
              onClick={() => setActiveTab('saved')}
            >
              Mentett bejegyzések ({savedPosts.length})
            </button>
          )}
        </div>

        {/* Bejegyzések listája */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {activeTab === 'posts' ? 'Bejegyzések' : 'Mentett bejegyzések'}
          </h2>
          {activeTab === 'posts' ? renderPosts(posts) : renderPosts(savedPosts)}
        </div>
      </div>
    </div>
  );
};

export default PersonalProfile;