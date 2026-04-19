/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Home as HomeIcon, 
  Search as SearchIcon, 
  PlayCircle, 
  Library as LibraryIcon, 
  SkipBack, 
  SkipForward, 
  Play, 
  Pause, 
  Shuffle, 
  Repeat, 
  Heart, 
  Volume2, 
  Volume1,
  VolumeX,
  MoreVertical, 
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Menu,
  History,
  ArrowUpLeft,
  CheckCircle2,
  Mic2,
  Activity,
  SlidersHorizontal,
  Globe,
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  ListPlus,
  X,
  Gauge,
  ListMusic,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactPlayer from 'react-player';
import Hls from 'hls.js';
import { Screen, Track, Playlist, RECENTLY_PLAYED, PLAYLISTS, ARTISTS } from './types';
import * as soundcloud from './services/soundcloud';
import * as youtube from './services/youtube';
import { getLyrics, LyricsData } from './services/lyrics';
import { Equalizer } from './components/Equalizer';

// --- Components ---

const BottomNav = ({ 
  activeScreen, 
  setScreen,
  isVisible,
  setIsVisible
}: { 
  activeScreen: Screen, 
  setScreen: (s: Screen) => void,
  isVisible: boolean,
  setIsVisible: (v: boolean) => void
}) => {
  const navItems: { id: Screen, icon: any, label: string }[] = [
    { id: 'home', icon: HomeIcon, label: 'Home' },
    { id: 'search', icon: SearchIcon, label: 'Search' },
    { id: 'player', icon: PlayCircle, label: 'Player' },
    { id: 'library', icon: LibraryIcon, label: 'Library' },
  ];

  return (
    <>
      {/* Arrow Up Button when hidden */}
      <AnimatePresence>
        {!isVisible && (
          <motion.button
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            onClick={() => setIsVisible(true)}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] w-12 h-12 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center md:hidden"
          >
            <ChevronUp size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      <nav className={`
        fixed bottom-6 left-1/2 -translate-x-1/2 z-50 
        flex items-center justify-around
        bg-background/80 backdrop-blur-3xl border border-white/10
        shadow-[0px_20px_40px_rgba(0,0,0,0.4)]
        transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
        w-[92%] h-20 rounded-3xl px-4
        md:w-[450px] md:h-20 md:rounded-[32px] md:px-8
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-[150%] opacity-0 pointer-events-none md:translate-y-0 md:opacity-100 md:pointer-events-auto'}
      `}>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setScreen(item.id);
            }}
            className={`
              relative flex flex-col items-center justify-center p-2 transition-all duration-300
              ${activeScreen === item.id ? 'text-primary scale-110' : 'text-on-surface/40 hover:text-on-surface'}
              ${item.id === 'player' ? 'hidden md:flex' : 'flex'}
            `}
          >
            <item.icon size={24} strokeWidth={activeScreen === item.id ? 2.5 : 2} />
            <span className={`text-[9px] font-black uppercase tracking-widest mt-1 transition-opacity duration-300 ${activeScreen === item.id ? 'opacity-100' : 'opacity-0'}`}>
              {item.label}
            </span>
            {activeScreen === item.id && (
              <motion.div 
                layoutId="nav-active"
                className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]"
              />
            )}
          </button>
        ))}
      </nav>
    </>
  );
};

// Custom wrapper to filter out ReactPlayer-specific props that cause React 19 warnings
const PlayerWrapper = React.forwardRef((props: any, ref: any) => {
  const { 
    children, className, style, width, height,
    url, playing, loop, controls, volume, muted, playbackRate,
    progressInterval, playsinline, pip, stopOnUnmount, light, playIcon,
    previewTabIndex, oembedConfig, wrapper, config,
    onReady, onStart, onPlay, onProgress, onDuration, onPause,
    onBuffer, onBufferEnd, onSeek, onEnded, onError, onClickPreview,
    onEnablePIP, onDisablePIP,
    ...rest 
  } = props;

  // Aggressively filter out any remaining on* props that are not standard DOM events
  const cleanRest = Object.keys(rest).reduce((acc: any, key) => {
    const isProblematicHandler = key.startsWith('on') && ![
      'onClick', 'onMouseDown', 'onMouseUp', 'onMouseEnter', 'onMouseLeave', 
      'onMouseMove', 'onKeyDown', 'onKeyUp', 'onKeyPress', 'onScroll', 
      'onTouchStart', 'onTouchMove', 'onTouchEnd', 'onFocus', 'onBlur'
    ].includes(key);

    if (!isProblematicHandler) {
      acc[key] = rest[key];
    }
    return acc;
  }, {});

  return (
    <div ref={ref} className={`rounded-[40px] overflow-hidden ${className || ''}`} style={{ ...style, width, height }} {...cleanRest}>
      {children}
    </div>
  );
});

const MiniPlayer = ({ 
  track, 
  isPlaying, 
  setIsPlaying, 
  onNext, 
  setScreen,
  currentTime,
  duration
}: { 
  track: Track, 
  isPlaying: boolean, 
  setIsPlaying: (p: boolean) => void, 
  onNext: () => void,
  setScreen: (s: Screen) => void,
  currentTime: number,
  duration: number
}) => {
  if (!track) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[92%] max-w-2xl h-16 bg-background/80 backdrop-blur-3xl border border-white/10 flex items-center px-4 z-40 shadow-2xl cursor-pointer overflow-hidden rounded-2xl group"
      onClick={() => setScreen('player')}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg">
          <img 
            src={track.coverUrl} 
            alt={track.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex flex-col min-w-0">
          <h4 className="text-[10px] sm:text-xs font-black text-on-surface truncate uppercase tracking-tight">{track.title}</h4>
          <p className="text-[8px] sm:text-[10px] text-primary font-bold truncate uppercase tracking-widest">{track.artist}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsPlaying(!isPlaying);
          }}
          className="w-10 h-10 flex items-center justify-center bg-primary text-on-primary rounded-full shadow-lg hover:scale-105 transition-all"
        >
          {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          className="w-10 h-10 flex items-center justify-center text-on-surface/40 hover:text-primary transition-colors"
        >
          <SkipForward size={18} fill="currentColor" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 h-0.5 bg-white/5 w-full">
        <div 
          className="h-full bg-primary transition-all duration-300 shadow-[0_0_8px_rgba(var(--primary),0.5)]" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </motion.div>
  );
};

const Logo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path 
      d="M35 20V75C35 85 25 90 25 90M35 20H65C80 20 80 55 65 55H35" 
      stroke="currentColor" 
      strokeWidth="10" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

const Header = () => (
  <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-3xl border-b border-white/5">
    <div className="flex justify-between items-center px-6 h-16 max-w-[1600px] mx-auto">
      <div className="flex items-center gap-4">
        <Logo className="w-8 h-8 text-primary" />
        <h1 className="font-black tracking-tighter uppercase text-xl text-on-surface">POSTOR.</h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]"></div>
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface/60">Live</span>
        </div>
      </div>
    </div>
  </header>
);

// --- Hooks ---
export function useLongPress(callback: (e: any, track: Track, context?: any) => void, ms: number = 500) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback((e: React.TouchEvent, track: Track, context?: any) => {
    const clientX = e.touches[0].clientX;
    const clientY = e.touches[0].clientY;
    
    timerRef.current = setTimeout(() => {
      callback({ clientX, clientY, preventDefault: () => {} }, track, context);
      timerRef.current = null;
    }, ms);
  }, [callback, ms]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return useCallback((track: Track, context?: any) => ({
    onTouchStart: (e: React.TouchEvent) => start(e, track, context),
    onTouchEnd: clear,
    onTouchMove: clear,
    onTouchCancel: clear,
  }), [start, clear]);
}

// --- Screens ---

const HomeScreen: React.FC<{ 
  onPlay: (t: Track) => void; 
  recentlyPlayed: Track[];
  likedTracks: Track[];
  onLike: (t: Track) => void;
  onAddToPlaylist: (t: Track) => void;
  onAddToQueue: (t: Track) => void;
  onContextMenu: (e: any, track: Track, context?: { type: 'playlist' | 'favorites', id?: string }) => void;
}> = ({ onPlay, recentlyPlayed, likedTracks, onLike, onAddToPlaylist, onAddToQueue, onContextMenu }) => {
  const getLongPressProps = useLongPress(onContextMenu);

  return (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="space-y-24 pb-32"
  >
    {/* Hero Section */}
    <section className="relative h-[400px] md:h-[500px] w-full rounded-[40px] overflow-hidden group glass-panel">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-50 group-hover:opacity-70 transition-opacity duration-700"></div>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 z-10">
        <span className="font-black text-primary tracking-[0.4em] uppercase text-[10px] mb-6">Featured Release / 2026</span>
        <h2 className="text-5xl md:text-[8vw] font-black tracking-tighter text-on-surface leading-[0.85] uppercase mb-10">
          Vivid<br/>Dreams.
        </h2>
        <div className="flex flex-col md:flex-row gap-4">
          {recentlyPlayed.length > 0 && (
            <button 
              onClick={() => onPlay(recentlyPlayed[0])}
              className="px-10 py-4 bg-primary text-on-primary rounded-full font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-lg"
            >
              Play Recent
            </button>
          )}
          <button className="px-10 py-4 bg-white/5 text-on-surface border border-white/10 rounded-full font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all">
            View Archive
          </button>
        </div>
      </div>
    </section>

    {/* Recently Played */}
    {recentlyPlayed.length > 0 && (
      <section className="space-y-10">
        <div className="flex justify-between items-end border-b border-white/5 pb-6">
          <div className="space-y-1">
            <h3 className="text-2xl md:text-3xl font-black text-on-surface uppercase tracking-tighter">Recently Played</h3>
            <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Your latest sessions</p>
          </div>
          <button className="text-on-surface/40 font-black text-[10px] tracking-widest hover:text-primary transition-colors uppercase">View All [{recentlyPlayed.length}]</button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {recentlyPlayed.slice(0, 5).map((track) => (
            <motion.div 
              key={`${track.id}-${track.source}`} 
              whileHover={{ y: -8 }}
              className="group cursor-pointer space-y-4" 
              onClick={() => onPlay(track)}
              onContextMenu={(e) => onContextMenu(e, track)}
              {...getLongPressProps(track)}
            >
              <div className="relative aspect-square rounded-3xl overflow-hidden album-shadow bg-black">
                <img 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  src={track.coverUrl} 
                  alt={track.title}
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                  <div className="w-12 h-12 bg-on-primary text-primary rounded-full flex items-center justify-center shadow-xl">
                    <Play size={24} fill="currentColor" />
                  </div>
                </div>
              </div>
              <div className="space-y-1 px-2">
                <h4 className="font-black text-xs truncate uppercase tracking-tight text-on-surface">{track.title}</h4>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest truncate">{track.artist}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    )}
  </motion.div>
  );
};

const SearchScreen: React.FC<{
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedSource: string;
  setSelectedSource: (s: string) => void;
  recentSearches: string[];
  onSearch: (e?: React.FormEvent, queryOverride?: string) => void;
  onClearRecent: () => void;
  results: Track[];
  isLoading: boolean;
  onPlay: (t: Track) => void;
  likedTracks: Track[];
  onLike: (t: Track) => void;
  onAddToPlaylist: (t: Track) => void;
  onAddToQueue: (t: Track) => void;
  showToast: (msg: string) => void;
  onContextMenu: (e: any, track: Track, context?: { type: 'playlist' | 'favorites', id?: string }) => void;
}> = ({ 
  searchQuery, 
  setSearchQuery, 
  selectedSource, 
  setSelectedSource, 
  recentSearches, 
  onSearch, 
  onClearRecent, 
  results, 
  isLoading, 
  onPlay,
  likedTracks,
  onLike,
  onAddToPlaylist,
  onAddToQueue,
  showToast,
  onContextMenu
}) => {
  const getLongPressProps = useLongPress(onContextMenu);
  const sources = ['All', 'SoundCloud', 'YouTube'];

  const handleConnectSoundCloud = async () => {
    showToast('SoundCloud connection is not available.');
  };

  const copyRedirectUri = () => {
    const baseUrl = window.location.origin;
    const uri = `${baseUrl}/api/auth/soundcloud/callback`;
    navigator.clipboard.writeText(uri);
    showToast('Redirect URI copied to clipboard!');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-12 pb-32"
    >
      <div className="space-y-8">
        <div className="space-y-6">
          <form onSubmit={onSearch} className="relative group flex items-center">
            <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-on-surface/20 group-focus-within:text-primary transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search for tracks, artists..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-20 bg-white/5 border border-white/10 rounded-[40px] pl-16 pr-16 text-on-surface font-bold text-lg placeholder:text-on-surface/20 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all shadow-2xl"
            />
            <button type="submit" className="absolute right-6 p-3 bg-primary text-on-primary rounded-2xl hover:scale-105 transition-transform shadow-lg">
              <SearchIcon size={20} />
            </button>
          </form>
          
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface/40 mr-2">Source:</p>
            {sources.map((source) => (
              <button
                key={source}
                onClick={() => setSelectedSource(source)}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${selectedSource === source ? 'bg-primary text-on-primary border-primary shadow-lg scale-105' : 'bg-white/5 text-on-surface/40 border-white/10 hover:bg-white/10 hover:text-on-surface'}`}
              >
                {source}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <History size={12} className="text-primary" />
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface/40">Recent Searches</h4>
              </div>
              <button 
                onClick={onClearRecent}
                className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline transition-all"
              >
                Clear History
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((query, idx) => (
                <button
                  key={idx}
                  onClick={() => onSearch(undefined, query)}
                  className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-on-surface/60 hover:bg-white/10 hover:text-on-surface hover:border-white/20 transition-all flex items-center gap-2 group"
                >
                  <ArrowUpLeft size={10} className="text-primary/40 group-hover:text-primary transition-colors" />
                  {query}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
            />
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-on-surface/40 animate-pulse">Scanning the airwaves...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((track) => (
              <div 
                key={`${track.id}-${track.source}`}
                className="group flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer"
                onClick={() => onPlay(track)}
                onContextMenu={(e) => onContextMenu(e, track)}
                {...getLongPressProps(track)}
              >
                <div className="relative w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg">
                  <img 
                    src={track.coverUrl} 
                    alt={track.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play size={20} fill="currentColor" className="text-on-primary" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-sm uppercase tracking-tight text-on-surface truncate">{track.title}</h4>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest truncate">{track.artist}</p>
                </div>
                <div className="flex items-center gap-2 pr-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onAddToQueue(track); }}
                    className="p-2 text-on-surface/20 hover:text-primary transition-colors"
                  >
                    <Activity size={18} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onLike(track); }}
                    className={`p-2 transition-colors ${likedTracks.some(t => t.id === track.id) ? 'text-primary' : 'text-on-surface/20 hover:text-on-surface'}`}
                  >
                    <Heart size={18} fill={likedTracks.some(t => t.id === track.id) ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : searchQuery && !isLoading && (
          <div className="py-32 text-center space-y-4">
            <div className="text-4xl opacity-20">∅</div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface/40">No results found for "{searchQuery}"</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const PlayerScreen: React.FC<{ 
  track: Track;
  isPlaying: boolean;
  setIsPlaying: (p: boolean) => void;
  isShuffle: boolean;
  setIsShuffle: (s: boolean) => void;
  isRepeat: boolean;
  setIsRepeat: (r: boolean) => void;
  isLiked: boolean;
  onLike: () => void;
  onAddToPlaylist: () => void;
  onNext: () => void;
  onPrev: () => void;
  currentTime: number;
  duration: number;
  isBuffering: boolean;
  onSeek: (time: number) => void;
  setDuration: (d: number) => void;
  volume: number;
  setVolume: (v: number) => void;
  onOpenEqualizer: () => void;
  onOpenQueue: () => void;
  onAddToQueue: () => void;
  onBack: () => void;
  queue: Track[];
  currentContext: Track[];
  trendingTracks: Track[];
  playbackRate: number;
  setPlaybackRate: (r: number) => void;
  isVisible: boolean;
}> = ({ track, isPlaying, setIsPlaying, isShuffle, setIsShuffle, isRepeat, setIsRepeat, isLiked, onLike, onAddToPlaylist, onAddToQueue, onNext, onPrev, currentTime, duration, isBuffering, onSeek, setDuration, volume, setVolume, onOpenEqualizer, onOpenQueue, onBack, queue, currentContext, trendingTracks, playbackRate, setPlaybackRate, isVisible }) => {
  const playerRef = useRef<any>(null);

  const handleManualSeek = (time: number) => {
    if (track.source === 'youtube' && playerRef.current) {
      playerRef.current.seekTo(time, 'seconds');
    }
    onSeek(time);
  };
  const [isSeeking, setIsSeeking] = useState(false);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);

  const handleShare = async () => {
    const shareUrl = window.location.origin.includes('localhost') || window.location.origin.includes('asia-east1.run.app') 
      ? 'https://postor.onrender.com' 
      : window.location.href;

    const shareData = {
      title: 'Check out this track on Vivid Dreams Music!',
      text: `Listening to ${track.title} by ${track.artist}`,
      url: shareUrl,
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2000);
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };
  const [isFollowLyrics, setIsFollowLyrics] = useState(true);
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [isLyricsLoading, setIsLyricsLoading] = useState(false);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const lastUserScrollRef = useRef<number>(0);

  const handleLyricsScroll = () => {
    lastUserScrollRef.current = Date.now();
  };

  const Player = ReactPlayer as any;

  const nextTrack = useMemo(() => {
    if (queue.length > 0) return queue[0];
    const tracks = currentContext.length > 0 ? currentContext : trendingTracks;
    if (tracks.length === 0) return null;
    const currentIndex = tracks.findIndex(t => t.id === track.id);
    if (currentIndex === -1) return tracks[0];
    const nextIndex = (currentIndex + 1) % tracks.length;
    return tracks[nextIndex];
  }, [queue, currentContext, trendingTracks, track.id]);

  const parsedLyrics = useMemo(() => {
    if (!lyrics || !lyrics.synced) return [];
    const lines = lyrics.lyrics.split('\n');
    const result: { time: number; text: string }[] = [];
    const timeRegex = /\[(\d+):(\d+(\.\d+)?)\]/;
    
    lines.forEach(line => {
      const match = timeRegex.exec(line);
      if (match) {
        const minutes = parseInt(match[1]);
        const seconds = parseFloat(match[2]);
        const time = minutes * 60 + seconds;
        const text = line.replace(timeRegex, '').trim();
        if (text) {
          result.push({ time, text });
        }
      }
    });
    return result;
  }, [lyrics]);

  const lyricsLines = useMemo(() => {
    if (!lyrics) return [];
    if (lyrics.synced) return parsedLyrics.map(l => l.text);
    return lyrics.lyrics.split('\n').filter(l => l.trim().length > 0);
  }, [lyrics, parsedLyrics]);

  const activeLineIdx = useMemo(() => {
    if (!lyricsLines.length || duration <= 0) return -1;
    
    if (lyrics?.synced && parsedLyrics.length > 0) {
      let idx = -1;
      for (let i = 0; i < parsedLyrics.length; i++) {
        if (currentTime >= parsedLyrics[i].time) {
          idx = i;
        } else {
          break;
        }
      }
      return idx;
    }

    // Simple linear estimation for non-synced lyrics
    return Math.floor((currentTime / duration) * lyricsLines.length);
  }, [currentTime, duration, lyricsLines, lyrics, parsedLyrics]);

  useEffect(() => {
    if (showLyrics && activeLineIdx !== -1 && lyricsContainerRef.current && isFollowLyrics) {
      // Only auto-scroll if user hasn't scrolled manually in the last 3 seconds
      if (Date.now() - lastUserScrollRef.current > 3000) {
        const activeElement = lyricsContainerRef.current.querySelector(`[data-line-idx="${activeLineIdx}"]`) as HTMLElement;
        if (activeElement) {
          activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [activeLineIdx, showLyrics, isFollowLyrics]);

  const isLoading = track.source === 'youtube' ? !isPlayerReady : isBuffering;

  useEffect(() => {
    setIsPlayerReady(false);
    setShowLyrics(false);
    setLyrics(null);
  }, [track.id]);

  const fetchLyrics = async () => {
    if (lyrics) {
      setShowLyrics(!showLyrics);
      return;
    }
    setIsLyricsLoading(true);
    setShowLyrics(true);
    const result = await getLyrics(track.title, track.artist);
    setLyrics(result);
    setIsLyricsLoading(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 20, pointerEvents: isVisible ? 'auto' : 'none' }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-40 flex flex-col md:relative md:inset-auto md:z-0 md:h-full"
      style={{ visibility: isVisible ? 'visible' : 'hidden' }}
    >
      {/* Back Button for Mobile */}
      <button 
        onClick={onBack}
        className="absolute top-6 left-6 z-50 p-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-on-surface/60 hover:text-primary transition-all md:hidden"
      >
        <ChevronDown size={24} />
      </button>

      <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-6 md:p-12 gap-8 md:gap-16 max-w-[1200px] mx-auto w-full">
        
        {/* Album Art Section */}
        <div className="relative w-full max-w-[320px] md:max-w-[500px] aspect-square shrink-0">
          <motion.div
            key={track.id}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full h-full rounded-[40px] overflow-hidden album-shadow bg-black"
          >
            {track.source === 'youtube' ? (
              <div className="w-full h-full relative rounded-[40px] overflow-hidden">
                {!isPlayerReady && (
                  <img 
                    className="absolute inset-0 w-full h-full object-cover z-10" 
                    src={track.coverUrl} 
                    alt={track.title}
                    referrerPolicy="no-referrer"
                  />
                )}
                <Player 
                  ref={playerRef}
                  url={`https://www.youtube.com/watch?v=${track.id}`}
                  width="100%"
                  height="100%"
                  style={{ borderRadius: '40px', overflow: 'hidden' }}
                  playing={isPlaying && isPlayerReady}
                  playbackRate={playbackRate}
                  loop={isRepeat}
                  volume={volume}
                  progressInterval={100}
                  playsinline
                  controls={false}
                  wrapper={PlayerWrapper}
                  onReady={() => setIsPlayerReady(true)}
                  onBuffer={() => setIsPlayerReady(false)}
                  onBufferEnd={() => setIsPlayerReady(true)}
                  onDuration={(d: number) => setDuration(d)}
                  onEnded={onNext}
                  onProgress={(p: any) => {
                    if (!isSeeking) {
                      onSeek(p.playedSeconds);
                    }
                  }}
                  config={{
                    youtube: {
                      playerVars: {
                        rel: 0,
                        showinfo: 0,
                        modestbranding: 1,
                        iv_load_policy: 3,
                        disablekb: 1,
                        origin: window.location.origin
                      }
                    }
                  }}
                />
              </div>
            ) : (
              <img 
                className="w-full h-full object-cover" 
                src={track.coverUrl} 
                alt={track.title}
                referrerPolicy="no-referrer"
              />
            )}
          </motion.div>

          {/* Buffering Indicator */}
          {isBuffering && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm rounded-[40px] z-20">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
              />
            </div>
          )}
        </div>

        {/* Track Info & Controls Panel */}
        <div className="w-full max-w-[500px] glass-panel p-8 md:p-10 space-y-8 rounded-3xl border border-white/5">
          {nextTrack && (
            <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 rounded-2xl border border-primary/20 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0">
                <img src={nextTrack.coverUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-primary/60">Next Up</p>
                <p className="text-[10px] font-bold text-on-surface truncate uppercase tracking-tight">{nextTrack.title}</p>
              </div>
              <ListPlus size={14} className="text-primary" />
            </div>
          )}

          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl md:text-3xl font-black text-on-surface uppercase tracking-tighter leading-tight truncate">
                {track.title}
              </h2>
              <p className="text-sm md:text-base font-bold text-primary uppercase tracking-widest mt-1">
                {track.artist}
              </p>
            </div>
            <button 
              onClick={onLike}
              className={`p-3 rounded-2xl transition-all ${isLiked ? 'bg-primary text-on-primary' : 'bg-white/5 text-on-surface hover:bg-white/10'}`}
            >
              <Heart size={24} fill={isLiked ? 'currentColor' : 'none'} />
            </button>
            <button 
              onClick={handleShare}
              className="p-3 rounded-2xl bg-white/5 text-on-surface hover:bg-white/10 transition-all flex items-center justify-center"
              title="Share track"
            >
              <Share2 size={24} />
            </button>
          </div>

          <AnimatePresence>
            {showShareToast && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
              >
                <div className="bg-primary px-4 py-2 rounded-xl text-on-primary font-black uppercase tracking-widest text-[10px] shadow-2xl">
                  Link copied to clipboard!
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Progress Bar */}
          <div className="space-y-3">
            <div 
              className="relative h-2 bg-white/10 rounded-full cursor-pointer overflow-hidden group"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const pct = x / rect.width;
                handleManualSeek(pct * duration);
              }}
            >
              <motion.div 
                className="absolute h-full bg-primary" 
                initial={false}
                animate={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-on-surface/40">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setIsShuffle(!isShuffle)}
              className={`p-2 transition-all ${isShuffle ? 'text-primary' : 'text-on-surface/20 hover:text-on-surface'}`}
            >
              <Shuffle size={20} />
            </button>
            
            <div className="flex items-center gap-6 md:gap-10">
              <button onClick={onPrev} className="text-on-surface hover:scale-110 transition-transform">
                <SkipBack size={32} fill="currentColor" />
              </button>
              
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-20 h-20 md:w-24 md:h-24 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all"
              >
                {isPlaying ? <Pause size={36} fill="currentColor" /> : <Play size={36} className="ml-2" fill="currentColor" />}
              </button>
              
              <button onClick={onNext} className="text-on-surface hover:scale-110 transition-transform">
                <SkipForward size={32} fill="currentColor" />
              </button>
            </div>

            <button 
              onClick={() => setIsRepeat(!isRepeat)}
              className={`p-2 transition-all ${isRepeat ? 'text-primary' : 'text-on-surface/20 hover:text-on-surface'}`}
            >
              <Repeat size={20} />
            </button>
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-col gap-8 pt-6 border-t border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={fetchLyrics}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${showLyrics ? 'bg-primary text-on-primary' : 'bg-white/5 text-on-surface/40 hover:text-on-surface'}`}
                >
                  <Mic2 size={14} />
                  Lyrics
                </button>
                <button 
                  onClick={onOpenQueue}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest bg-white/5 text-on-surface/40 hover:text-on-surface transition-all"
                >
                  <ListPlus size={14} />
                  Queue
                </button>
                <div className="relative">
                  <button 
                    onClick={() => setIsSpeedMenuOpen(!isSpeedMenuOpen)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${isSpeedMenuOpen ? 'bg-primary text-on-primary' : 'bg-white/5 text-on-surface/40 hover:text-on-surface'}`}
                  >
                    <Gauge size={14} />
                    {playbackRate}x
                  </button>
                  <AnimatePresence>
                    {isSpeedMenuOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full left-0 mb-2 flex flex-col bg-surface border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 min-w-[100px]"
                      >
                        {[0.5, 1, 1.5, 2].map(speed => (
                          <button
                            key={speed}
                            onClick={() => {
                              setPlaybackRate(speed);
                              setIsSpeedMenuOpen(false);
                            }}
                            className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-on-primary transition-all text-left whitespace-nowrap ${playbackRate === speed ? 'bg-primary/20 text-primary' : 'text-on-surface/60'}`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
            
            {/* Redesigned Volume Control */}
            <div className="flex items-center gap-4 group w-full bg-white/5 p-4 rounded-2xl border border-white/5">
              <button 
                onClick={() => setVolume(volume === 0 ? 0.5 : 0)}
                className="text-on-surface/40 hover:text-primary transition-colors"
              >
                {volume === 0 ? <VolumeX size={18} /> : volume < 0.5 ? <Volume1 size={18} /> : <Volume2 size={18} />}
              </button>
              <div 
                className="flex-1 h-2 bg-white/10 rounded-full cursor-pointer relative overflow-hidden"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const pct = Math.max(0, Math.min(1, x / rect.width));
                  setVolume(pct);
                }}
              >
                <motion.div 
                  className="absolute h-full bg-primary"
                  initial={false}
                  animate={{ width: `${volume * 100}%` }}
                />
              </div>
              <span className="text-[10px] font-black text-on-surface/40 w-8 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lyrics Overlay */}
      <AnimatePresence>
        {showLyrics && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-3xl p-8 md:p-16 overflow-y-auto custom-scrollbar"
            ref={lyricsContainerRef}
            onScroll={handleLyricsScroll}
          >
            <div className="max-w-2xl mx-auto">
              <div className="flex justify-between items-center mb-12 sticky top-0 bg-background/60 backdrop-blur-xl z-10 py-4 rounded-2xl px-6 border border-white/5">
                <div className="flex items-center gap-4">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tighter text-on-surface">{track.title}</h3>
                    <p className="text-xs font-bold text-primary uppercase tracking-widest">{track.artist}</p>
                  </div>
                  <button 
                    onClick={() => setIsFollowLyrics(!isFollowLyrics)}
                    className={`ml-4 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isFollowLyrics ? 'bg-primary text-on-primary' : 'bg-white/5 text-on-surface/40'}`}
                  >
                    {isFollowLyrics ? 'Following' : 'Manual'}
                  </button>
                </div>
                <button 
                  onClick={() => setShowLyrics(false)} 
                  className="p-3 bg-white/5 rounded-2xl text-on-surface/40 hover:text-on-surface transition-colors"
                >
                  <ChevronDown size={24} />
                </button>
              </div>

              {isLyricsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full"
                  />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface/40">Fetching Lyrics...</p>
                </div>
              ) : (
                <div className="flex flex-col gap-8 pb-64">
                  {lyricsLines.length > 0 ? lyricsLines.map((line, idx) => {
                    const isActive = idx === activeLineIdx;
                    return (
                      <motion.p
                        key={idx}
                        data-line-idx={idx}
                        animate={{ 
                          opacity: isActive ? 1 : 0.2,
                          scale: isActive ? 1.05 : 1,
                          x: isActive ? 15 : 0,
                          color: isActive ? 'var(--color-primary)' : 'var(--color-on-surface)'
                        }}
                        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                        className={`text-3xl md:text-5xl font-black leading-tight uppercase tracking-tighter transition-all duration-500 cursor-pointer hover:opacity-100 py-2 px-4 rounded-2xl ${isActive ? 'bg-white/5 text-primary' : 'text-on-surface/40'}`}
                        onClick={() => {
                          if (lyrics?.synced && parsedLyrics[idx]) {
                            handleManualSeek(parsedLyrics[idx].time);
                          }
                        }}
                      >
                        {line}
                      </motion.p>
                    );
                  }) : (
                    <div className="text-center py-32 opacity-40 uppercase font-black tracking-tighter text-3xl md:text-4xl">
                      {lyrics?.lyrics === "Lyrics not found." ? "Lyrics not found for this track." : "Searching for lyrics..."}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const getPlaylistCover = (playlist: Playlist) => {
  if (playlist.customCoverUrl) return playlist.customCoverUrl;
  if (playlist.tracks && playlist.tracks.length > 0) return playlist.tracks[0].coverUrl;
  return playlist.coverUrl || 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?q=80&w=400&auto=format&fit=crop';
};

const PlaylistView = ({ 
  playlist, 
  onBack, 
  onPlay, 
  onRemoveTrack, 
  onDeletePlaylist,
  onReorder,
  onUpdateCover,
  onAddToQueue,
  onContextMenu
}: { 
  playlist: Playlist, 
  onBack: () => void, 
  onPlay: (t: Track) => void,
  onRemoveTrack: (playlistId: string, trackId: string) => void,
  onDeletePlaylist: (id: string) => void,
  onReorder: (playlistId: string, start: number, end: number) => void,
  onUpdateCover: (playlistId: string, url: string) => void,
  onAddToQueue: (t: Track) => void,
  onContextMenu: (e: any, track: Track, context?: { type: 'playlist' | 'favorites', id?: string }) => void
}) => {
  const getLongPressProps = useLongPress(onContextMenu);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateCover(playlist.id, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-12 pb-32"
    >
      <div className="flex flex-col md:flex-row gap-8 items-end border-b border-white/5 pb-12">
        <div 
          className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-[40px] overflow-hidden album-shadow bg-black shrink-0 group cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <img 
            src={getPlaylistCover(playlist)} 
            alt={playlist.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            referrerPolicy="no-referrer" 
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
            <Plus size={32} className="text-white" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Update Cover</span>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange}
          />
        </div>
        <div className="flex-1 space-y-6">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Playlist</p>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-on-surface leading-none">{playlist.title}</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface/40">{playlist.description}</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => playlist.tracks.length > 0 && onPlay(playlist.tracks[0])}
              className="px-10 py-4 bg-primary text-on-primary rounded-full font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-lg flex items-center gap-2"
            >
              <Play size={16} fill="currentColor" /> Play
            </button>
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="px-8 py-4 bg-white/5 text-on-surface/40 hover:text-red-500 border border-white/10 rounded-full font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2"
            >
              <Trash2 size={16} /> Delete
            </button>
            <button 
              onClick={onBack}
              className="px-8 py-4 bg-white/5 text-on-surface/40 hover:text-on-surface border border-white/10 rounded-full font-black uppercase tracking-widest text-xs transition-all"
            >
              Back
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {playlist.tracks.length > 0 ? (
          <div className="grid grid-cols-1 gap-2">
            {playlist.tracks.map((track, index) => (
              <div 
                key={`${track.id}-${index}`}
                className="group flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 hover:border-white/10 transition-all"
                onContextMenu={(e) => onContextMenu(e, track, { type: 'playlist', id: playlist.id })}
                {...getLongPressProps(track, { type: 'playlist', id: playlist.id })}
              >
                <div className="w-12 h-12 rounded-2xl overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500 shrink-0">
                  <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onPlay(track)}>
                  <h4 className="font-black text-sm uppercase tracking-tight text-on-surface truncate">{track.title}</h4>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest truncate">{track.artist}</p>
                </div>
                <div className="flex items-center gap-6">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onAddToQueue(track); }}
                    className="p-2 text-on-surface/20 hover:text-primary transition-colors"
                    title="Add to Queue"
                  >
                    <Activity size={18} />
                  </button>
                  <div className="hidden sm:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      disabled={index === 0}
                      onClick={() => onReorder(playlist.id, index, index - 1)}
                      className="p-2 text-on-surface/40 hover:text-primary disabled:opacity-20"
                    >
                      <ChevronDown className="rotate-180" size={16} />
                    </button>
                    <button 
                      disabled={index === playlist.tracks.length - 1}
                      onClick={() => onReorder(playlist.id, index, index + 1)}
                      className="p-2 text-on-surface/40 hover:text-primary disabled:opacity-20"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                  <span className="text-[10px] font-bold text-on-surface/40">{track.duration}</span>
                  <button 
                    onClick={() => onRemoveTrack(playlist.id, track.id)}
                    className="p-2 text-on-surface/20 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center border border-dashed border-white/10 rounded-[40px]">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface/20">This playlist is currently empty</p>
          </div>
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-surface p-8 rounded-3xl border border-white/10 max-w-md w-full mx-4 space-y-6">
            <h3 className="text-2xl font-black uppercase tracking-tighter text-on-surface">Delete Playlist?</h3>
            <p className="text-on-surface/60">Are you sure you want to delete this playlist? This action cannot be undone.</p>
            <div className="flex gap-4 justify-end">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="px-6 py-3 bg-white/5 text-on-surface hover:bg-white/10 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  onDeletePlaylist(playlist.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-6 py-3 bg-red-500 text-white hover:bg-red-600 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

const QueueView = ({ 
  queue, 
  currentTrack,
  currentContext,
  trendingTracks,
  onBack, 
  onPlay, 
  onRemove, 
  onReorder,
  onClear,
  onContextMenu
}: { 
  queue: Track[], 
  currentTrack: Track | null,
  currentContext: Track[],
  trendingTracks: Track[],
  onBack: () => void, 
  onPlay: (t: Track, index: number) => void,
  onRemove: (trackId: string, index: number) => void,
  onReorder: (start: number, end: number) => void,
  onClear: () => void,
  onContextMenu: (e: any, track: Track, context?: { type: 'playlist' | 'favorites', id?: string }) => void
}) => {
  const getLongPressProps = useLongPress(onContextMenu);
  const contextTracks = useMemo(() => {
    const tracks = currentContext.length > 0 ? currentContext : trendingTracks;
    if (!currentTrack) return tracks;
    const currentIndex = tracks.findIndex(t => t.id === currentTrack.id);
    if (currentIndex === -1) return tracks;
    // Return tracks after the current one
    return tracks.slice(currentIndex + 1);
  }, [currentContext, trendingTracks, currentTrack]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-12 pb-32"
    >
      <div className="flex flex-col md:flex-row gap-8 items-end border-b border-white/5 pb-12">
        <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-[40px] border border-white/10 shrink-0 overflow-hidden bg-white/5 flex items-center justify-center shadow-2xl">
          {currentTrack ? (
            <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <ListPlus size={64} className="text-primary/20" />
          )}
        </div>
        <div className="flex-1 space-y-6">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Up Next</p>
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-on-surface leading-none">Queue</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface/40">{queue.length} Tracks in Line</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <button 
              onClick={onClear}
              className="px-8 py-4 bg-white/5 text-on-surface/40 hover:text-red-500 border border-white/10 rounded-full font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2"
            >
              <Trash2 size={16} /> Clear Queue
            </button>
            <button 
              onClick={onBack}
              className="px-8 py-4 bg-white/5 text-on-surface/40 hover:text-on-surface border border-white/10 rounded-full font-black uppercase tracking-widest text-xs transition-all"
            >
              Back
            </button>
          </div>
        </div>
      </div>

      {currentTrack && (
        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface/40">Now Playing</h4>
          <div className="flex items-center gap-4 p-4 bg-primary/10 border border-primary/20 rounded-3xl">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0">
              <img src={currentTrack.coverUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-sm uppercase tracking-tight text-on-surface truncate">{currentTrack.title}</h4>
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest truncate">{currentTrack.artist}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-1 h-4 bg-primary rounded-full animate-pulse"></div>
              <div className="w-1 h-6 bg-primary rounded-full animate-pulse delay-75"></div>
              <div className="w-1 h-3 bg-primary rounded-full animate-pulse delay-150"></div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface/40">Next In Queue</h4>
        {queue.length > 0 ? (
          <div className="grid grid-cols-1 gap-2">
            {queue.map((track, index) => (
              <div 
                key={`${track.id}-${index}`}
                className="group flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 hover:border-white/10 transition-all"
                onContextMenu={(e) => onContextMenu(e, track)}
                {...getLongPressProps(track)}
              >
                <div className="w-12 h-12 rounded-2xl overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500 shrink-0">
                  <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onPlay(track, index)}>
                  <h4 className="font-black text-sm uppercase tracking-tight text-on-surface truncate">{track.title}</h4>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest truncate">{track.artist}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="hidden sm:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      disabled={index === 0}
                      onClick={() => onReorder(index, index - 1)}
                      className="p-2 text-on-surface/40 hover:text-primary disabled:opacity-20"
                    >
                      <ChevronDown className="rotate-180" size={16} />
                    </button>
                    <button 
                      disabled={index === queue.length - 1}
                      onClick={() => onReorder(index, index + 1)}
                      className="p-2 text-on-surface/40 hover:text-primary disabled:opacity-20"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>
                  <span className="text-[10px] font-bold text-on-surface/40">{track.duration}</span>
                  <button 
                    onClick={() => onRemove(track.id, index)}
                    className="p-2 text-on-surface/20 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-24 text-center border border-dashed border-white/10 rounded-[40px]">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface/20">The queue is empty</p>
          </div>
        )}
      </div>

      {contextTracks.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface/40">Next From Context</h4>
          <div className="grid grid-cols-1 gap-2">
            {contextTracks.slice(0, 10).map((track, index) => (
              <div 
                key={`${track.id}-context-${index}`}
                className="group flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 hover:border-white/10 transition-all opacity-60 hover:opacity-100"
              >
                <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0">
                  <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-sm uppercase tracking-tight text-on-surface truncate">{track.title}</h4>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest truncate">{track.artist}</p>
                </div>
                <div className="text-[10px] font-bold text-on-surface/40">{track.duration}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

const AddToPlaylistModal = ({ 
  isOpen,
  track, 
  playlists, 
  onClose, 
  onAdd, 
  onCreateAndAdd 
}: { 
  isOpen: boolean,
  track: Track, 
  playlists: Playlist[], 
  onClose: () => void, 
  onAdd: (playlistId: string, track: Track) => void,
  onCreateAndAdd: (title: string, track: Track) => void
}) => {
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md glass-panel p-8 space-y-8 shadow-2xl rounded-[40px]"
      >
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <h3 className="text-3xl font-black uppercase tracking-tighter text-on-surface">Add to Playlist</h3>
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest truncate max-w-[250px]">{track.title}</p>
          </div>
          <button onClick={onClose} className="p-2 text-on-surface/40 hover:text-on-surface transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
          {playlists.map(playlist => (
            <button 
              key={playlist.id}
              onClick={() => onAdd(playlist.id, track)}
              className="w-full flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 hover:border-white/10 transition-all group text-left"
            >
              <div className="w-12 h-12 rounded-2xl overflow-hidden grayscale group-hover:grayscale-0 shrink-0">
                <img src={getPlaylistCover(playlist)} alt={playlist.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-black text-sm uppercase tracking-tight text-on-surface truncate">{playlist.title}</h4>
                <p className="text-[10px] font-bold text-on-surface/40 uppercase tracking-widest">{playlist.tracks.length} tracks</p>
              </div>
              <Plus size={20} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>

        <div className="pt-6 border-t border-white/10 space-y-4">
          <p className="text-[10px] font-black text-on-surface/40 uppercase tracking-widest">Or Create New</p>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newPlaylistTitle}
              onChange={(e) => setNewPlaylistTitle(e.target.value)}
              placeholder="PLAYLIST TITLE"
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 font-bold text-xs uppercase tracking-widest text-on-surface focus:border-primary outline-none transition-all"
            />
            <button 
              onClick={() => {
                if (newPlaylistTitle.trim()) {
                  onCreateAndAdd(newPlaylistTitle, track);
                }
              }}
              className="px-6 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all"
            >
              Create
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const LibraryScreen: React.FC<{ 
  onPlay: (t: Track) => void; 
  onShuffleAll: () => void; 
  likedTracks: Track[];
  playlists: Playlist[];
  onSelectPlaylist: (p: Playlist) => void;
  onCreatePlaylist: (title: string) => void;
  onAddToQueue: (t: Track) => void;
  onContextMenu: (e: any, track: Track, context?: { type: 'playlist' | 'favorites', id?: string }) => void;
}> = ({ onPlay, onShuffleAll, likedTracks, playlists, onSelectPlaylist, onCreatePlaylist, onAddToQueue, onContextMenu }) => {
  const getLongPressProps = useLongPress(onContextMenu);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');

  const handleCreatePlaylist = () => {
    if (newPlaylistTitle.trim()) {
      onCreatePlaylist(newPlaylistTitle.trim());
      setNewPlaylistTitle('');
      setShowCreateModal(false);
    }
  };

  return (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="space-y-24 pb-32"
  >
    {/* Liked Songs Hero */}
    <section>
      <div 
        onClick={onShuffleAll}
        className="relative h-64 md:h-80 lg:h-96 w-full rounded-[40px] overflow-hidden album-shadow group cursor-pointer bg-black"
      >
        <div className="absolute inset-0 grayscale group-hover:grayscale-0 transition-all duration-700 opacity-50">
          <img 
            className="w-full h-full object-cover" 
            src="https://picsum.photos/seed/liked/1200/600" 
            alt="Liked Songs"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="absolute inset-0 p-6 md:p-12 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent">
          <div className="flex justify-between items-end gap-4">
            <div className="space-y-4">
              <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white uppercase leading-none">Liked<br/>Tracks</h2>
              <p className="text-[10px] font-black text-white/40 tracking-[0.4em] uppercase">{likedTracks.length} Curated Masterpieces</p>
            </div>
            <button className="w-16 h-16 md:w-20 md:h-20 bg-primary text-on-primary rounded-full flex items-center justify-center hover:scale-110 transition-all group shrink-0 shadow-2xl">
              <Shuffle size={24} className="md:hidden group-hover:rotate-180 transition-transform duration-500" />
              <Shuffle size={32} className="hidden md:block group-hover:rotate-180 transition-transform duration-500" />
            </button>
          </div>
        </div>
      </div>
    </section>

    {/* Liked Songs List */}
    {likedTracks.length > 0 ? (
      <section className="space-y-12">
        <div className="flex justify-between items-end border-b border-white/5 pb-6">
          <h3 className="text-3xl font-black uppercase tracking-tighter text-on-surface">Collection</h3>
          <p className="text-[10px] font-black text-on-surface/40 uppercase tracking-widest">Sorted by Recent</p>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {likedTracks.map((track) => (
            <div 
              key={track.id} 
              onClick={() => onPlay(track)} 
              className="group flex items-center gap-4 sm:gap-8 p-4 sm:p-6 bg-white/5 border border-white/5 rounded-3xl hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer"
              onContextMenu={(e) => onContextMenu(e, track, { type: 'favorites' })}
              {...getLongPressProps(track, { type: 'favorites' })}
            >
              <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-2xl overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500 shrink-0">
                <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-lg sm:text-xl font-black uppercase tracking-tighter text-on-surface truncate mb-0.5 sm:mb-1">{track.title}</h4>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest truncate">{track.artist}</p>
              </div>
              <div className="flex items-center gap-4 sm:gap-8">
                <button 
                  onClick={(e) => { e.stopPropagation(); onAddToQueue(track); }}
                  className="text-on-surface/20 hover:text-primary transition-all"
                  title="Add to Queue"
                >
                  <Activity size={18} />
                </button>
                <span className="text-[10px] font-bold text-on-surface/40">{track.duration}</span>
                <Play className="w-[18px] h-[18px] sm:w-[24px] sm:h-[24px] text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      </section>
    ) : (
      <section className="py-32 text-center space-y-8 border border-dashed border-white/10 rounded-[40px]">
        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto">
          <Heart size={40} className="text-on-surface/10" />
        </div>
        <div className="space-y-4">
          <h3 className="text-2xl font-black uppercase tracking-tighter text-on-surface">Void Detected</h3>
          <p className="text-[10px] font-bold text-on-surface/40 uppercase tracking-widest max-w-xs mx-auto">Your collection is currently empty. Initialize by liking tracks.</p>
        </div>
      </section>
    )}

    {/* Playlists */}
    <section className="space-y-12">
      <div className="flex justify-between items-end border-b border-white/5 pb-6">
        <h3 className="text-3xl font-black uppercase tracking-tighter text-on-surface">Playlists</h3>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="text-[10px] font-black uppercase tracking-widest text-primary hover:text-on-surface transition-colors"
        >
          Create New +
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {playlists.map((playlist) => (
          <div 
            key={playlist.id} 
            onClick={() => onSelectPlaylist(playlist)}
            className="group cursor-pointer space-y-6"
          >
            <div className="aspect-square rounded-3xl overflow-hidden relative bg-black album-shadow">
              <img 
                className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700 opacity-60 group-hover:opacity-100" 
                src={getPlaylistCover(playlist)} 
                alt={playlist.title}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 bg-black/20">
                <div className="w-16 h-16 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-2xl">
                  <Play size={32} fill="currentColor" />
                </div>
              </div>
            </div>
            <div className="space-y-1 px-2">
              <h4 className="text-xl font-black uppercase tracking-tighter text-on-surface truncate">{playlist.title}</h4>
              <p className="text-[10px] font-bold text-on-surface/40 uppercase tracking-widest">{playlist.tracks.length} tracks</p>
            </div>
          </div>
        ))}
      </div>
    </section>

    {showCreateModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-surface p-8 rounded-3xl border border-white/10 max-w-md w-full mx-4 space-y-6">
          <h3 className="text-2xl font-black uppercase tracking-tighter text-on-surface">Create Playlist</h3>
          <input
            type="text"
            value={newPlaylistTitle}
            onChange={(e) => setNewPlaylistTitle(e.target.value)}
            placeholder="Playlist Title"
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 font-bold text-xs uppercase tracking-widest text-on-surface focus:border-primary outline-none transition-all"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreatePlaylist();
              if (e.key === 'Escape') setShowCreateModal(false);
            }}
          />
          <div className="flex gap-4 justify-end">
            <button 
              onClick={() => setShowCreateModal(false)}
              className="px-6 py-3 bg-white/5 text-on-surface hover:bg-white/10 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleCreatePlaylist}
              disabled={!newPlaylistTitle.trim()}
              className="px-6 py-3 bg-primary text-on-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
            >
              Create
            </button>
          </div>
        </div>
      </div>
    )}
  </motion.div>
  );
};


// --- Main App ---


export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [prevScreen, setPrevScreen] = useState<Screen>('home');
  const [currentTrack, setCurrentTrack] = useState<Track>(RECENTLY_PLAYED[0]);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    track: Track;
    context?: { type: 'playlist' | 'favorites', id?: string };
  } | null>(null);

  const handleContextMenu = (e: any, track: Track, context?: { type: 'playlist' | 'favorites', id?: string }) => {
    if (e.preventDefault) e.preventDefault();
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.clientX !== undefined) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      clientX = window.innerWidth / 2;
      clientY = window.innerHeight / 2;
    }

    setContextMenu({
      x: clientX,
      y: clientY,
      track,
      context
    });

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  useEffect(() => {
    const handleClickOutside = () => closeContextMenu();
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const navigateTo = (newScreen: Screen) => {
    if (screen !== 'player') {
      setPrevScreen(screen);
    }
    setScreen(newScreen);
  };

  const [recentlyPlayed, setRecentlyPlayed] = useState<Track[]>(() => {
    const saved = localStorage.getItem('recentlyPlayed');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('recentlyPlayed', JSON.stringify(recentlyPlayed));
  }, [recentlyPlayed]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    if (screen === 'player') {
      setIsNavVisible(false);
    } else {
      setIsNavVisible(true);
    }
  }, [screen]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsNavVisible(false);
      } else {
        setIsNavVisible(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isEqualizerOpen, setIsEqualizerOpen] = useState(false);
  const [equalizerValues, setEqualizerValues] = useState([0, 0, 0, 0, 0]);
  const [likedTracks, setLikedTracks] = useState<Track[]>(() => {
    const saved = localStorage.getItem('likedTracks');
    return saved ? JSON.parse(saved) : [];
  });

  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    const saved = localStorage.getItem('playlists');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Filter out the old default playlists if they exist in localStorage
        return parsed.filter((p: Playlist) => p.id !== 'p1' && p.id !== 'p2');
      } catch (e) {
        return PLAYLISTS;
      }
    }
    return PLAYLISTS;
  });

  const [activePlaylist, setActivePlaylist] = useState<Playlist | null>(null);
  const [trackToAddToPlaylist, setTrackToAddToPlaylist] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [currentContext, setCurrentContext] = useState<Track[]>([]);

  // Keep activePlaylist in sync with playlists
  useEffect(() => {
    if (activePlaylist) {
      const updated = playlists.find(p => p.id === activePlaylist.id);
      if (updated) {
        setActivePlaylist(updated);
      }
    }
  }, [playlists]);

  useEffect(() => {
    localStorage.setItem('likedTracks', JSON.stringify(likedTracks));
  }, [likedTracks]);

  useEffect(() => {
    localStorage.setItem('playlists', JSON.stringify(playlists));
  }, [playlists]);

  const createPlaylist = (title: string) => {
    const newPlaylist: Playlist = {
      id: `p${Date.now()}`,
      title,
      description: 'New Playlist',
      coverUrl: '',
      tracks: [],
      createdAt: Date.now()
    };
    setPlaylists(prev => [...prev, newPlaylist]);
    return newPlaylist;
  };

  const deletePlaylist = (id: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== id));
    if (activePlaylist?.id === id) setActivePlaylist(null);
  };

  const updatePlaylistCover = (playlistId: string, url: string) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        return { ...p, customCoverUrl: url, coverUrl: url };
      }
      return p;
    }));
  };

  const addToPlaylist = (playlistId: string, track: Track) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        if (p.tracks.find(t => t.id === track.id)) return p;
        const newTracks = [...p.tracks, track];
        const newCoverUrl = p.customCoverUrl || newTracks[0]?.coverUrl || p.coverUrl;
        return { ...p, tracks: newTracks, coverUrl: newCoverUrl };
      }
      return p;
    }));
    setTrackToAddToPlaylist(null);
  };

  const removeFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        const newTracks = p.tracks.filter(t => t.id !== trackId);
        const newCoverUrl = p.customCoverUrl || newTracks[0]?.coverUrl || `https://picsum.photos/seed/${p.id}/400/400`;
        return { ...p, tracks: newTracks, coverUrl: newCoverUrl };
      }
      return p;
    }));
  };

  const reorderPlaylist = (playlistId: string, startIndex: number, endIndex: number) => {
    setPlaylists(prev => prev.map(p => {
      if (p.id === playlistId) {
        const result = Array.from(p.tracks);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        const newCoverUrl = p.customCoverUrl || result[0]?.coverUrl || p.coverUrl;
        return { ...p, tracks: result, coverUrl: newCoverUrl };
      }
      return p;
    }));
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState('All');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentSearches');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchResults, setSearchResults] = useState<Track[]>([]);

  useEffect(() => {
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
  }, [recentSearches]);

  const [trendingTracks, setTrendingTracks] = useState<Track[]>(RECENTLY_PLAYED);
  const [isLoading, setIsLoading] = useState(false);
  const [audio] = useState(new Audio());
  const [playbackRate, setPlaybackRate] = useState(1);
  const playbackRateRef = useRef(1);
  const playPromiseRef = useRef<Promise<void> | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };
  
  // Helper for safe audio playback
  const safePlay = async (trackToCheck?: Track) => {
    const track = trackToCheck || currentTrack;
    if (track.source !== 'youtube' && audio.src && audio.src !== window.location.href) {
      try {
        audio.playbackRate = playbackRateRef.current;
        playPromiseRef.current = audio.play();
        await playPromiseRef.current;
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error('Playback failed:', e);
        }
      } finally {
        playPromiseRef.current = null;
      }
    }
  };

  const safePause = async () => {
    if (playPromiseRef.current) {
      try {
        await playPromiseRef.current;
      } catch (e) {
        // Ignore abort errors
      }
    }
    audio.pause();
  };

  // Web Audio API refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    // Set crossOrigin to allow Web Audio API processing
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    // @ts-ignore
    audio.playsInline = true;

    const loadTrending = async () => {
      try {
        const [scTracks, ytTracks] = await Promise.allSettled([
          soundcloud.getTrendingTracks(),
          youtube.getTrendingTracks()
        ]);
        
        let combinedTracks: Track[] = [];
        if (scTracks.status === 'fulfilled') combinedTracks = [...combinedTracks, ...scTracks.value];
        if (ytTracks.status === 'fulfilled') combinedTracks = [...combinedTracks, ...ytTracks.value];
        
        if (combinedTracks.length > 0) {
          // Shuffle the combined trending tracks for variety
          const shuffled = combinedTracks.sort(() => 0.5 - Math.random());
          setTrendingTracks(shuffled);
          setCurrentTrack(shuffled[0]);
        }
      } catch (error) {
        console.error('Error loading trending tracks:', error);
      }
    };
    loadTrending();

    // Audio event listeners
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      setDuration(audio.duration);
      audio.playbackRate = playbackRateRef.current;
      setIsBuffering(false);
    };
    const onEnded = () => handleNext();
    const onWaiting = () => setIsBuffering(true);
    const onLoadStart = () => setIsBuffering(true);
    const onPlaying = () => setIsBuffering(false);
    const onCanPlay = () => setIsBuffering(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('loadstart', onLoadStart);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('canplay', onCanPlay);

    audio.volume = volume;

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('loadstart', onLoadStart);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('canplay', onCanPlay);
      audio.pause();
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    playbackRateRef.current = playbackRate;
    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    if (isPlaying) {
      // Initialize AudioContext on first user interaction
      if (!audioCtxRef.current) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        // Create source node
        const source = ctx.createMediaElementSource(audio);
        sourceNodeRef.current = source;

        // Create 5 filters for the 5 bands: 60Hz, 230Hz, 910Hz, 4kHz, 14kHz
        const frequencies = [60, 230, 910, 4000, 14000];
        const filters = frequencies.map((freq, idx) => {
          const filter = ctx.createBiquadFilter();
          filter.type = idx === 0 ? 'lowshelf' : idx === 4 ? 'highshelf' : 'peaking';
          filter.frequency.value = freq;
          filter.Q.value = 1;
          filter.gain.value = equalizerValues[idx];
          return filter;
        });
        filtersRef.current = filters;

        // Connect nodes: source -> f1 -> f2 -> f3 -> f4 -> f5 -> destination
        let lastNode: AudioNode = source;
        filters.forEach(filter => {
          lastNode.connect(filter);
          lastNode = filter;
        });
        lastNode.connect(ctx.destination);
      }

      if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }

      if (currentTrack?.source !== 'youtube') {
        safePlay();
      }
    } else {
      if (currentTrack?.source !== 'youtube') {
        safePause();
      }
    }
  }, [isPlaying, currentTrack]);

  // Update filters when equalizer values change
  useEffect(() => {
    if (filtersRef.current.length > 0) {
      filtersRef.current.forEach((filter, idx) => {
        // Use exponential ramp for smoother transitions if needed, but direct value is fine for now
        filter.gain.setTargetAtTime(equalizerValues[idx], audioCtxRef.current!.currentTime, 0.05);
      });
    }
  }, [equalizerValues]);

  const handlePlay = async (track: Track, context?: Track[]) => {
    if (context) {
      setCurrentContext(context);
    }
    await safePause();
    audio.removeAttribute('src');
    audio.load();
    
    // Unlock audio element on mobile/Safari by playing empty source synchronously
    try {
      const p = audio.play();
      if (p !== undefined) {
        p.catch(() => {});
      }
    } catch (e) {}

    setCurrentTime(0);
    setCurrentTrack(track);
    setIsPlaying(true);
    setIsBuffering(true);
    navigateTo('player');

    // Reset audio element if it's a YouTube track
    if (track.source === 'youtube') {
      setIsBuffering(false);
      // Convert "4:20" to seconds for the duration state
      const [mins, secs] = track.duration.split(':').map(Number);
      if (!isNaN(mins) && !isNaN(secs)) {
        setDuration(mins * 60 + secs);
      } else {
        setDuration(0);
      }
      
      // Update recently played
      setRecentlyPlayed(prev => {
        const filtered = prev.filter(t => t.id !== track.id);
        return [track, ...filtered].slice(0, 20);
      });
      
      return;
    }

    // Fetch real stream URL if it's a SoundCloud track
    const streamUrl = await soundcloud.getStreamUrl(track.id);
    if (streamUrl) {
      // Update recently played
      setRecentlyPlayed(prev => {
        const filtered = prev.filter(t => t.id !== track.id);
        return [track, ...filtered].slice(0, 20);
      });

      if (streamUrl.includes('.m3u8')) {
        if (Hls.isSupported()) {
          if (hlsRef.current) {
            hlsRef.current.destroy();
          }
          const hls = new Hls();
          hls.loadSource(streamUrl);
          hls.attachMedia(audio);
          hlsRef.current = hls;
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            safePlay(track);
          });
        } else if (audio.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS support (Safari)
          audio.src = streamUrl;
          safePlay(track);
        }
      } else {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        audio.src = streamUrl;
        safePlay(track);
      }
    } else {
      console.warn('Could not get stream URL for track:', track.id, 'falling back to YouTube');
      const ytTracks = await youtube.searchTracks(`${track.title} ${track.artist}`);
      if (ytTracks.length > 0) {
        const ytTrack = ytTracks[0];
        setCurrentTrack({
          ...track,
          id: ytTrack.id,
          source: 'youtube'
        });
        setIsBuffering(false);
        // Convert "4:20" to seconds for the duration state
        const [mins, secs] = ytTrack.duration.split(':').map(Number);
        if (!isNaN(mins) && !isNaN(secs)) {
          setDuration(mins * 60 + secs);
        } else {
          setDuration(0);
        }
        
        // Update recently played
        setRecentlyPlayed(prev => {
          const filtered = prev.filter(t => t.id !== track.id);
          return [track, ...filtered].slice(0, 20);
        });
      } else {
        setIsBuffering(false);
        console.warn('YouTube fallback failed for track:', track.id);
      }
    }
  };

  const addToQueue = (track: Track) => {
    setQueue(prev => [...prev, track]);
  };

  const removeFromQueue = (trackId: string, index: number) => {
    setQueue(prev => prev.filter((t, i) => !(t.id === trackId && i === index)));
  };

  const reorderQueue = (startIndex: number, endIndex: number) => {
    setQueue(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  };

  const clearQueue = () => {
    setQueue([]);
  };

  const handleNext = () => {
    if (queue.length > 0) {
      const nextTrack = queue[0];
      setQueue(prev => prev.slice(1));
      handlePlay(nextTrack);
      return;
    }

    const tracks = currentContext.length > 0 ? currentContext : trendingTracks;
    if (tracks.length === 0) return;

    const currentIndex = tracks.findIndex(t => t.id === currentTrack.id);
    let nextIndex;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * tracks.length);
    } else {
      nextIndex = (currentIndex + 1) % tracks.length;
    }
    handlePlay(tracks[nextIndex]);
  };

  const handlePrev = () => {
    const tracks = currentContext.length > 0 ? currentContext : trendingTracks;
    if (tracks.length === 0) return;

    const currentIndex = tracks.findIndex(t => t.id === currentTrack.id);
    let prevIndex;
    if (isShuffle) {
      prevIndex = Math.floor(Math.random() * tracks.length);
    } else {
      prevIndex = (currentIndex - 1 + tracks.length) % tracks.length;
    }
    handlePlay(tracks[prevIndex]);
  };

  // Media Session API for background playback and lock screen controls
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: 'POSTOR',
        artwork: [
          { src: currentTrack.coverUrl, sizes: '96x96', type: 'image/png' },
          { src: currentTrack.coverUrl, sizes: '128x128', type: 'image/png' },
          { src: currentTrack.coverUrl, sizes: '192x192', type: 'image/png' },
          { src: currentTrack.coverUrl, sizes: '256x256', type: 'image/png' },
          { src: currentTrack.coverUrl, sizes: '384x384', type: 'image/png' },
          { src: currentTrack.coverUrl, sizes: '512x512', type: 'image/png' },
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler('previoustrack', handlePrev);
      navigator.mediaSession.setActionHandler('nexttrack', handleNext);
      navigator.mediaSession.setActionHandler('seekbackward', () => {
        const newTime = Math.max(0, audio.currentTime - 10);
        audio.currentTime = newTime;
      });
      navigator.mediaSession.setActionHandler('seekforward', () => {
        const newTime = Math.min(audio.duration, audio.currentTime + 10);
        audio.currentTime = newTime;
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        setIsPlaying(false);
        audio.currentTime = 0;
      });
    }
  }, [currentTrack, handleNext, handlePrev]);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    }
  }, [isPlaying]);

  const toggleLike = (track: Track) => {
    setLikedTracks(prev => {
      const isLiked = prev.some(t => t.id === track.id);
      if (isLiked) {
        return prev.filter(t => t.id !== track.id);
      } else {
        return [track, ...prev];
      }
    });
  };

  const handleSearch = async (e?: React.FormEvent, queryOverride?: string) => {
    if (e) e.preventDefault();
    const query = queryOverride || searchQuery;
    if (queryOverride) setSearchQuery(queryOverride);
    
    if (query.trim()) {
      setIsLoading(true);
      setRecentSearches(prev => [query, ...prev.filter(s => s !== query)].slice(0, 10));
      
      let results: Track[] = [];
      try {
        if (selectedSource === 'All') {
          const [scResults, ytResults] = await Promise.allSettled([
            soundcloud.searchTracks(query),
            youtube.searchTracks(query)
          ]);
          
          if (scResults.status === 'fulfilled') results = [...results, ...scResults.value];
          if (ytResults.status === 'fulfilled') results = [...results, ...ytResults.value];
        } else if (selectedSource === 'SoundCloud') {
          results = await soundcloud.searchTracks(query);
        } else if (selectedSource === 'YouTube') {
          results = await youtube.searchTracks(query);
        }
      } catch (error) {
        console.error('Search error:', error);
      }
      
      setSearchResults(results);
      setIsLoading(false);
    }
  };

  // Auto-search on source change if query exists
  useEffect(() => {
    if (searchQuery.trim() && screen === 'search') {
      handleSearch();
    }
  }, [selectedSource]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        handleSearch();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [searchQuery, selectedSource]);

  const handleShuffleAll = () => {
    if (likedTracks.length > 0) {
      const randomTrack = likedTracks[Math.floor(Math.random() * likedTracks.length)];
      setIsShuffle(true);
      handlePlay(randomTrack, likedTracks);
    }
  };

  const filteredResults = searchResults.filter(track => {
    const matchesSource = selectedSource === 'All' || 
                         (selectedSource === 'SoundCloud' && track.source === 'soundcloud') ||
                         (selectedSource === 'YouTube' && track.source === 'youtube');
    
    return matchesSource;
  });

  return (
    <div className="min-h-screen bg-background text-on-surface font-body selection:bg-primary selection:text-on-primary overflow-x-hidden">
      {/* Background Immersive Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background"></div>
        {currentTrack && (
          <motion.img 
            key={currentTrack.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ duration: 1 }}
            className="w-full h-full object-cover blur-[100px] scale-150" 
            src={currentTrack.coverUrl} 
            alt=""
            referrerPolicy="no-referrer"
          />
        )}
      </div>

      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-primary text-on-primary px-6 py-3 rounded-full shadow-2xl font-bold text-sm animate-in fade-in slide-in-from-top-4">
          {toastMessage}
        </div>
      )}

      {/* Global Header */}
      {screen !== 'player' && <Header />}

      <main className="relative z-10 pt-24 md:pt-32 px-4 md:px-6 max-w-[1600px] mx-auto min-h-screen">
        <AnimatePresence mode="wait">
          {screen === 'home' && (
            <HomeScreen 
              key="home" 
              onPlay={(t) => handlePlay(t, recentlyPlayed)} 
              recentlyPlayed={recentlyPlayed}
              likedTracks={likedTracks}
              onLike={toggleLike}
              onAddToPlaylist={(track) => setTrackToAddToPlaylist(track)}
              onAddToQueue={addToQueue}
              onContextMenu={handleContextMenu}
            />
          )}
          {screen === 'search' && (
            <SearchScreen 
              key="search" 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedSource={selectedSource}
              setSelectedSource={setSelectedSource}
              recentSearches={recentSearches}
              onSearch={handleSearch}
              onClearRecent={() => setRecentSearches([])}
              results={filteredResults}
              isLoading={isLoading}
              onPlay={(t) => handlePlay(t, filteredResults)}
              likedTracks={likedTracks}
              onLike={toggleLike}
              onAddToPlaylist={(track) => setTrackToAddToPlaylist(track)}
              onAddToQueue={addToQueue}
              showToast={showToast}
              onContextMenu={handleContextMenu}
            />
          )}
          {screen === 'queue' && (
            <QueueView
              queue={queue}
              currentTrack={currentTrack}
              currentContext={currentContext}
              trendingTracks={trendingTracks}
              onBack={() => setScreen('player')}
              onPlay={(track, index) => {
                const newQueue = queue.filter((_, i) => i !== index);
                setQueue(newQueue);
                handlePlay(track);
              }}
              onRemove={removeFromQueue}
              onReorder={reorderQueue}
              onClear={clearQueue}
              onContextMenu={handleContextMenu}
            />
          )}
          {screen === 'library' && (
            <LibraryScreen 
              key="library" 
              onPlay={(t) => handlePlay(t, likedTracks)} 
              onShuffleAll={handleShuffleAll}
              likedTracks={likedTracks}
              playlists={playlists}
              onSelectPlaylist={(p) => {
                setActivePlaylist(p);
                navigateTo('playlist');
              }}
              onCreatePlaylist={createPlaylist}
              onAddToQueue={addToQueue}
              onContextMenu={handleContextMenu}
            />
          )}
          {screen === 'playlist' && activePlaylist && (
            <PlaylistView
              key="playlist"
              playlist={activePlaylist}
              onPlay={(track) => {
                handlePlay(track, activePlaylist.tracks);
              }}
              onRemoveTrack={(playlistId, trackId) => removeFromPlaylist(playlistId, trackId)}
              onReorder={(playlistId, start, end) => reorderPlaylist(playlistId, start, end)}
              onDeletePlaylist={(id) => deletePlaylist(id)}
              onUpdateCover={updatePlaylistCover}
              onAddToQueue={addToQueue}
              onBack={() => setScreen('library')}
              onContextMenu={handleContextMenu}
            />
          )}
        </AnimatePresence>

        <div className={screen === 'player' ? 'contents' : 'fixed -top-[9999px] -left-[9999px] w-[1px] h-[1px] overflow-hidden opacity-0 pointer-events-none'}>
          <PlayerScreen 
            key="player" 
            track={currentTrack} 
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            isShuffle={isShuffle}
            setIsShuffle={setIsShuffle}
            isRepeat={isRepeat}
            setIsRepeat={setIsRepeat}
            playbackRate={playbackRate}
            setPlaybackRate={setPlaybackRate}
            isLiked={likedTracks.some(t => t.id === currentTrack.id)}
            onLike={() => toggleLike(currentTrack)}
            onAddToPlaylist={() => setTrackToAddToPlaylist(currentTrack)}
            onAddToQueue={() => addToQueue(currentTrack)}
            onNext={handleNext}
            onPrev={handlePrev}
            currentTime={currentTime}
            duration={duration}
            isBuffering={isBuffering}
            setDuration={setDuration}
            onSeek={(time) => { 
              if (currentTrack.source === 'youtube') {
                setCurrentTime(time);
              } else {
                audio.currentTime = time; 
              }
            }}
            volume={volume}
            setVolume={setVolume}
            onOpenEqualizer={() => setIsEqualizerOpen(true)}
            onOpenQueue={() => navigateTo('queue')}
            onBack={() => setScreen(prevScreen)}
            queue={queue}
            currentContext={currentContext}
            trendingTracks={trendingTracks}
            isVisible={screen === 'player'}
          />
        </div>

        <Equalizer 
          isOpen={isEqualizerOpen}
          onClose={() => setIsEqualizerOpen(false)}
          values={equalizerValues}
          setValues={setEqualizerValues}
        />
      </main>

      <AddToPlaylistModal
        isOpen={!!trackToAddToPlaylist}
        onClose={() => setTrackToAddToPlaylist(null)}
        track={trackToAddToPlaylist!}
        playlists={playlists}
        onAdd={addToPlaylist}
        onCreateAndAdd={(title, track) => {
          const newP = createPlaylist(title);
          addToPlaylist(newP.id, track);
        }}
      />

      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="fixed z-[9999] bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[200px] py-2"
            style={{ 
              top: Math.min(contextMenu.y, window.innerHeight - 250), 
              left: Math.min(contextMenu.x, window.innerWidth - 200) 
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="w-full text-left px-4 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors flex items-center gap-3"
              onClick={() => { handlePlay(contextMenu.track); closeContextMenu(); }}
            >
              <Play size={16} /> Play
            </button>
            <button 
              className="w-full text-left px-4 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors flex items-center gap-3"
              onClick={() => { addToQueue(contextMenu.track); closeContextMenu(); }}
            >
              <ListMusic size={16} /> Add to queue
            </button>
            <button 
              className="w-full text-left px-4 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors flex items-center gap-3"
              onClick={() => {
                setQueue(prev => [contextMenu.track, ...prev]);
                showToast('Added to play next');
                closeContextMenu();
              }}
            >
              <SkipForward size={16} /> Play next
            </button>
            <button 
              className="w-full text-left px-4 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors flex items-center gap-3"
              onClick={() => { setTrackToAddToPlaylist(contextMenu.track); closeContextMenu(); }}
            >
              <Plus size={16} /> Add to playlist
            </button>
            <button 
              className="w-full text-left px-4 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors flex items-center gap-3"
              onClick={() => { toggleLike(contextMenu.track); closeContextMenu(); }}
            >
              <Heart size={16} fill={likedTracks.some(t => t.id === contextMenu.track.id) ? "currentColor" : "none"} className={likedTracks.some(t => t.id === contextMenu.track.id) ? "text-primary" : ""} /> 
              {likedTracks.some(t => t.id === contextMenu.track.id) ? 'Remove from favorites' : 'Add to favorites'}
            </button>
            {contextMenu.context?.type === 'favorites' && (
              <button 
                className="w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-white/10 transition-colors flex items-center gap-3"
                onClick={() => { toggleLike(contextMenu.track); closeContextMenu(); }}
              >
                <Trash2 size={16} /> Remove
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {screen !== 'player' && currentTrack && (
          <MiniPlayer 
            track={currentTrack}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            onNext={handleNext}
            setScreen={navigateTo}
            currentTime={currentTime}
            duration={duration}
          />
        )}
      </AnimatePresence>

      <BottomNav 
        activeScreen={screen} 
        setScreen={navigateTo} 
        isVisible={isNavVisible && screen !== 'player'}
        setIsVisible={setIsNavVisible}
      />

      {/* Decorative Lines */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-px h-full bg-white/5"></div>
        <div className="absolute top-0 left-2/4 w-px h-full bg-white/5"></div>
        <div className="absolute top-0 left-3/4 w-px h-full bg-white/5"></div>
        <div className="absolute top-1/4 left-0 w-full h-px bg-white/5"></div>
        <div className="absolute top-2/4 left-0 w-full h-px bg-white/5"></div>
        <div className="absolute top-3/4 left-0 w-full h-px bg-white/5"></div>
      </div>
    </div>
  );
}
