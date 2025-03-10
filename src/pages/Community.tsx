
import { useState } from 'react';
import { MessageCircle, Heart, Share2, BookmarkPlus, UserPlus, Search, Filter } from 'lucide-react';
import Navigation from '../components/Navigation';

const Community = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'coaches'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [commentInputs, setCommentInputs] = useState({});

  const [posts, setPosts] = useState([
    {
      id: 1,
      author: {
        name: "Kovács János",
        role: "Fitness Edző",
        image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
        verified: true,
      },
      content: "Most fejeztem be egy fantasztikus HIIT edzést a reggeli csoportommal! Íme egy gyors tipp: Mindig a helyes végrehajtásra koncentráljatok a sebesség helyett. A minőségi mozgás jobb eredményekhez vezet! 💪 #FitneszMotíváció #HIIT",
      image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600",
      likes: 128,
      comments: [],
      time: "2 órája",
      isCoach: true,
      userLiked:false,
      
    },
    {
      id: 2,
      author: {
        name: "Nagy Eszter",
        role: "Jóga Oktató",
        image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
        verified: true,
      },
      content: "Új reggeli jóga gyakorlatsor! Tökéletes kezdőknek, akik szeretnék javítani hajlékonyságukat és energiával telve kezdeni a napot. Gyere el a következő órámra, hogy többet tanulj! 🧘‍♀️ #JógaÉlet #ReggelijóRutin",
      image: "https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=600",
      likes: 245,
      comments: [],
      time: "5 órája",
      isCoach: true,
      userLiked: true,
      
    },
    {
      id: 3,
      author: {
        name: "Tóth Emma",
        role: "Közösségi Tag",
        image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
        verified: false,
      },
      content: "Ma új személyes rekordot döntöttem! Nem sikerült volna az edzőm @KovácsJános fantasztikus támogatása nélkül. Ne feledjétek, a fejlődés időbe telik, de megéri minden lépést! 🎯 #FitneszCélok #Fejlődés",
      likes: 89,
      comments: [],
      time: "1 napja",
      isCoach: false,
      userLiked: false,
      
    },
  ]);

  const filteredPosts = activeTab === 'coaches' 
    ? posts.filter(post => post.isCoach)
    : posts;

  const handleLike = (id) => {
    setPosts(posts.map(post =>
      post.id === id
      ?{...post, likes: post.userLiked ? post.likes - 1 : post.likes = 1, userLiked: !post.userLiked}
      :post
    ));
  };

  const handleComment = (id, comment) =>{
    if(!comment.trim()) return;
    setPosts(posts.map(post =>
      post.id === id
      ?{...post,comments:[...post.comments, comment]} 
      :post
    ));
  };

  {/*const handleShare = (content) => {
    navigator.clipboard.writeText(content); 
    alert("A bejegyzés tartalma másolva lett, beilleszthető és megosztható!"); 
  };*/}
    

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">Közösségi Fal</h1>
          <p className="mt-4 text-xl text-gray-600">Kapcsolódj, ossz meg és fejlődj fitness közösségünkkel</p>
        </div>

        {/* Keresés és Szűrés */}
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
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'all' 
                  ? 'bg-primary text-white' 
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('all')}
            >
              Összes Poszt
            </button>
            <button 
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                activeTab === 'coaches' 
                  ? 'bg-primary text-white' 
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab('coaches')}
            >
              Csak Edzők
            </button>
          </div>
        </div>

        {/* Bejegyzések */}
        <div className="mt-8 space-y-6">
          {filteredPosts.map((post) => (
            <div key={post.id} className="bg-white rounded-xl shadow-sm p-6">
              {/* Bejegyzés Fejléc */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <img
                    src={post.author.image}
                    alt={post.author.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="ml-4">
                    <div className="flex items-center">
                      <h3 className="font-semibold text-gray-900">{post.author.name}</h3>
                      {post.author.verified && (
                        <svg className="ml-1 h-4 w-4 text-primary" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                        </svg>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{post.author.role} • {post.time}</p>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-gray-500">
                  <BookmarkPlus className="h-5 w-5" />
                </button>
              </div>

              {/* Bejegyzés Tartalma */}
              <p className="mt-4 text-gray-700">{post.content}</p>
              {post.image && (
                <img
                  src={post.image}
                  alt="Bejegyzés képe"
                  className="mt-4 rounded-lg w-full object-cover h-64"
                />
              )}

              {/* Bejegyzés Műveletek */}
              <div className="mt-4 flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-4">
                  <button className="flex items-center text-gray-600 hover:text-primary transition-colors" onClick={() => handleLike(post.id)}>
                    <Heart className={`h-5 w-5 mr-1 ${post.userLiked ? "text-red-500" : ""}`} />
                    <span>{post.likes}</span>
                  </button>
                  <button className="flex items-center text-gray-600 hover:text-primary transition-colors">
                    <MessageCircle className="h-5 w-5 mr-1" />
                    <span>{post.comments}</span>
                  </button>
                  <button className="flex items-center text-gray-600 hover:text-primary transition-colors"  >{/*onClick={() => handleShare(post.content)}*/}
                    <Share2 className="h-5 w-5" />
                  </button>

                  <div className="mt-2">
                  {post.comments.map((comment, index) => (
                  <p key={index} className="text-gray-700 bg-gray-100 p-2 rounded mt-1">
                  {comment}
                  </p>
                  ))}
                  </div>

                  <div className='mt-4'>
                    <input type="text" className='w-full p-2 border roundend' placeholder='Hagyj egy hozzászólást!' value={commentInputs[post.id || '']} onChange={(e) => setCommentInputs({...commentInputs, [post.id]: e.target.value})}
                    onKeyDown={(e) =>{
                      if(e.key==="Enter") {
                        e.preventDefault();
                        if(commentInputs[post.id].trim()){
                          handleComment(post.id, commentInputs[post.id]);
                      setCommentInputs({ ...commentInputs, [post.id]: '' });
                        }
                      }
                    }}/>
                  </div>
                </div>
                {post.isCoach && (
                  <button className="inline-flex items-center px-4 py-2 rounded-lg bg-primary/10 text-primary font-medium hover:bg-primary/20 transition-colors">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Követés
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Community;
