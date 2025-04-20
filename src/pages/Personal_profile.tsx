import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Navigation from '../components/Navigation';
import { Heart, Share2, MessageCircle, MessageSquare, UserPlus, X, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from 'react-modal';

// 绑定模态框到应用根元素
Modal.setAppElement('#root');

// 接口定义（与原代码相同）
interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  user_type: string;
  followersCount: number;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author: { first_name: string; last_name: string };
}

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
  const [showFollowPanel, setShowFollowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'followers' | 'following'>('posts');
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [following, setFollowing] = useState<FollowUser[]>([]);
  const [mediaModal, setMediaModal] = useState<{ isOpen: boolean; url: string | null; isVideo: boolean }>({ isOpen: false, url: null, isVideo: false });

  // 认证和数据获取逻辑（与原代码相同）
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
        setIsFollowing(!!followData?.length);
      } catch (error) {
        console.error('Hiba a követési állapot ellenőrzésekor:', (error as Error).message);
      }
    };
    checkFollowingStatus();
  }, [currentUserId, userId]);

  useEffect(() => {
    const fetchProfileAndPosts = async () => {
      if (!userId) return;
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, user_type')
          .eq('id', userId)
          .single();
        if (profileError || !profileData) throw new Error(profileError?.message || 'Felhasználó nem található');

        const { data: followersData, error: followersError } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('followed_id', userId);
        if (followersError) throw followersError;

        const followersCount = followersData?.length || 0;
        setProfile({ ...profileData, followersCount });

        // Lekérdezzük a követőket közvetlenül a profiles táblából
        const { data: followersProfiles, error: followersProfilesError } = await supabase
          .from('followers_with_profiles')
          .select('follower_id, follower_first_name, follower_last_name, follower_avatar_url')
          .eq('followed_id', userId);
        
        if (followersProfilesError) {
          // Ha a nézet még nem létezik, próbáljuk meg közvetlenül a follows táblából
          console.log('Hiba a követők lekérdezésekor a nézetből:', followersProfilesError.message);
          
          // Alternatív lekérdezés közvetlenül a follows és profiles táblákból
          const { data: altFollowersData, error: altError } = await supabase
            .from('follows')
            .select('follower_id')
            .eq('followed_id', userId);
            
          if (altError) throw altError;
          
          // Lekérdezzük a profilokat a follower_id alapján
          if (altFollowersData && altFollowersData.length > 0) {
            const followerIds = altFollowersData.map(f => f.follower_id);
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, avatar_url')
              .in('id', followerIds);
              
            if (profilesError) throw profilesError;
            
            setFollowers(profilesData || []);
          } else {
            setFollowers([]);
          }
        } else {
          // Map the followers data from the view
          setFollowers(
            (followersProfiles || [])
              .map((f: any) => ({
                id: f.follower_id,
                first_name: f.follower_first_name,
                last_name: f.follower_last_name,
                avatar_url: f.follower_avatar_url,
              }))
              .filter((f): f is FollowUser => !!f.id) || []
          );
        }

        // Lekérdezzük a követetteket közvetlenül a profiles táblából
        const { data: followingProfiles, error: followingProfilesError } = await supabase
          .from('followers_with_profiles')
          .select('followed_id, followed_first_name, followed_last_name, followed_avatar_url')
          .eq('follower_id', userId);
        
        if (followingProfilesError) {
          // Ha a nézet még nem létezik, próbáljuk meg közvetlenül a follows táblából
          console.log('Hiba a követettek lekérdezésekor a nézetből:', followingProfilesError.message);
          
          // Alternatív lekérdezés közvetlenül a follows és profiles táblákból
          const { data: altFollowingData, error: altError } = await supabase
            .from('follows')
            .select('followed_id')
            .eq('follower_id', userId);
            
          if (altError) throw altError;
          
          // Lekérdezzük a profilokat a followed_id alapján
          if (altFollowingData && altFollowingData.length > 0) {
            const followedIds = altFollowingData.map(f => f.followed_id);
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, first_name, last_name, avatar_url')
              .in('id', followedIds);
              
            if (profilesError) throw profilesError;
            
            setFollowing(profilesData || []);
          } else {
            setFollowing([]);
          }
        } else {
          // Map the following data from the view
          setFollowing(
            (followingProfiles || [])
              .map((f: any) => ({
                id: f.followed_id,
                first_name: f.followed_first_name,
                last_name: f.followed_last_name,
                avatar_url: f.followed_avatar_url,
              }))
              .filter((f): f is FollowUser => !!f.id) || []
          );
        }

        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            id, author_id, content, create_at, media_url,
            comments(*, author:profiles(id, first_name, last_name)),
            author:profiles(id, first_name, last_name, avatar_url)
          `)
          .eq('author_id', userId)
          .order('create_at', { ascending: false });
        if (postsError) throw postsError;

        const { data: likesData, error: likesError } = await supabase
          .from('likes')
          .select('post_id, user_id');
        if (likesError) throw likesError;

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
          if (savedPostsError) throw savedPostsError;

          // Use a direct approach with a simple array
          const savedPostsList: Post[] = [];
          
          if (savedPostsData && savedPostsData.length > 0) {
            // Process each saved post
            savedPostsData.forEach((savedPost: any) => {
              if (!savedPost.posts) return;
              
              // Create a post object with explicit properties
              savedPostsList.push({
                id: savedPost.posts.id || '',
                author_id: savedPost.posts.author_id || '',
                content: savedPost.posts.content || '',
                create_at: savedPost.posts.create_at || '',
                media_url: savedPost.posts.media_url || null,
                likes: likesData?.filter((like) => like.post_id === savedPost.post_id).length || 0,
                likedBy: likesData?.filter((like) => like.post_id === savedPost.post_id).map((like) => like.user_id) || [],
                author: {
                  id: savedPost.posts.author?.id || '',
                  first_name: savedPost.posts.author?.first_name || '',
                  last_name: savedPost.posts.author?.last_name || '',
                  avatar_url: savedPost.posts.author?.avatar_url || null
                },
                comments: Array.isArray(savedPost.posts.comments) 
                  ? savedPost.posts.comments.map((comment: any) => ({
                      id: comment.id || '',
                      content: comment.content || '',
                      created_at: comment.created_at || '',
                      author: {
                        first_name: comment.author?.first_name || 'Ismeretlen',
                        last_name: comment.author?.last_name || ''
                      }
                    }))
                  : []
              });
            });
          }
          
          // Assign the properly typed array
          savedPostsWithLikes = savedPostsList;
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
        
        // Use double type assertions as recommended by TypeScript
        setPosts(postsWithLikes as unknown as Post[]);
        setSavedPosts(savedPostsWithLikes as unknown as Post[]);
        setTotalLikes(totalLikesCount);
      } catch (error) {
        console.error('Hiba a profil és bejegyzések lekérésekor:', (error as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileAndPosts();
  }, [userId, currentUserId]);

  // 点赞、评论、保存帖子订阅（与原代码相同）
  useEffect(() => {
    const likesSubscription = supabase
      .channel('likes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, (payload) => {
        const { eventType, new: newLike, old: oldLike } = payload;
        setPosts((prevPosts) =>
          prevPosts.map((post) => {
            if (eventType === 'INSERT' && newLike.post_id === post.id) {
              return { ...post, likes: post.likes + 1, likedBy: [...post.likedBy, newLike.user_id] };
            } else if (eventType === 'DELETE' && oldLike.post_id === post.id) {
              return { ...post, likes: post.likes - 1, likedBy: post.likedBy.filter((uid) => uid !== oldLike.user_id) };
            }
            return post;
          })
        );
        setSavedPosts((prevPosts) =>
          prevPosts.map((post) => {
            if (eventType === 'INSERT' && newLike.post_id === post.id) {
              return { ...post, likes: post.likes + 1, likedBy: [...post.likedBy, newLike.user_id] };
            } else if (eventType === 'DELETE' && oldLike.post_id === post.id) {
              return { ...post, likes: post.likes - 1, likedBy: post.likedBy.filter((uid) => uid !== oldLike.user_id) };
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
      })
      .subscribe();
    return () => {
      supabase.removeChannel(likesSubscription);
    };
  }, [posts]);

  useEffect(() => {
    const commentsSubscription = supabase
      .channel('comments-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, async (payload) => {
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
            post.id === newComment.post_id ? { ...post, comments: [...post.comments, formattedComment] } : post
          )
        );
        setSavedPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === newComment.post_id ? { ...post, comments: [...post.comments, formattedComment] } : post
          )
        );
      })
      .subscribe();
    return () => {
      supabase.removeChannel(commentsSubscription);
    };
  }, []);

  useEffect(() => {
    if (!currentUserId || currentUserId !== userId) return;
    const savedPostsSubscription = supabase
      .channel(`saved-posts-${currentUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_posts', filter: `user_id=eq.${currentUserId}` }, async (payload) => {
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
          // Create a properly typed Post object
          const newPost: Post = {
            id: postData.id,
            author_id: postData.author_id,
            content: postData.content,
            create_at: postData.create_at,
            media_url: postData.media_url,
            likes: likesData?.length || 0,
            likedBy: likesData?.map((like) => like.user_id) || [],
            // Use a type assertion to handle the author property correctly
            author: {
              id: (postData.author as any).id || '',
              first_name: (postData.author as any).first_name || '',
              last_name: (postData.author as any).last_name || '',
              avatar_url: (postData.author as any).avatar_url || null
            },
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
        } else if (payload.eventType === 'DELETE' && payload.old) {
          const oldSave = payload.old as { post_id: string };
          setSavedPosts((prev) => prev.filter((post) => post.id !== oldSave.post_id));
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(savedPostsSubscription);
    };
  }, [currentUserId, userId]);

  // 交互处理函数（与原代码相同）
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

  const toggleCommentSection = (postId: string) => {
    if (!currentUserId) {
      alert('Kérjük, jelentkezz be a hozzászólások megtekintéséhez!');
      return;
    }
    setOpenCommentSections((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleShare = (postId: string) => {
    if (!userId) return;
    const postUrl = `${window.location.origin}/personal-profile/${userId}#${postId}`;
    navigator.clipboard.writeText(postUrl).then(() => {
      alert('A bejegyzés linkje a vágólapra másolva!');
    }).catch((err) => {
      console.error('Hiba a link másolásakor:', err);
    });
  };

  const handleMessage = () => {
    if (!currentUserId) {
      alert('Kérjük, jelentkezz be az üzenetküldéshez!');
      return;
    }
    if (userId) {
      navigate(`/messages/${userId}`);
    }
  };

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

  const handleUserClick = (clickedUserId: string) => {
    navigate(`/personal-profile/${clickedUserId}`);
    setShowFollowPanel(false);
  };

  // 打开媒体预览模态框
  const openMediaModal = (url: string, isVideo: boolean) => {
    setMediaModal({ isOpen: true, url, isVideo });
  };

  // 关闭媒体预览模态框
  const closeMediaModal = () => {
    setMediaModal({ isOpen: false, url: null, isVideo: false });
  };

  // 渲染帖子
  const renderPosts = (postList: Post[]) => (
    postList.length > 0 ? (
      postList.map((post, index) => (
        <motion.div
          key={post.id}
          className="bg-white rounded-2xl shadow-lg p-6 mb-6 hover:shadow-xl transition-shadow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <img
                src={post.author?.avatar_url || 'https://via.placeholder.com/40'}
                alt={`${post.author?.first_name} ${post.author?.last_name}`}
                className="w-12 h-12 rounded-full object-cover mr-4 shadow-sm"
              />
              <div>
                <span className="font-semibold text-gray-800 text-lg">
                  {post.author?.first_name} {post.author?.last_name}
                </span>
                <p className="text-sm text-gray-500">{new Date(post.create_at).toLocaleString()}</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              className="text-gray-600 hover:text-blue-500 transition-colors"
              onClick={() => handleShare(post.id)}
            >
              <Share2 className="h-5 w-5" />
            </motion.button>
          </div>
          <p className="text-gray-700 text-base leading-relaxed mb-4">{post.content}</p>
          {post.media_url ? (
            <div
              className="relative rounded-lg overflow-hidden cursor-pointer"
              onClick={() =>
                openMediaModal(
                  post.media_url,
                  post.media_url.includes('.mp4') || post.media_url.includes('.mov')
                )
              }
            >
              {post.media_url.includes('.mp4') || post.media_url.includes('.mov') ? (
                <video
                  src={post.media_url}
                  className="w-full h-64 object-cover"
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={post.media_url}
                  alt="Bejegyzés média"
                  className="w-full h-64 object-cover"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 opacity-0 hover:opacity-100 transition-opacity">
                <ImageIcon className="h-8 w-8 text-white" />
              </div>
            </div>
          ) : null}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex items-center text-gray-600 hover:text-red-500 transition-colors"
                onClick={() => handleLike(post.id)}
              >
                <Heart
                  className={`h-6 w-6 mr-2 ${post.likedBy.includes(currentUserId || '') ? 'text-red-500 fill-red-500' : ''}`}
                />
                <span>{post.likes}</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="flex items-center text-gray-600 hover:text-blue-500 transition-colors"
                onClick={() => toggleCommentSection(post.id)}
              >
                <MessageCircle className="h-6 w-6 mr-2" />
                <span>{post.comments.length}</span>
              </motion.button>
            </div>
          </div>
          <AnimatePresence>
            {openCommentSections[post.id] && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 bg-gray-50 rounded-xl p-4"
              >
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Hozzászólások</h4>
                <div className="max-h-60 overflow-y-auto space-y-3">
                  {post.comments.length > 0 ? (
                    post.comments
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .map((comment) => (
                        <motion.div
                          key={comment.id}
                          className="border-b border-gray-200 pb-3 last:border-b-0"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          <div className="flex items-start">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <span className="font-semibold text-gray-800">
                                  {comment.author.first_name} {comment.author.last_name}
                                </span>
                                <span className="ml-2 text-xs text-gray-400">
                                  {new Date(comment.created_at).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-gray-700 mt-1">{comment.content}</p>
                            </div>
                          </div>
                        </motion.div>
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
                        className="flex-1 p-3 border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Hagyj egy hozzászólást..."
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
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all disabled:bg-gray-300"
                        onClick={() => handleComment(post.id)}
                        disabled={commentLoading === post.id}
                      >
                        {commentLoading === post.id ? 'Küldés...' : 'Hozzászólás'}
                      </motion.button>
                    </div>
                    {commentError && (
                      <p className="text-red-500 text-sm mt-2">{commentError}</p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))
    ) : (
      <p className="text-gray-500 text-center py-8">
        {activeTab === 'posts' ? 'Ez a felhasználó még nem tett közzé bejegyzést.' : 'Még nincs mentett bejegyzés.'}
      </p>
    )
  );

  // 加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <p className="text-xl text-gray-600">Betöltés...</p>
      </div>
    );
  }

  // 用户未找到
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center">
        <p className="text-xl text-gray-600">Felhasználó nem található</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-10 flex flex-col lg:flex-row gap-8">
        {/* 侧边栏 - 用户档案 */}
        <motion.div
          className="lg:w-1/3 bg-white rounded-2xl shadow-lg p-8 sticky top-20"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col items-center">
            <motion.img
              src={profile.avatar_url || 'https://via.placeholder.com/150'}
              alt={`${profile.first_name} ${profile.last_name}`}
              className="w-32 h-32 rounded-full object-cover shadow-md border-4 border-white"
              whileHover={{ scale: 1.05 }}
            />
            <h1 className="text-2xl font-bold text-gray-900 mt-4">
              {profile.first_name} {profile.last_name}
            </h1>
            <p className="text-gray-600 mt-1">
              {profile.user_type === 'trainer' ? 'Fitness Edző' : 'Közösségi Tag'}
            </p>
            <div className="flex gap-4 mt-4">
              {currentUserId !== userId && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center px-4 py-2 rounded-lg text-white transition-all ${
                    followLoading
                      ? 'bg-gray-300 cursor-not-allowed'
                      : followSuccess
                      ? 'bg-green-500'
                      : isFollowing
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600'
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
                      <UserPlus className="h-5 w-5 mr-2" />
                      Követés
                    </>
                  )}
                </motion.button>
              )}
              {currentUserId !== userId && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-all"
                  onClick={handleMessage}
                >
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Üzenet
                </motion.button>
              )}
            </div>
            <div className="mt-6 w-full grid grid-cols-2 gap-4">
              <motion.div
                className="bg-gray-50 rounded-lg p-4 text-center cursor-pointer"
                whileHover={{ scale: 1.03 }}
                onClick={() => setShowFollowPanel(true)}
              >
                <p className="text-lg font-semibold text-gray-800">{profile.followersCount}</p>
                <p className="text-sm text-gray-600">Követők</p>
              </motion.div>
              <motion.div
                className="bg-gray-50 rounded-lg p-4 text-center cursor-pointer"
                whileHover={{ scale: 1.03 }}
                onClick={() => setShowFollowPanel(true)}
              >
                <p className="text-lg font-semibold text-gray-800">{totalLikes}</p>
                <p className="text-sm text-gray-600">Kedvelések</p>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* 主内容区 */}
        <div className="lg:w-2/3">
          {/* 选项卡导航 */}
          <div className="flex border-b border-gray-200 mb-6">
            <motion.button
              className={`flex-1 py-3 text-center text-lg font-medium ${
                activeTab === 'posts' ? 'border-b-4 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('posts')}
              whileHover={{ scale: 1.05 }}
            >
              Bejegyzések ({posts.length})
            </motion.button>
            {currentUserId === userId && (
              <motion.button
                className={`flex-1 py-3 text-center text-lg font-medium ${
                  activeTab === 'saved' ? 'border-b-4 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('saved')}
                whileHover={{ scale: 1.05 }}
              >
                Mentett ({savedPosts.length})
              </motion.button>
            )}
          </div>

          {/* 帖子列表 - Most görgethető konténer */}
          <div className="overflow-y-auto max-h-[calc(100vh-200px)] pr-2 space-y-6 custom-scrollbar">
            {activeTab === 'posts' ? renderPosts(posts) : renderPosts(savedPosts)}
          </div>
        </div>

        {/* 粉丝/关注侧滑面板 */}
        <AnimatePresence>
          {showFollowPanel && (
            <motion.div
              className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl z-50 overflow-y-auto"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Követők és Követések</h2>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    onClick={() => setShowFollowPanel(false)}
                  >
                    <X className="h-6 w-6 text-gray-600" />
                  </motion.button>
                </div>
                <div className="flex border-b border-gray-200 mb-6">
                  <motion.button
                    className={`flex-1 py-3 text-center text-lg font-medium ${
                      activeTab === 'followers' ? 'border-b-4 border-blue-500 text-blue-600' : 'text-gray-500'
                    }`}
                    onClick={() => setActiveTab('followers')}
                    whileHover={{ scale: 1.05 }}
                  >
                    Követők ({followers.length})
                  </motion.button>
                  <motion.button
                    className={`flex-1 py-3 text-center text-lg font-medium ${
                      activeTab === 'following' ? 'border-b-4 border-blue-500 text-blue-600' : 'text-gray-500'
                    }`}
                    onClick={() => setActiveTab('following')}
                    whileHover={{ scale: 1.05 }}
                  >
                    Követések ({following.length})
                  </motion.button>
                </div>
                <div className="space-y-4">
                  {activeTab === 'followers' ? (
                    followers.length > 0 ? (
                      followers.map((user) => (
                        <motion.div
                          key={user.id}
                          className="flex items-center p-3 hover:bg-gray-100 rounded-lg cursor-pointer"
                          whileHover={{ scale: 1.02 }}
                          onClick={() => handleUserClick(user.id)}
                        >
                          <img
                            src={user.avatar_url || 'https://via.placeholder.com/40'}
                            alt={`${user.first_name} ${user.last_name}`}
                            className="w-10 h-10 rounded-full object-cover mr-3"
                          />
                          <span className="font-medium text-gray-800">
                            {user.first_name} {user.last_name}
                          </span>
                        </motion.div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">Még nincs követő.</p>
                    )
                  ) : (
                    following.length > 0 ? (
                      following.map((user) => (
                        <motion.div
                          key={user.id}
                          className="flex items-center p-3 hover:bg-gray-100 rounded-lg cursor-pointer"
                          whileHover={{ scale: 1.02 }}
                          onClick={() => handleUserClick(user.id)}
                        >
                          <img
                            src={user.avatar_url || 'https://via.placeholder.com/40'}
                            alt={`${user.first_name} ${user.last_name}`}
                            className="w-10 h-10 rounded-full object-cover mr-3"
                          />
                          <span className="font-medium text-gray-800">
                            {user.first_name} {user.last_name}
                          </span>
                        </motion.div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">Még nem követ senkit.</p>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 媒体预览模态框 */}
        <Modal
          isOpen={mediaModal.isOpen}
          onRequestClose={closeMediaModal}
          className="flex items-center justify-center h-full"
          overlayClassName="fixed inset-0 bg-black bg-opacity-75 z-50"
        >
          <div className="relative max-w-4xl w-full">
            <motion.button
              whileHover={{ scale: 1.1 }}
              className="absolute top-4 right-4 text-white"
              onClick={closeMediaModal}
            >
              <X className="h-8 w-8" />
            </motion.button>
            {mediaModal.url && (
              mediaModal.isVideo ? (
                <video
                  src={mediaModal.url}
                  controls
                  className="w-full h-auto rounded-lg"
                />
              ) : (
                <img
                  src={mediaModal.url}
                  alt="Média előnézet"
                  className="w-full h-auto rounded-lg"
                />
              )
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default PersonalProfile;