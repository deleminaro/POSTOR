import { Track } from '../types';

export const searchTracks = async (query: string): Promise<Track[]> => {
  try {
    const response = await fetch(`/api/spotify/search?q=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Spotify not authenticated');
      }
      try {
        const errData = await response.json();
        throw new Error(errData.error || `Spotify search failed: ${response.status}`);
      } catch (e) {
        const errText = await response.text();
        console.error('Spotify Search API Error Response:', errText);
        throw new Error(`Spotify search failed: ${response.status}`);
      }
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Spotify Search API returned non-JSON response:', text);
      throw new Error('Spotify search failed: Invalid response format');
    }

    const data = await response.json();
    
    if (!data.tracks || !data.tracks.items) {
      return [];
    }
    
    return data.tracks.items.map((item: any) => ({
      id: item.id,
      title: item.name,
      artist: item.artists.map((a: any) => a.name).join(', '),
      coverUrl: item.album.images[0]?.url || 'https://picsum.photos/seed/spotify/400/400',
      duration: formatDuration(item.duration_ms),
      source: 'spotify'
    }));
  } catch (error) {
    console.error('Spotify Search Error:', error);
    throw error;
  }
};

export const getAuthUrl = async (): Promise<string | undefined> => {
  try {
    const response = await fetch('/api/auth/spotify/url');
    if (!response.ok) {
      const err = await response.json();
      console.error('Spotify Auth URL API Error:', err);
      return undefined;
    }
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Spotify Auth URL Fetch Error:', error);
    return undefined;
  }
};

export const checkAuthStatus = async (): Promise<boolean> => {
  try {
    const response = await fetch('/api/spotify/status');
    const data = await response.json();
    return data.authenticated;
  } catch (error) {
    console.error('Spotify Auth Status Error:', error);
    return false;
  }
};

const formatDuration = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}:${Number(seconds) < 10 ? '0' : ''}${seconds}`;
};
