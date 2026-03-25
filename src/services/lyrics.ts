
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

export async function getLyrics(title: string, artist: string): Promise<string> {
  const cleanedTitle = cleanTitle(title);
  const cacheKey = `${CACHE_PREFIX}${cleanedTitle}_${artist}`.toLowerCase().replace(/\s+/g, '_');
  
  // Check cache
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    console.log('[Lyrics] Cache hit for:', cleanedTitle);
    return cached;
  }

  try {
    const response = await fetch(`/api/lyrics?title=${encodeURIComponent(cleanedTitle)}&artist=${encodeURIComponent(artist)}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch lyrics');
    }
    const data = await response.json();
    const lyrics = data.lyrics || "Lyrics not found.";
    
    // Cache the result
    if (lyrics && lyrics !== "Lyrics not found.") {
      localStorage.setItem(cacheKey, lyrics);
    }
    
    return lyrics;
  } catch (error: any) {
    console.error("Error fetching lyrics:", error);
    if (error.message && (error.message.includes('API key') || error.message.includes('unavailable'))) {
      return error.message;
    }
    return "Lyrics unavailable for this track.";
  }
}
