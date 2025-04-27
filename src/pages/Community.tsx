import { useState, useEffect } from 'react';
import { MessageCircle, Heart, Share2, BookmarkPlus, UserPlus, Search, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from 'react-modal';

// 绑定模态框到应用根元素
Modal.setAppElement('#root');

interface Post {
  id: string;
  author_id: string;
  content: string;
  create_at: string;
  media_url: string | null;
  author: {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    user_type: string;
  };
  comments: Array<{
    id: string;
    content: string;
    created_at: string;
    author: { first_name: string; last_name: string; id: string };
  }>;
  likes: number;
  likedBy: string[];
  isFollowed: boolean;
  isSaved: boolean;
}

const Community = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'trainer'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [openCommentSections, setOpenCommentSections] = useState<{ [key: string]: boolean }>({});
  const [commentLoading, setCommentLoading] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState<string>('');
  const [newPostMedia, setNewPostMedia] = useState<File | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState<{ postId: string; message: string } | null>(null);
  const [mediaModal, setMediaModal] = useState<{ isOpen: boolean; url: string | null; isVideo: boolean }>({ isOpen: false, url: null, isVideo: false });

  // 认证状态监听
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user ? user.id : null);
    };
    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setCurrentUserId(session?.user.id || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 加载帖子
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            *,
            author:profiles(id, first_name, last_name, avatar_url, user_type),
            comments(*, author:profiles(id, first_name, last_name), created_at),
            media_url
          `)
          .order('create_at', { ascending: false });

        if (postsError) throw postsError;

        const { data: likes, error: likesError } = await supabase
          .from('likes')
          .select('post_id, user_id');

        if (likesError) throw likesError;

        const { data: savedPosts, error: savedError } = await supabase
          .from('saved_posts')
          .select('post_id')
          .eq('user_id', currentUserId || '');

        if (savedError && currentUserId) throw savedError;

        const followedIds = currentUserId
          ? (await supabase.from('follows').select('followed_id').eq('follower_id', currentUserId)).data?.map(f => f.followed_id) || []
          : [];

        const postsWithLikes = postsData.map((post) => ({
          ...post,
          likes: likes.filter((like) => like.post_id === post.id).length,
          likedBy: likes.filter((like) => like.post_id === post.id).map((like) => like.user_id),
          isFollowed: followedIds.includes(post.author_id),
          isSaved: currentUserId ? savedPosts?.some((sp) => sp.post_id === post.id) || false : false,
          comments: post.comments.map((comment) => ({
            ...comment,
            author: {
              id: comment.author.id,
              first_name: comment.author.first_name,
              last_name: comment.author.last_name,
            },
          })),
        }));

        setPosts(postsWithLikes);
      } catch (error) {
        console.error('Error fetching posts:', (error as Error).message);
      }
    };
    fetchPosts();
  }, [currentUserId]);

  // 点赞订阅 - Módosítva, hogy ne okozzon duplikációt az optimista UI frissítéssel
  useEffect(() => {
    const likesSubscription = supabase
      .channel('likes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, (payload) => {
        const { eventType, new: newLike, old: oldLike } = payload;
        
        // Csak akkor frissítjük a UI-t, ha a változás nem a jelenlegi felhasználótól származik
        // Így elkerüljük a duplikációt az optimista UI frissítéssel
        if ((eventType === 'INSERT' && newLike.user_id !== currentUserId) ||
            (eventType === 'DELETE' && oldLike.user_id !== currentUserId)) {
          setPosts((prevPosts) =>
            prevPosts.map((post) => {
              if (eventType === 'INSERT' && newLike.post_id === post.id) {
                return { 
                  ...post, 
                  likes: post.likes + 1, 
                  likedBy: [...post.likedBy, newLike.user_id] 
                };
              } else if (eventType === 'DELETE' && oldLike.post_id === post.id) {
                return { 
                  ...post, 
                  likes: post.likes - 1, 
                  likedBy: post.likedBy.filter((uid) => uid !== oldLike.user_id) 
                };
              }
              return post;
            })
          );
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(likesSubscription);
    };
  }, [currentUserId]);

  // 评论订阅
  useEffect(() => {
    const commentsSubscription = supabase
      .channel('comments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const newComment = payload.new;
          const { data: authorData, error: authorError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name')
            .eq('id', newComment.author_id)
            .single();
          if (authorError) {
            console.error('Error fetching comment author:', authorError.message);
            return;
          }
          const formattedComment = {
            id: newComment.id,
            content: newComment.content,
            created_at: newComment.created_at,
            author: {
              id: authorData.id,
              first_name: authorData.first_name,
              last_name: authorData.last_name,
            },
          };
          setPosts((prevPosts) =>
            prevPosts.map((post) =>
              post.id === newComment.post_id ? { ...post, comments: [...post.comments, formattedComment] } : post
            )
          );
        } else if (payload.eventType === 'DELETE') {
          const oldComment = payload.old;
          setPosts((prevPosts) =>
            prevPosts.map((post) =>
              post.id === oldComment.post_id ? { ...post, comments: post.comments.filter((c) => c.id !== oldComment.id) } : post
            )
          );
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(commentsSubscription);
    };
  }, []);

  // 保存帖子订阅
  useEffect(() => {
    if (!currentUserId) return;
    const savedPostsSubscription = supabase
      .channel('saved-posts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_posts', filter: `user_id=eq.${currentUserId}` }, (payload) => {
        const { eventType, new: newSave, old: oldSave } = payload;
        setPosts((prevPosts) =>
          prevPosts.map((post) => {
            if (eventType === 'INSERT' && newSave.post_id === post.id) {
              return { ...post, isSaved: true };
            } else if (eventType === 'DELETE' && oldSave.post_id === post.id) {
              return { ...post, isSaved: false };
            }
            return post;
          })
        );
      })
      .subscribe();
    return () => {
      supabase.removeChannel(savedPostsSubscription);
    };
  }, [currentUserId]);

  // 过滤帖子
  const filteredPosts = activeTab === 'all'
    ? posts.filter((post) =>
        post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${post.author.first_name} ${post.author.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : posts.filter((post) =>
        post.author.user_type === 'trainer' &&
        (post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
         `${post.author.first_name} ${post.author.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()))
      );

  // 处理点赞
  const handleLike = async (id: string) => {
    if (!currentUserId) {
      setIsLoginModalOpen(true);
      return;
    }

    // Keressük meg a posztot
    const post = posts.find(p => p.id === id);
    if (!post) return;

    // Ellenőrizzük, hogy a felhasználó már kedvelte-e a posztot
    const hasLiked = post.likedBy.includes(currentUserId);

    // Optimista UI frissítés - azonnal frissítjük a felhasználói felületet
    setPosts(prevPosts =>
      prevPosts.map(p => {
        if (p.id === id) {
          return {
            ...p,
            likes: hasLiked ? p.likes - 1 : p.likes + 1,
            likedBy: hasLiked 
              ? p.likedBy.filter(uid => uid !== currentUserId)
              : [...p.likedBy, currentUserId]
          };
        }
        return p;
      })
    );

    try {
      if (!hasLiked) {
        // Ha még nem kedvelte, akkor hozzáadjuk a like-ot
        const { error: insertError } = await supabase
          .from('likes')
          .insert({ post_id: id, user_id: currentUserId });
        if (insertError) throw insertError;
      } else {
        // Ha már kedvelte, akkor töröljük a like-ot
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', id)
          .eq('user_id', currentUserId);
        if (deleteError) throw deleteError;
      }
    } catch (error) {
      console.error('Error liking post:', (error as Error).message);
      
      // Hiba esetén visszaállítjuk az eredeti állapotot
      setPosts(prevPosts =>
        prevPosts.map(p => {
          if (p.id === id) {
            return {
              ...p,
              likes: hasLiked ? p.likes + 1 : p.likes - 1,
              likedBy: hasLiked 
                ? [...p.likedBy, currentUserId]
                : p.likedBy.filter(uid => uid !== currentUserId)
            };
          }
          return p;
        })
      );
    }
  };

  // 删除帖子
  const handleDeletePost = async (id: string) => {
    if (!currentUserId) {
      setIsLoginModalOpen(true);
      return;
    }
    if (!window.confirm('Biztosan törlöd ezt a bejegyzést?')) return;
    setDeleteError(null);
    setDeleteLoading(id);
    try {
      await supabase.from('comments').delete().eq('post_id', id);
      await supabase.from('likes').delete().eq('post_id', id);
      await supabase.from('saved_posts').delete().eq('post_id', id);
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)
        .eq('author_id', currentUserId);
      if (error) throw error;
      setPosts(posts.filter((p) => p.id !== id));
    } catch (error) {
      setDeleteError('Hiba történt a bejegyzés törlése során. Kérjük, próbáld újra!');
      console.error('Error deleting post:', (error as Error).message);
    } finally {
      setDeleteLoading(null);
    }
  };

  // 添加评论
  const handleComment = async (id: string) => {
    if (!currentUserId) {
      setIsLoginModalOpen(true);
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
      setCommentInputs({ ...commentInputs, [id]: '' });
    } catch (error) {
      setCommentError('Hiba történt a hozzászólás hozzáadása során. Kérjük, próbáld újra!');
      console.error('Error adding comment:', (error as Error).message);
    } finally {
      setCommentLoading(null);
    }
  };

  // 删除评论
  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!currentUserId) {
      setIsLoginModalOpen(true);
      return;
    }
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('author_id', currentUserId);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting comment:', (error as Error).message);
      setCommentError('Hiba történt a hozzászólás törlése során. Kérjük, próbáld újra!');
    }
  };

  // 保存/取消保存帖子
  const handleSavePost = async (postId: string, isSaved: boolean) => {
    if (!currentUserId) {
      setIsLoginModalOpen(true);
      return;
    }
    setSaveLoading(postId);
    try {
      if (isSaved) {
        const { error } = await supabase
          .from('saved_posts')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUserId);
        if (error) throw error;
        setPosts(posts.map((p) => (p.id === postId ? { ...p, isSaved: false } : p)));
      } else {
        const { error } = await supabase
          .from('saved_posts')
          .insert({ post_id: postId, user_id: currentUserId });
        if (error) throw error;
        setPosts(posts.map((p) => (p.id === postId ? { ...p, isSaved: true } : p)));
      }
    } catch (error) {
      console.error('Error saving post:', (error as Error).message);
      alert('Hiba történt a bejegyzés mentése során!');
    } finally {
      setSaveLoading(null);
    }
  };

  // 发布新帖子
  const handleAddPost = async () => {
    if (!currentUserId) {
      setIsLoginModalOpen(true);
      return;
    }
    if (!newPostContent || !newPostContent.trim()) {
      alert('Kérjük, írj tartalmat a bejegyzéshez!');
      return;
    }
    try {
      let mediaUrl: string | null = null;
      if (newPostMedia) {
        const originalFileName = newPostMedia.name;
        const fileExt = originalFileName.split('.').pop();
        const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));
        const uniqueFileName = `${baseName}-${currentUserId}-${new Date().getTime()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('post-media')
          .upload(uniqueFileName, newPostMedia);
        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
        const { data: publicUrlData } = supabase.storage
          .from('post-media')
          .getPublicUrl(uniqueFileName);
        if (!publicUrlData) throw new Error('Failed to get public URL');
        mediaUrl = publicUrlData.publicUrl;
      }
      const { data: newPost, error } = await supabase
        .from('posts')
        .insert({
          author_id: currentUserId,
          content: newPostContent,
          create_at: new Date().toISOString(),
          media_url: mediaUrl,
        })
        .select('*, author:profiles(id, first_name, last_name, avatar_url, user_type), media_url')
        .single();
      if (error) throw error;
      const newPostWithLikesAndFollows = {
        ...newPost,
        likes: 0,
        likedBy: [],
        isFollowed: false,
        isSaved: false,
        comments: [],
      };
      setPosts([newPostWithLikesAndFollows, ...posts]);
      setNewPostContent('');
      setNewPostMedia(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error adding post:', (error as Error).message);
      alert('Hiba történt a bejegyzés hozzáadása során!');
    }
  };

  // 切换评论区
  const toggleCommentSection = (postId: string) => {
    if (!currentUserId) {
      setIsLoginModalOpen(true);
      return;
    }
    setOpenCommentSections((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  // 处理关注
  const handleFollow = async (postId: string, authorId: string, isFollowed: boolean) => {
    if (!currentUserId) {
      setIsLoginModalOpen(true);
      return;
    }
    setFollowLoading(postId);
    try {
      if (isFollowed) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('followed_id', authorId);
        if (error) throw error;
        setPosts(posts.map((p) => (p.id === postId ? { ...p, isFollowed: false } : p)));
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: currentUserId, followed_id: authorId });
        if (error) throw error;
        setPosts(posts.map((p) => (p.id === postId ? { ...p, isFollowed: true } : p)));
      }
    } catch (error) {
      console.error('Error handling follow:', (error as Error).message);
      alert('Hiba történt a követés során!');
    } finally {
      setFollowLoading(null);
    }
  };

  // 处理分享
  const handleShare = (postId: string) => {
    const postUrl = `${window.location.origin}/personal-profile/${posts.find(p => p.id === postId)?.author_id}#${postId}`;
    navigator.clipboard.writeText(postUrl)
      .then(() => {
        setShareMessage({ postId, message: 'Link másolva a vágólapra!' });
        setTimeout(() => setShareMessage(null), 2000);
      })
      .catch((error) => {
        console.error('Error copying link:', error);
        setShareMessage({ postId, message: 'Hiba a link másolásakor!' });
        setTimeout(() => setShareMessage(null), 2000);
      });
  };

  // 打开媒体预览
  const openMediaModal = (url: string, isVideo: boolean) => {
    setMediaModal({ isOpen: true, url, isVideo });
  };

  // 关闭媒体预览
  const closeMediaModal = () => {
    setMediaModal({ isOpen: false, url: null, isVideo: false });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-10">
        {/* 新建帖子按钮 */}
        {currentUserId && (
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all"
              onClick={() => setIsModalOpen(true)}
            >
              Új Bejegyzés Létrehozása
            </motion.button>
          </motion.div>
        )}

        {/* 搜索和筛选 */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex-1 relative">
            <motion.div whileHover={{ scale: 1.1 }} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              <Search className="h-5 w-5" />
            </motion.div>
            <input
              type="text"
              placeholder="Keresés a bejegyzések között..."
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            <motion.button
              className={`px-6 py-3 text-lg font-medium rounded-lg transition-all ${
                activeTab === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setActiveTab('all')}
              whileHover={{ scale: 1.05 }}
            >
              Összes Poszt
            </motion.button>
            <motion.button
              className={`px-6 py-3 text-lg font-medium rounded-lg transition-all ${
                activeTab === 'trainer' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setActiveTab('trainer')}
              whileHover={{ scale: 1.05 }}
            >
              Csak Edzők
            </motion.button>
          </div>
        </motion.div>

        {/* 帖子列表 */}
        <div className="space-y-6">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post, index) => (
              <motion.div
                key={post.id}
                className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Link to={`/personal-profile/${post.author_id}`}>
                      <motion.img
                        src={post.author.avatar_url || 'https://via.placeholder.com/150'}
                        alt={`${post.author.first_name} ${post.author.last_name}`}
                        className="w-12 h-12 rounded-full object-cover shadow-sm"
                        whileHover={{ scale: 1.05 }}
                      />
                    </Link>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <h3 className="font-semibold text-gray-800">
                          {post.author.first_name} {post.author.last_name}
                        </h3>
                        {post.author.user_type === 'trainer' && (
                          <svg className="ml-1 h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                          </svg>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {post.author.user_type === 'trainer' ? 'Fitness Edző' : 'Közösségi Tag'} • {new Date(post.create_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {post.author_id === currentUserId && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        className="text-red-500 hover:text-red-600 transition-colors"
                        onClick={() => handleDeletePost(post.id)}
                        disabled={deleteLoading === post.id}
                        aria-label="Bejegyzés törlése"
                      >
                        <Trash2 className="h-5 w-5" />
                      </motion.button>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      className={`text-gray-600 hover:text-blue-500 transition-colors ${post.isSaved ? 'text-blue-500' : ''}`}
                      onClick={() => handleSavePost(post.id, post.isSaved)}
                      disabled={saveLoading === post.id}
                      aria-label={post.isSaved ? 'Mentés törlése' : 'Bejegyzés mentése'}
                    >
                      <BookmarkPlus className="h-5 w-5" />
                    </motion.button>
                  </div>
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
                        alt="Bejegyzés képe"
                        className="w-full h-64 object-cover"
                      />
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 opacity-0 hover:opacity-100 transition-opacity">
                      <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                ) : null}
                <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-6">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="flex items-center text-gray-600 hover:text-red-500 transition-colors"
                      onClick={() => handleLike(post.id)}
                      aria-label="Tetszik"
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
                      aria-label="Hozzászólások"
                    >
                      <MessageCircle className="h-6 w-6 mr-2" />
                      <span>{post.comments.length}</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="flex items-center text-gray-600 hover:text-blue-500 transition-colors"
                      onClick={() => handleShare(post.id)}
                      aria-label="Megosztás"
                    >
                      <Share2 className="h-6 w-6" />
                    </motion.button>
                  </div>
                  {post.author_id !== currentUserId && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        post.isFollowed
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:from-blue-600 hover:to-indigo-600'
                      }`}
                      onClick={() => handleFollow(post.id, post.author_id, post.isFollowed)}
                      disabled={followLoading === post.id}
                      aria-label={post.isFollowed ? 'Követés megszüntetése' : 'Követés'}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {followLoading === post.id ? 'Feldolgozás...' : post.isFollowed ? 'Követed' : 'Követés'}
                    </motion.button>
                  )}
                </div>
                {shareMessage && shareMessage.postId === post.id && (
                  <p className="text-blue-500 text-sm mt-2">{shareMessage.message}</p>
                )}
                <AnimatePresence>
                  {openCommentSections[post.id] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4 bg-gray-50 rounded-xl p-4"
                    >
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Hozzászólások</h4>
                      <div className="max-h-60 overflow-y-auto space-y-3">
                        {post.comments && post.comments.length > 0 ? (
                          post.comments
                            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                            .map((comment) => (
                              <motion.div
                                key={comment.id}
                                className="border-b border-gray-200 pb-3 last:border-b-0 flex justify-between items-start"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.2 }}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center">
                                    <span className="font-semibold text-gray-800">
                                      {comment.author?.first_name || 'Névtelen'} {comment.author?.last_name || ''}
                                    </span>
                                    {comment.created_at && (
                                      <span className="ml-2 text-xs text-gray-400">
                                        {new Date(comment.created_at).toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-gray-700 mt-1">{comment.content}</p>
                                </div>
                                {comment.author.id === currentUserId && (
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    className="text-red-500 hover:text-red-600 transition-colors ml-2"
                                    onClick={() => handleDeleteComment(post.id, comment.id)}
                                    aria-label="Hozzászólás törlése"
                                  >
                                    <Trash2 className="h-5 w-5" />
                                  </motion.button>
                                )}
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
                              className="flex-1 p-3 border border-gray-200 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Hagyj egy hozzászólást..."
                              value={commentInputs[post.id] || ''}
                              onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
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
                {deleteError && post.author_id === currentUserId && (
                  <p className="text-red-500 mt-2">{deleteError}</p>
                )}
              </motion.div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-8">Nincs megjeleníthető bejegyzés。</p>
          )}
        </div>

        {/* 新建帖子模态框 */}
        <Modal
          isOpen={isModalOpen && !!currentUserId}
          onRequestClose={() => {
            setNewPostContent('');
            setNewPostMedia(null);
            setIsModalOpen(false);
          }}
          className="flex items-center justify-center h-full"
          overlayClassName="fixed inset-0 bg-black bg-opacity-75 z-50"
        >
          <motion.div
            className="bg-white rounded-2xl p-6 w-full max-w-md"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Új Bejegyzés</h2>
            <textarea
              className="w-full p-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Oszd meg gondolataidat..."
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              rows={6}
            />
            <input
              type="file"
              accept="image/*,video/*"
              className="mt-4 text-gray-600"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setNewPostMedia(file);
              }}
            />
            {newPostMedia && (
              <p className="text-sm text-gray-500 mt-2">Kiválasztott fájl: {newPostMedia.name}</p>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                onClick={() => {
                  setNewPostContent('');
                  setNewPostMedia(null);
                  setIsModalOpen(false);
                }}
              >
                Mégse
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all"
                onClick={handleAddPost}
              >
                Közzététel
              </motion.button>
            </div>
          </motion.div>
        </Modal>

        {/* 登录提示模态框 */}
        <Modal
          isOpen={isLoginModalOpen}
          onRequestClose={() => setIsLoginModalOpen(false)}
          className="flex items-center justify-center h-full"
          overlayClassName="fixed inset-0 bg-black bg-opacity-75 z-50"
        >
          <motion.div
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Bejelentkezés szükséges</h2>
            <p className="text-gray-600 mb-4">Kérjük, jelentkezz be a funkció használatához!</p>
            <div className="flex justify-end">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all"
                onClick={() => setIsLoginModalOpen(false)}
              >
                Rendben
              </motion.button>
            </div>
          </motion.div>
        </Modal>

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
              aria-label="Bezárás"
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

export default Community;