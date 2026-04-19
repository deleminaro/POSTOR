
const CACHE_PREFIX = 'lyrics_cache_';

function cleanTitle(title: string): string {
  return title
    .replace(/\(prod\..*?\)/gi, '')
    .replace(/\[.*?\]/gi, '')
    .replace(/\(.*?feat\..*?\)/gi, '')
    .replace(/\(.*?ft\..*?\)/gi, '')
    .replace(/\(.*?remix.*?\)/gi, '')
    .replace(/\(.*?slowed.*?\)/gi, '')
    .replace(/\(.*?reverb.*?\)/gi, '')
    .replace(/\(.*?edit.*?\)/gi, '')
    .replace(/\(.*?lyrics.*?\)/gi, '')
    .replace(/\(.*?official.*?\)/gi, '')
    .replace(/\(.*?video.*?\)/gi, '')
    .replace(/\(.*?audio.*?\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface LyricsData {
  lyrics: string;
  synced: boolean;
}

export async function getLyrics(title: string, artist: string): Promise<LyricsData> {
  const cleanedTitle = cleanTitle(title);
  const cacheKey = `${CACHE_PREFIX}${cleanedTitle}_${artist}`.toLowerCase().replace(/\s+/g, '_');
  
  // Check cache
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object' && 'lyrics' in parsed) {
        console.log('[Lyrics] Cache hit for:', cleanedTitle);
        return parsed;
      }
    } catch (e) {
      // If not JSON, it's old cache, just return as plain
      return { lyrics: cached, synced: false };
    }
  }

  try {
    const response = await fetch(`/api/lyrics?title=${encodeURIComponent(cleanedTitle)}&artist=${encodeURIComponent(artist)}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch lyrics');
    }
    const data = await response.json();
    const lyrics = data.lyrics || "Lyrics not found.";
    const synced = !!data.synced;
    
    const result = { lyrics, synced };
    
    // Cache the result
    if (lyrics && lyrics !== "Lyrics not found.") {
      localStorage.setItem(cacheKey, JSON.stringify(result));
    }
    
    return result;
  } catch (error: any) {
    console.error("Error fetching lyrics:", error);
    let message = "Lyrics unavailable for this track.";
    if (error.message && (error.message.includes('API key') || error.message.includes('unavailable'))) {
      message = error.message;
    }
    return { lyrics: message, synced: false };
  }
}
