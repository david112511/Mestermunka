import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Navigation from '../components/Navigation';

// 定义类型
interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  user_type: string;
}

interface Post {
  id: string;
  author_id: string;
  content: string;
  create_at: string;
  media_url: string | null;
  likes: number;
}

const PersonalProfile = () => {
  const { userId } = useParams<{ userId: string }>(); // 获取 URL 中的 userId
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileAndPosts = async () => {
      if (!userId) return;

      try {
        // 获取用户信息
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url, user_type')
          .eq('id', userId)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError.message);
          throw profileError;
        }

        setProfile(profileData);
        console.log('Profile:', profileData);

        // 获取用户的所有帖子
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('id, author_id, content, create_at, media_url')
          .eq('author_id', userId)
          .order('create_at', { ascending: false });

        if (postsError) {
          console.error('Error fetching posts:', postsError.message);
          throw postsError;
        }

        // 获取点赞数据
        const { data: likesData, error: likesError } = await supabase
          .from('likes')
          .select('post_id');

        if (likesError) {
          console.error('Error fetching likes:', likesError.message);
          throw likesError;
        }

        // 为帖子添加点赞数
        const postsWithLikes = postsData.map((post) => ({
          ...post,
          likes: likesData.filter((like) => like.post_id === post.id).length,
        }));

        setPosts(postsWithLikes);
        console.log('User posts:', postsWithLikes);
      } catch (error) {
        console.error('Error in fetchProfileAndPosts:', (error as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileAndPosts();
  }, [userId]);

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
              <p className="text-gray-600">
                {profile.user_type === 'trainer' ? 'Fitness Edző' : 'Közösségi Tag'}
              </p>
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
                <div className="mt-4 text-sm text-gray-500">
                  <span>{new Date(post.create_at).toLocaleString()}</span> • <span>{post.likes} likes</span>
                </div>
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