import { useState, useEffect } from 'react';
import { MessageCircle, Heart, Share2, BookmarkPlus, UserPlus, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Navigation from '../components/Navigation';

// 定义类型（可选，但推荐添加以提高代码健壮性）
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
    author: { first_name: string; last_name: string };
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
  const [newPostContent, setNewPostContent] = useState<string>('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [openCommentSections, setOpenCommentSections] = useState<{ [key: string]: boolean }>({});
  const [commentLoading, setCommentLoading] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const [newPostMedia, setNewPostMedia] = useState<File | null>(null);

  // 获取当前用户 ID
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Fetched user:', user);
      if (user) {
        setCurrentUserId(user.id);
        console.log('Current user ID:', user.id);
      } else {
        console.log('No user logged in');
      }
    };
    fetchUser();
  }, []);

  // 获取帖子和关注状态
  useEffect(() => {
    const fetchPosts = async () => {
      if (!currentUserId) return;

      try {
        // 获取用户关注的 ID 列表
        const { data: follows, error: followsError } = await supabase
          .from('follows')
          .select('followed_id')
          .eq('follower_id', currentUserId);

        if (followsError) {
          console.error('Error fetching follows:', followsError);
          throw followsError;
        }

        const followedIds = follows.map((follow) => follow.followed_id);
        console.log('Followed IDs:', followedIds);

        // 获取关注的用户的最新帖子（最近 24 小时）
        const { data: followedRecentPosts, error: followedRecentError } = await supabase
          .from('posts')
          .select(`
            *,
            author:profiles(id, first_name, last_name, avatar_url, user_type),
            comments(*, author:profiles(id, first_name, last_name), created_at),
            media_url
          `)
          .in('author_id', followedIds)
          .gte('create_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // 最近 24 小时
          .order('create_at', { ascending: false })
          .limit(6); // 限制为 6 条

        if (followedRecentError) throw followedRecentError;

        // 获取关注的用户的热门历史帖子（24 小时前，按点赞排序）
        const { data: followedTopPosts, error: followedTopError } = await supabase
          .from('posts')
          .select(`
            *,
            author:profiles(id, first_name, last_name, avatar_url, user_type),
            comments(*, author:profiles(id, first_name, last_name), created_at),
            media_url
          `)
          .in('author_id', followedIds)
          .lt('create_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // 24 小时前
          .order('likes', { ascending: false }) // 按点赞数排序
          .limit(2); // 限制为 2 条

        if (followedTopError) throw followedTopError;

        // 获取其他用户的推荐帖子（按时间或点赞排序）
        const { data: otherPosts, error: otherError } = await supabase
          .from('posts')
          .select(`
            *,
            author:profiles(id, first_name, last_name, avatar_url, user_type),
            comments(*, author:profiles(id, first_name, last_name), created_at),
            media_url
          `)
          .not('author_id', 'in', `(${followedIds.join(',')})`) // 排除关注用户
          .order('create_at', { ascending: false }) // 按时间排序
          .limit(4); // 限制为 4 条

        if (otherError) throw otherError;

        // 合并所有帖子
        const allPosts = [...(followedRecentPosts || []), ...(followedTopPosts || []), ...(otherPosts || [])];

        // 获取点赞数据
        const { data: likes, error: likesError } = await supabase.from('likes').select('post_id, user_id');
        if (likesError) throw likesError;

        // 添加 likes 和 isFollowed 属性
        const postsWithLikesAndFollows = allPosts.map((post: any) => ({
          ...post,
          likes: likes.filter((like: any) => like.post_id === post.id).length,
          likedBy: likes.filter((like: any) => like.post_id === post.id).map((like: any) => like.user_id),
          isFollowed: followedIds.includes(post.author_id),
        }));

        // 自定义排序：关注用户的最新帖子优先
        const sortedPosts = postsWithLikesAndFollows.sort((a, b) => {
          const isAFollowed = followedIds.includes(a.author_id);
          const isBFollowed = followedIds.includes(b.author_id);

          if (isAFollowed && !isBFollowed) return -1; // 关注用户优先
          if (!isAFollowed && isBFollowed) return 1;
          return new Date(b.create_at).getTime() - new Date(a.create_at).getTime(); // 时间排序
        });

        setPosts(sortedPosts);
        console.log('Loaded posts:', sortedPosts);
      } catch (error) {
        console.error('Error fetching posts:', (error as Error).message);
      }
    };
    fetchPosts();
  }, [currentUserId]);

  const filteredPosts = activeTab === 'all'
    ? posts
    : posts.filter((post) => post.author.user_type === 'trainer');
  console.log('Filtered posts:', filteredPosts);

  // 点赞处理
  const handleLike = async (id: string) => {
    if (!currentUserId) {
      console.error('User not logged in');
      return;
    }

    try {
      const { data: existingLike, error: selectError } = await supabase
        .from('likes')
        .select('*')
        .eq('post_id', id)
        .eq('user_id', currentUserId);

      if (selectError) {
        console.error('Error checking existing like:', selectError.message);
        throw selectError;
      }

      if (existingLike.length === 0) {
        const { error: insertError } = await supabase
          .from('likes')
          .insert({ post_id: id, user_id: currentUserId });
        if (insertError) {
          console.error('Error inserting like:', insertError.message);
          throw insertError;
        }
        setPosts(posts.map((p: any) =>
          p.id === id
            ? { ...p, likes: p.likes + 1, likedBy: [...p.likedBy, currentUserId] }
            : p
        ));
      } else {
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', id)
          .eq('user_id', currentUserId);
        if (deleteError) {
          console.error('Error deleting like:', deleteError.message);
          throw deleteError;
        }
        setPosts(posts.map((p: any) =>
          p.id === id
            ? { ...p, likes: p.likes - 1, likedBy: p.likedBy.filter((uid: string) => uid !== currentUserId) }
            : p
        ));
      }
    } catch (error) {
      console.error('Error liking post:', error.message);
    }
  };

  // 删除帖子
  const handleDeletePost = async (id: string) => {
    if (!currentUserId) {
      setDeleteError('Jelentkezz be a törléshez!');
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

      if (error) {
        console.error('Error deleting post:', error.message);
        throw error;
      }

      setPosts(posts.filter((p: any) => p.id !== id));
    } catch (error) {
      setDeleteError('Hiba történt a bejegyzés törlése során. Kérjük, próbáld újra!');
      console.error('Error deleting post:', error.message);
    } finally {
      setDeleteLoading(null);
    }
  };

  // 添加评论
  const handleComment = async (id: string) => {
    const comment = commentInputs[id];
    if (!comment || !comment.trim() || !currentUserId) {
      setCommentError('Kérjük, írj egy hozzászólást, és jelentkezz be!');
      console.log('Cannot add comment:', { comment, currentUserId });
      return;
    }

    setCommentError(null);
    setCommentLoading(id);
    try {
      const { data: newComment, error } = await supabase
        .from('comments')
        .insert({ post_id: id, author_id: currentUserId, content: comment })
        .select('*, author:profiles(id, first_name, last_name)')
        .single();

      if (error) {
        console.error('Error adding comment:', error.message);
        throw error;
      }

      const { data: post, error: fetchError } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles(id, first_name, last_name, avatar_url, user_type),
          comments(*, author:profiles(id, first_name, last_name), created_at)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { data: likes } = await supabase.from('likes').select('user_id').eq('post_id', id);
      setPosts(posts.map((p) => (p.id === id ? { ...post, likes: likes.length, likedBy: likes.map((l) => l.user_id) } : p)));
      setCommentInputs({ ...commentInputs, [id]: '' });
    } catch (error) {
      setCommentError('Hiba történt a hozzászólás hozzáadása során. Kérjük, próbáld újra!');
      console.error('Error adding comment:', error.message);
    } finally {
      setCommentLoading(null);
    }
  };

  // 添加新帖子
  const handleAddPost = async () => {
    if (!newPostContent || !newPostContent.trim() || !currentUserId) {
      console.log('Cannot add post:', { newPostContent, currentUserId });
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

        const { data, error: uploadError } = await supabase.storage
          .from('post-media')
          .upload(uniqueFileName, newPostMedia);

        if (uploadError) {
          console.error('Error uploading media:', uploadError.message);
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from('post-media')
          .getPublicUrl(uniqueFileName);

        if (!publicUrlData) {
          throw new Error('Failed to get public URL');
        }

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

      if (error) {
        console.error('Error inserting post:', error.message);
        throw error;
      }

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

      console.log('New post with likes and follows:', newPostWithLikesAndFollows);
      setPosts([newPostWithLikesAndFollows, ...posts]);
      setNewPostContent('');
      setNewPostMedia(null);
    } catch (error) {
      console.error('Error adding post:', (error as Error).message);
    }
  };

  // 切换评论区显示/隐藏
  const toggleCommentSection = (postId: string) => {
    setOpenCommentSections((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  // 关注/取消关注处理
  const handleFollow = async (postId: string, authorId: string, isFollowed: boolean) => {
    if (!currentUserId) {
      console.error('User not logged in');
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

        if (error) {
          console.error('Error unfollowing user:', error.message);
          throw error;
        }

        setPosts(posts.map((p: any) =>
          p.id === postId ? { ...p, isFollowed: false } : p
        ));
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: currentUserId, followed_id: authorId });

        if (error) {
          console.error('Error following user:', error.message);
          throw error;
        }

        setPosts(posts.map((p: any) =>
          p.id === postId ? { ...p, isFollowed: true } : p
        ));
      }
    } catch (error) {
      console.error('Error handling follow:', error.message);
    } finally {
      setFollowLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Közösségi Fal</h1>
          <p className="mt-4 text-xl text-gray-600">Kapcsolódj, ossz meg és fejlődj fitness közösségünkkel</p>
        </div>

        {/* 新增帖子表单 */}
        <div className="mt-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900">Új Bejegyzés</h2>
            <textarea
              className="w-full p-2 border rounded mt-2"
              placeholder="Oszd meg gondolataidat..."
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              rows={3}
            />
            <input
              type="file"
              accept="image/*, video/*"
              className="mt-2"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setNewPostMedia(file);
              }}
            />
            <button
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              onClick={handleAddPost}
            >
              Bejegyzés közzététele
            </button>
          </div>
        </div>

        {/* 搜索和筛选 */}
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

        {/* 帖子列表 */}
        <div className="mt-8 space-y-6">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <div key={post.id} className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <img
                      src={post.author.avatar_url || 'https://via.placeholder.com/150'}
                      alt={`${post.author.first_name} ${post.author.last_name}`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
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
                      onError={() => console.log(`Failed to load video: ${post.media_url}`)}
                    />
                  ) : (
                    <img
                      src={post.media_url}
                      alt="Bejegyzés képe"
                      className="mt-4 rounded-lg w-full object-cover h-64"
                      onError={() => console.log(`Failed to load image: ${post.media_url}`)}
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
                    <button className="flex items-center text-gray-600 hover:text-primary transition-colors">
                      <Share2 className="h-5 w-5" />
                    </button>
                  </div>
                  {post.author.user_type === 'trainer' && post.author_id !== currentUserId && (
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

                {openCommentSections[post.id] && (
                  <div className="mt-4 bg-white rounded-xl shadow-sm p-4">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Hozzászólások</h4>
                    <div className="max-h-60 overflow-y-auto space-y-3">
                      {post.comments && post.comments.length > 0 ? (
                        post.comments
                          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .map((comment: any) => (
                            <div
                              key={comment.id}
                              className="border-b border-gray-200 pb-3 last:border-b-0"
                            >
                              <div className="flex items-start">
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
                              </div>
                            </div>
                          ))
                      ) : (
                        <p className="text-gray-500 text-center py-4">Még nincs hozzászólás, legyél az első!</p>
                      )}
                    </div>
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
      </div>
    </div>
  );
};

export default Community;