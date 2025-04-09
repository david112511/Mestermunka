import { useState, useEffect } from 'react';
import { MessageCircle, Heart, Share2, BookmarkPlus, UserPlus, Search, Trash2 } from 'lucide-react'; // 添加 Trash2 图标
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

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
    author: { first_name: string; last_name: string; id: string }; // 添加 author.id
  }>;
  likes: number;
  likedBy: string[];
  isFollowed: boolean;
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState<string>('');
  const [newPostMedia, setNewPostMedia] = useState<File | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState<{ postId: string; message: string } | null>(null);

  // 监听认证状态变化
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Fetched user:', user);
      setCurrentUserId(user ? user.id : null);
    };
    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      if (event === 'SIGNED_IN') {
        setCurrentUserId(session?.user.id || null);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUserId(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 初始加载帖子
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

        const followedIds = currentUserId
          ? (await supabase.from('follows').select('followed_id').eq('follower_id', currentUserId)).data?.map(f => f.followed_id) || []
          : [];

        const postsWithLikes = postsData.map((post) => ({
          ...post,
          likes: likes.filter((like) => like.post_id === post.id).length,
          likedBy: likes.filter((like) => like.post_id === post.id).map((like) => like.user_id),
          isFollowed: followedIds.includes(post.author_id),
          comments: post.comments.map((comment) => ({
            ...comment,
            author: {
              id: comment.author.id, // 添加 author.id
              first_name: comment.author.first_name,
              last_name: comment.author.last_name,
            },
          })),
        }));

        setPosts(postsWithLikes);
        console.log('Loaded posts:', postsWithLikes);
      } catch (error) {
        console.error('Error fetching posts:', (error as Error).message);
      }
    };
    fetchPosts();
  }, [currentUserId]);

  // 实时监听点赞变化
  useEffect(() => {
    const likesSubscription = supabase
      .channel('likes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes' },
        (payload) => {
          console.log('Likes change detected:', payload);
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(likesSubscription);
    };
  }, []);

  // 实时监听评论变化（包括插入和删除）
  useEffect(() => {
    const commentsSubscription = supabase
      .channel('comments-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        async (payload) => {
          console.log('Comments change detected:', payload);
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
                post.id === newComment.post_id
                  ? { ...post, comments: [...post.comments, formattedComment] }
                  : post
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const oldComment = payload.old;
            setPosts((prevPosts) =>
              prevPosts.map((post) =>
                post.id === oldComment.post_id
                  ? { ...post, comments: post.comments.filter((c) => c.id !== oldComment.id) }
                  : post
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsSubscription);
    };
  }, []);

  const filteredPosts = activeTab === 'all'
    ? posts
    : posts.filter((post) => post.author.user_type === 'trainer');

  const handleLike = async (id: string) => {
    if (!currentUserId) {
      setIsLoginModalOpen(true);
      return;
    }

    try {
      const { data: existingLike, error: selectError } = await supabase
        .from('likes')
        .select('*')
        .eq('post_id', id)
        .eq('user_id', currentUserId);

      if (selectError) throw selectError;

      if (existingLike.length === 0) {
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
      console.error('Error liking post:', (error as Error).message);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!currentUserId) {
      setIsLoginModalOpen(true);
      return;
    }

    setDeleteError(null);
    setDeleteLoading(id);
    try {
      await supabase.from('comments').delete().eq('post_id', id);
      await supabase.from('likes').delete().eq('post_id', id);
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

      // 本地更新状态（实时监听会自动处理，但这里手动更新以确保即时反馈）
      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postId
            ? { ...post, comments: post.comments.filter((c) => c.id !== commentId) }
            : post
        )
      );
    } catch (error) {
      console.error('Error deleting comment:', (error as Error).message);
      setCommentError('Hiba történt a hozzászólás törlése során. Kérjük, próbáld újra!');
    }
  };

  const handleAddPost = async () => {
    if (!currentUserId) {
      setIsLoginModalOpen(true);
      return;
    }

    if (!newPostContent || !newPostContent.trim()) {
      console.log('Cannot add post: content is empty');
      return;
    }

    try {
      let mediaUrl: string | null = null;

      if (newPostMedia) {
        const originalFileName = newPostMedia.name;
        const fileExt = originalFileName.split('.').pop();
        const baseName = originalFileName.substring(0, originalFileName.lastIndexOf('.'));
        const uniqueFileName = `${baseName}-${currentUserId}-${new Date().getTime()}.${fileExt}`;
        console.log('Uploading media:', { fileName: uniqueFileName, fileSize: newPostMedia.size });

        const { error: uploadError } = await supabase.storage
          .from('post-media')
          .upload(uniqueFileName, newPostMedia);

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        const { data: publicUrlData } = supabase.storage
          .from('post-media')
          .getPublicUrl(uniqueFileName);

        if (!publicUrlData) throw new Error('Failed to get public URL');

        mediaUrl = publicUrlData.publicUrl;
        console.log('Media uploaded successfully:', mediaUrl);
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

      console.log('New post inserted:', newPost);

      const { data: likes } = await supabase.from('likes').select('post_id, user_id');
      const { data: follows } = await supabase
        .from('follows')
        .select('follower_id, followed_id')
        .eq('follower_id', currentUserId);

      const newPostWithLikesAndFollows = {
        ...newPost,
        likes: 0,
        likedBy: [],
        isFollowed: follows.some((follow: any) => follow.followed_id === newPost.author_id),
        comments: [],
      };

      setPosts([newPostWithLikesAndFollows, ...posts]);
      setNewPostContent('');
      setNewPostMedia(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error adding post:', (error as Error).message);
    }
  };

  const toggleCommentSection = (postId: string) => {
    if (!currentUserId) {
      setIsLoginModalOpen(true);
      return;
    }
    setOpenCommentSections((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  const handleFollow = async (postId: string, authorId: string, isFollowed: boolean) => {
    if (!currentUserId) {
      setIsLoginModalOpen(true);
      return;
    }

    console.log(`Handling follow: postId=${postId}, authorId=${authorId}, isFollowed=${isFollowed}`);
    setFollowLoading(postId);
    try {
      if (isFollowed) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('followed_id', authorId);

        if (error) throw error;
        console.log(`Unfollowed: ${currentUserId} -> ${authorId}`);
        setPosts(posts.map((p) => (p.id === postId ? { ...p, isFollowed: false } : p)));
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: currentUserId, followed_id: authorId });

        if (error) throw error;
        console.log(`Followed: ${currentUserId} -> ${authorId}`);
        setPosts(posts.map((p) => (p.id === postId ? { ...p, isFollowed: true } : p)));
      }
    } catch (error) {
      console.error('Error handling follow:', (error as Error).message);
    } finally {
      setFollowLoading(null);
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        {currentUserId && (
          <div className="mt-8">
            <button
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              onClick={() => setIsModalOpen(true)}
            >
              Új Bejegyzés Létrehozása
            </button>
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Keresés a bejegyzések között..."
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${activeTab === 'all' ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('all')}
            >
              Összes Poszt
            </button>
            <button
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${activeTab === 'trainer' ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              onClick={() => setActiveTab('trainer')}
            >
              Csak Edzők
            </button>
          </div>
        </div>

        <div className="mt-8 space-y-6">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <div key={post.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Link to={`/personal-profile/${post.author_id}`} className="block">
                      <img
                        src={post.author.avatar_url || 'https://via.placeholder.com/150'}
                        alt={`${post.author.first_name} ${post.author.last_name}`}
                        className="w-12 h-12 rounded-full object-cover hover:opacity-80 transition-opacity"
                      />
                    </Link>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <h3 className="font-semibold text-gray-900">
                          {post.author.first_name} {post.author.last_name}
                        </h3>
                        {post.author.user_type === 'trainer' && (
                          <svg className="ml-1 h-4 w-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                          </svg>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {post.author.user_type === 'trainer' ? 'Fitness Edző' : 'Közösségi Tag'} • {new Date(post.create_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {post.author_id === currentUserId && (
                      <button
                        className="text-red-500 hover:text-red-600 transition-colors"
                        onClick={() => handleDeletePost(post.id)}
                        disabled={deleteLoading === post.id}
                      >
                        {deleteLoading === post.id ? 'Törlés...' : 'Törlés'}
                      </button>
                    )}
                    <button className="text-gray-400 hover:text-gray-500">
                      <BookmarkPlus className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <p className="mt-4 text-gray-700">{post.content}</p>
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
                      alt="Bejegyzés képe"
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
                      <Heart className={`h-5 w-5 mr-1 ${post.likedBy.includes(currentUserId || '') ? 'text-red-500' : ''}`} />
                      <span>{post.likes}</span>
                    </button>
                    <button
                      className="flex items-center text-gray-600 hover:text-primary transition-colors"
                      onClick={() => toggleCommentSection(post.id)}
                    >
                      <MessageCircle className="h-5 w-5 mr-1" />
                      <span>{post.comments.length}</span>
                    </button>
                    <button
                      className="flex items-center text-gray-600 hover:text-primary transition-colors"
                      onClick={() => handleShare(post.id)}
                    >
                      <Share2 className="h-5 w-5" />
                    </button>
                  </div>
                  {post.author_id !== currentUserId && (
                    <button
                      className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                        post.isFollowed
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-primary/10 text-primary hover:bg-primary/20'
                      }`}
                      onClick={() => handleFollow(post.id, post.author_id, post.isFollowed)}
                      disabled={followLoading === post.id}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {followLoading === post.id
                        ? 'Feldolgozás...'
                        : post.isFollowed
                        ? 'Követed'
                        : 'Követés'}
                    </button>
                  )}
                </div>

                {shareMessage && shareMessage.postId === post.id && (
                  <p className="text-green-600 text-sm mt-2">{shareMessage.message}</p>
                )}

                {openCommentSections[post.id] && (
                  <div className="mt-4 bg-white rounded-xl shadow-sm p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Hozzászólások</h4>
                    <div className="max-h-60 overflow-y-auto space-y-3">
                      {post.comments && post.comments.length > 0 ? (
                        post.comments
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .map((comment) => (
                            <div
                              key={comment.id}
                              className="border-b border-gray-200 pb-3 last:border-b-0 flex justify-between items-start"
                            >
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <span className="font-semibold text-gray-800">
                                    {comment.author?.first_name || 'Névtelen'} {comment.author?.last_name || ''}:
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
                                <button
                                  className="text-red-500 hover:text-red-600 transition-colors ml-2"
                                  onClick={() => handleDeleteComment(post.id, comment.id)}
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              )}
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
                            onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
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

                {deleteError && post.author_id === currentUserId && (
                  <p className="text-red-500 mt-2">{deleteError}</p>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500">Nincs megjeleníthető bejegyzés。</p>
          )}
        </div>

        {isModalOpen && currentUserId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Új Bejegyzés</h2>
              <textarea
                className="w-full p-2 border rounded mb-4"
                placeholder="Oszd meg gondolataidat..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                rows={4}
              />
              <input
                type="file"
                accept="image/*,video/*"
                className="mb-4"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setNewPostMedia(file);
                }}
              />
              <div className="flex justify-end gap-2">
                <button
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                  onClick={() => {
                    setNewPostContent('');
                    setNewPostMedia(null);
                    setIsModalOpen(false);
                  }}
                >
                  Mégse
                </button>
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  onClick={handleAddPost}
                >
                  Közzététel
                </button>
              </div>
            </div>
          </div>
        )}

        {isLoginModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Bejelentkezés szükséges</h2>
              <p className="text-gray-700 mb-4">Kérjük, jelentkezz be a funkció használatához!</p>
              <div className="flex justify-end">
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  onClick={() => setIsLoginModalOpen(false)}
                >
                  Rendben
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Community;