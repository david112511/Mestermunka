import { useState, useEffect } from 'react';
import { MessageCircle, Heart, Share2, BookmarkPlus, UserPlus, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Navigation from '../components/Navigation';

const Community = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [commentInputs, setCommentInputs] = useState({});
  const [posts, setPosts] = useState([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  // 获取帖子
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { data: posts, error } = await supabase
          .from('posts')
          .select(`
            *,
            author:profiles(id, first_name, last_name, avatar_url, user_type),
            comments(*, author:profiles(id, first_name, last_name), created_at)
          `)
          .order('create_at', { ascending: false });

        if (error) {
          console.error('Error fetching posts details:', error);
          throw error;
        }

        const { data: likes, error: likesError } = await supabase.from('likes').select('post_id, user_id');
        if (likesError) throw likesError;

        const postsWithLikes = posts.map(post => ({
          ...post,
          likes: likes.filter(like => like.post_id === post.id).length,
          likedBy: likes.filter(like => like.post_id === post.id).map(like => like.user_id),
        }));

        setPosts(postsWithLikes);
        console.log('Loaded posts:', postsWithLikes);
      } catch (error) {
        console.error('Error fetching posts:', error.message);
      }
    };
    fetchPosts();
  }, []);

  const filteredPosts = activeTab === 'all'
    ? posts
    : posts.filter(post => post.author.user_type === 'trainer');
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
      console.log('Cannot add comment:', { comment, currentUserId });
      return;
    }

    try {
      const { data: newComment } = await supabase
        .from('comments')
        .insert({ post_id: id, author_id: currentUserId, content: comment })
        .select('*, author:profiles(id, first_name, last_name)')
        .single();

      const { data: post } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles(id, first_name, last_name, avatar_url, user_type),
          comments(*, author:profiles(id, first_name, last_name), created_at)
        `)
        .eq('id', id)
        .single();

      const { data: likes } = await supabase.from('likes').select('user_id').eq('post_id', id);
      setPosts(posts.map(p => p.id === id ? { ...post, likes: likes.length, likedBy: likes.map(l => l.user_id) } : p));
      setCommentInputs({ ...commentInputs, [id]: '' });
    } catch (error) {
      console.error('Error adding comment:', error.message);
    }
  };

  // 添加新帖子
  const handleAddPost = async () => {
    if (!newPostContent || !newPostContent.trim() || !currentUserId) {
      console.log('Cannot add post:', { newPostContent, currentUserId });
      return;
    }

    console.log('Attempting to add post with user ID:', currentUserId);
    try {
      const { data: newPost, error } = await supabase
        .from('posts')
        .insert({ author_id: currentUserId, content: newPostContent, create_at: new Date().toISOString() })
        .select('*, author:profiles(id, first_name, last_name, avatar_url, user_type)')
        .single();

      if (error) throw error;

      console.log('New post inserted:', newPost);
      const { data: posts, error: fetchError } = await supabase
        .from('posts')
        .select(`
          *,
          author:profiles(id, first_name, last_name, avatar_url, user_type),
          comments(*, author:profiles(id, first_name, last_name), created_at)
        `)
        .order('create_at', { ascending: false });

      if (fetchError) throw fetchError;

      const { data: likes } = await supabase.from('likes').select('post_id, user_id');
      const postsWithLikes = posts.map(post => ({
        ...post,
        likes: likes.filter(like => like.post_id === post.id).length,
        likedBy: likes.filter(like => like.post_id === post.id).map(like => like.user_id),
      }));

      setPosts(postsWithLikes);
      setNewPostContent('');
    } catch (error) {
      console.error('Error adding post:', error.message);
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
                {post.image && (
                  <img src={post.image} alt="Bejegyzés képe" className="mt-4 rounded-lg w-full object-cover h-64" />
                )}

                <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center space-x-4">
                    <button
                      className="flex items-center text-gray-600 hover:text-primary transition-colors"
                      onClick={() => handleLike(post.id)}
                    >
                      <Heart className={`h-5 w-5 mr-1 ${post.likedBy.includes(currentUserId || '') ? 'text-red-500' : ''}`} />
                      <span>{post.likes}</span>
                    </button>
                    <button className="flex items-center text-gray-600 hover:text-primary transition-colors">
                      <MessageCircle className="h-5 w-5 mr-1" />
                      <span>{post.comments.length}</span>
                    </button>
                    <button className="flex items-center text-gray-600 hover:text-primary transition-colors">
                      <Share2 className="h-5 w-5" />
                    </button>
                  </div>
                  {post.author.user_type === 'trainer' && (
                    <button className="inline-flex items-center px-4 py-2 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Követés
                    </button>
                  )}
                </div>

                <div className="mt-4">
                  {post.comments.map((comment) => (
                    <div key={comment.id} className="text-gray-700 bg-gray-100 p-2 rounded mt-1">
                      <span className="font-semibold">
                        {comment.author.first_name} {comment.author.last_name}: 
                      </span>
                      {comment.content}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    placeholder="Hagyj egy hozzászólást!"
                    value={commentInputs[post.id] || ''}
                    onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleComment(post.id);
                      }
                    }}
                  />
                  <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors" onClick={() => handleComment(post.id)}>
                    Hozzászólás
                  </button>
                </div>

                {deleteError && post.author_id === currentUserId && (
                  <p className="text-red-500 mt-2">{deleteError}</p>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500">Nincs megjeleníthető bejegyzés.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Community;