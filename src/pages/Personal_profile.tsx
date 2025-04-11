import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Navigation from '../components/Navigation';
import { Heart, Share2, MessageCircle, MessageSquare, UserPlus } from 'lucide-react';

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
}

const PersonalProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [totalLikes, setTotalLikes] = useState<number>(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [openCommentSections, setOpenCommentSections] = useState<{ [key: string]: boolean }>({});
  const [commentLoading, setCommentLoading] = useState<string | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false); // 关注状态
  const [followLoading, setFollowLoading] = useState(false); // 关注加载状态
  const [followSuccess, setFollowSuccess] = useState(false); // 关注成功动画状态

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

  useEffect(() => {
    const fetchProfileAndPosts = async () => {
      if (!userId) return;

      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, user_type')
          .eq('id', userId)
          .single();

        if (profileError) throw profileError;

        const { data: followersData, error: followersError } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('followed_id', userId);

        if (followersError) throw followersError;

        const followersCount = followersData.length;
        setProfile({ ...profileData, followersCount });

        // 检查当前用户是否已关注
        if (currentUserId) {
          const { data: followData, error: followError } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', currentUserId)
            .eq('followed_id', userId);

          if (followError) throw followError;
          setIsFollowing(followData.length > 0);
        }

        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select(`
            id, author_id, content, create_at, media_url,
            comments(*, author:profiles(id, first_name, last_name))
          `)
          .eq('author_id', userId)
          .order('create_at', { ascending: false });

        if (postsError) throw postsError;

        const { data: likesData, error: likesError } = await supabase
          .from('likes')
          .select('post_id, user_id');

        if (likesError) throw likesError;

        const postsWithLikes = postsData.map((post) => ({
          ...post,
          likes: likesData.filter((like) => like.post_id === post.id).length,
          likedBy: likesData.filter((like) => like.post_id === post.id).map((like) => like.user_id),
          comments: post.comments.map((comment: any) => ({
            id: comment.id,
            content: comment.content,
            created_at: comment.created_at,
            author: {
              first_name: comment.author.first_name,
              last_name: comment.author.last_name,
            },
          })),
        }));

        const totalLikesCount = postsWithLikes.reduce((sum, post) => sum + post.likes, 0);
        setPosts(postsWithLikes);
        setTotalLikes(totalLikesCount);
      } catch (error) {
        console.error('Error in fetchProfileAndPosts:', (error as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndPosts();
  }, [userId, currentUserId]);

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
          const newTotalLikes = posts.reduce((sum, post) => {
            if (eventType === 'INSERT' && newLike.post_id === post.id) return sum + 1;
            if (eventType === 'DELETE' && oldLike.post_id === post.id) return sum - 1;
            return sum + post.likes;
          }, 0);
          setTotalLikes(newTotalLikes);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(likesSubscription);
    };
  }, [posts]);

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
            console.error('Error fetching comment author:', authorError.message);
            return;
          }

          const formattedComment = {
            id: newComment.id,
            content: newComment.content,
            created_at: newComment.created_at,
            author: {
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsSubscription);
    };
  }, []);

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

      setCommentInputs({ ...commentInputs, [id]: '' });
    } catch (error) {
      setCommentError('Hiba történt a hozzászólás hozzáadása során. Kérjük, próbáld újra!');
      console.error('Error adding comment:', (error as Error).message);
    } finally {
      setCommentLoading(null);
    }
  };

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

  const handleShare = (postId: string) => {
    const postUrl = `${window.location.origin}/personal-profile/${userId}#${postId}`;
    navigator.clipboard.writeText(postUrl);
    alert('A bejegyzés linkje a vágólapra másolva!');
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
      if (isFollowing) {
        // 取消关注
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('followed_id', userId);

        if (error) throw error;
        setIsFollowing(false);
        setProfile((prev) => prev ? { ...prev, followersCount: prev.followersCount - 1 } : null);
      } else {
        // 添加关注
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: currentUserId, followed_id: userId });

        if (error) throw error;
        setFollowSuccess(true); // 显示成功动画
        setTimeout(() => {
          setFollowSuccess(false);
          setIsFollowing(true);
          setProfile((prev) => prev ? { ...prev, followersCount: prev.followersCount + 1 } : null);
        }, 1000); // 1秒后变为“已关注”
      }
    } catch (error) {
      console.error('Error handling follow:', (error as Error).message);
      alert('Hiba történt a követés során!');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>User not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        {/* 用户信息 */}
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
                <span>
                  <strong>Követők száma:</strong> {profile.followersCount}
                </span>
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

        {/* 用户帖子列表 */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Bejegyzések</h2>
          {posts.length > 0 ? (
            posts.map((post) => (
              <div key={post.id} className="bg-white rounded-xl shadow-sm p-6">
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
                      alt="Post media"
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
                    <button
                      className="flex items-center text-gray-600 hover:text-primary transition-colors"
                      onClick={() => handleShare(post.id)}
                    >
                      <Share2 className="h-5 w-5" />
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
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center">Ez a felhasználó még nem tett közzé bejegyzést。</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalProfile;