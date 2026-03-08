import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import VideoAudioPlayer from '../components/VideoAudioPlayer';

const Favorites = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [activeAudioId, setActiveAudioId] = useState(null);
  const visibleVideoIds = useRef(new Set());

  const handleVisibilityChange = useCallback((id, isVisible) => {
    if (isVisible) visibleVideoIds.current.add(id);
    else visibleVideoIds.current.delete(id);
    setActiveAudioId(prev => {
      if (visibleVideoIds.current.has(prev)) return prev;
      return visibleVideoIds.current.size > 0 ? visibleVideoIds.current.values().next().value : null;
    });
  }, []);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchFavorites();
  }, [user, navigate]);

  const fetchFavorites = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/favorites`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setArticles(data || []);
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>我的收藏</h1>
      {articles.length === 0 ? (
        <p style={styles.empty}>暂无收藏文章</p>
      ) : (
        <div style={styles.grid}>
          {articles.map(article => {
            const isVideo = article.coverImage && /\.(mp4|webm)(\?.*)?$/i.test(article.coverImage);
            return (
              <div key={article.id} style={styles.card} onClick={() => navigate(`/article/${article.id}`)}>
                {isVideo ? (
                  <VideoAudioPlayer src={article.coverImage} audioSrc={article.coverAudio || undefined} id={article.id} activeAudioId={activeAudioId} onVisibilityChange={handleVisibilityChange} />
                ) : (
                  <img src={article.coverImage} alt={article.title} style={styles.image} />
                )}
                <div style={styles.content}>
                  <h3 style={styles.articleTitle}>{article.title}</h3>
                  <p style={styles.excerpt}>{article.excerpt}</p>
                  <div style={styles.meta}>
                    <span>{article.author}</span>
                    <span>❤️ {article.likes}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '2rem auto',
    padding: '0 1rem',
  },
  title: {
    fontSize: '2rem',
    marginBottom: '2rem',
  },
  empty: {
    textAlign: 'center',
    color: '#6b7280',
    padding: '4rem',
  },
  grid: {
    columnCount: 3,
    columnGap: '2rem',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    breakInside: 'avoid',
    marginBottom: '2rem',
    display: 'inline-block',
    width: '100%',
  },
  image: {
    width: '100%',
    height: 'auto',
    display: 'block',
  },
  video: {
    width: '100%',
    height: 'auto',
    display: 'block',
  },
  content: {
    padding: '1rem',
  },
  articleTitle: {
    fontSize: '1.25rem',
    marginBottom: '0.5rem',
  },
  excerpt: {
    color: '#6b7280',
    marginBottom: '1rem',
  },
  meta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.875rem',
    color: '#9ca3af',
  },
};

export default Favorites;
