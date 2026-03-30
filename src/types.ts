import { Home, Search, PlayCircle, Library, SkipBack, SkipForward, Play, Pause, Shuffle, Repeat, Heart, Volume2, MoreVertical, ChevronDown } from 'lucide-react';

export type Screen = 'home' | 'search' | 'player' | 'library' | 'playlist' | 'queue';

export interface Track {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  duration: string;
  category?: string;
  source?: 'soundcloud' | 'youtube';
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  coverUrl: string;
  customCoverUrl?: string;
  tracks: Track[];
  createdAt: number;
}

export const RECENTLY_PLAYED: Track[] = [
  {
    id: '1',
    title: 'Neon Horizon',
    artist: 'Synthwave Collective',
    coverUrl: 'https://picsum.photos/seed/neon/400/400',
    duration: '3:45',
  },
  {
    id: '2',
    title: 'Midnight Jazz',
    artist: 'The Velvet Quartet',
    coverUrl: 'https://picsum.photos/seed/jazz/400/400',
    duration: '5:12',
  },
  {
    id: '3',
    title: 'Live at Tokyo',
    artist: 'Electric Orchards',
    coverUrl: 'https://picsum.photos/seed/concert/400/400',
    duration: '4:20',
  },
  {
    id: '4',
    title: 'Analog Soul',
    artist: 'Dust & Diamonds',
    coverUrl: 'https://picsum.photos/seed/vinyl/400/400',
    duration: '3:58',
  },
  {
    id: '5',
    title: 'Prism Shift',
    artist: 'Optical Beats',
    coverUrl: 'https://picsum.photos/seed/prism/400/400',
    duration: '4:05',
  },
];

export const PLAYLISTS: Playlist[] = [];

export const ARTISTS = [
  { id: 'a1', name: 'Solaris Flux', genre: 'Electronic / Ambient', monthly: '1.2M', avatar: 'https://picsum.photos/seed/artist1/200/200', verified: true },
  { id: 'a2', name: 'The Neon Heist', genre: 'Synthwave / Retro', monthly: '840K', avatar: 'https://picsum.photos/seed/artist2/200/200', verified: false },
  { id: 'a3', name: 'Aetheria', genre: 'Atmospheric / Vocal', monthly: '2.4M', avatar: 'https://picsum.photos/seed/artist3/200/200', verified: true },
];
