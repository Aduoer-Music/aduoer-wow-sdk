import type { Request } from 'express';
import type {
  AlbumDetail,
  AlbumPage,
  ArtistDetail,
  ArtistPage,
  MutationStatus,
  MutationSuccess,
  Playlist,
  PlaylistCategory,
  PlaylistDetail,
  PlaylistPage,
  QualityOption,
  SearchSuggest,
  ToplistGroup,
  Track,
  TrackLyrics,
  TrackUrl,
  TrackPage,
  UserProfile
} from './schemas';

export interface WowAdapter {
  getPlaylists?(offset: number, limit: number, category?: string): Promise<PlaylistPage>;
  getPlaylistCategories?(): Promise<PlaylistCategory[]>;
  getToplist?(): Promise<ToplistGroup[]>;
  getToplistTracks?(id: string, offset: number, limit: number): Promise<PlaylistDetail>;
  getNewTracks?(): Promise<Track[]>;
  getTopArtists?(): Promise<ArtistPage['items']>;
  getRecommendedPlaylist?(offset: number, limit: number): Promise<PlaylistPage>;
  getPlaylistDetail?(id: string, trackLimit?: number): Promise<PlaylistDetail>;
  createPlaylist?(name: string): Promise<Playlist>;
  deletePlaylist?(id: string): Promise<MutationSuccess>;
  updatePlaylist?(id: string, name: string, description: string): Promise<Playlist>;
  addTrackToPlaylist?(playlistId: string, trackId: string): Promise<MutationSuccess>;
  removeTrack?(playlistId: string, trackId: string): Promise<MutationSuccess>;
  favoritePlaylist?(id: string, status: boolean): Promise<MutationStatus>;
  getTrackDetail?(id: string): Promise<Track>;
  getSimilarTracks?(id: string): Promise<Track[]>;
  getTrackUrl?(id: string, quality?: string): Promise<TrackUrl>;
  getTrackLyric?(id: string): Promise<TrackLyrics>;
  favoriteTrack?(id: string, status: boolean): Promise<MutationStatus>;
  getDailyTracks?(): Promise<Track[]>;
  getPersonalFM?(): Promise<Track[]>;
  searchSuggest?(keyword: string): Promise<SearchSuggest>;
  searchTracks?(keyword: string, offset: number, limit: number): Promise<TrackPage>;
  searchArtists?(keyword: string, offset: number, limit: number): Promise<ArtistPage>;
  searchAlbums?(keyword: string, offset: number, limit: number): Promise<AlbumPage>;
  searchPlaylists?(keyword: string, offset: number, limit: number): Promise<PlaylistPage>;
  getArtistDetail?(id: string, trackLimit?: number): Promise<ArtistDetail>;
  getArtistTracks?(id: string, order: string, offset: number, limit: number): Promise<TrackPage>;
  getArtistAlbums?(id: string, offset: number, limit: number): Promise<AlbumPage>;
  getAlbumDetail?(id: string, trackLimit?: number): Promise<AlbumDetail>;
  getUserPlaylist?(): Promise<Playlist[]>;
  userFavoriteTracks?(): Promise<Track[]>;
  getUserMe?(): Promise<UserProfile>;
}

export interface WowRequestContext {
  adapter: WowAdapter;
  qualityMap?: QualityOption[];
  accountName?: string;
  stateless?: boolean;
}

export interface ResolveContextInput {
  authorization?: string;
  request: Request;
}

export type ResolveWowContext = (
  input: ResolveContextInput
) => WowRequestContext | null | Promise<WowRequestContext | null>;

const capabilityMethods = {
  playlists: ['getPlaylists'],
  playlistCategory: ['getPlaylistCategories'],
  playlistMutation: ['createPlaylist', 'deletePlaylist', 'updatePlaylist', 'addTrackToPlaylist', 'removeTrack'],
  playlistFavorite: ['favoritePlaylist'],
  toplist: ['getToplist'],
  toplistTracks: ['getToplistTracks'],
  newTracks: ['getNewTracks'],
  topArtists: ['getTopArtists'],
  songDetail: ['getTrackDetail'],
  similarTracks: ['getSimilarTracks'],
  songUrl: ['getTrackUrl'],
  lyrics: ['getTrackLyric'],
  streaming: ['getTrackUrl'],
  search: ['searchTracks', 'searchArtists', 'searchAlbums', 'searchPlaylists'],
  artistDetail: ['getArtistDetail'],
  albumDetail: ['getAlbumDetail'],
  trackFavorite: ['favoriteTrack'],
  favoriteTracks: ['userFavoriteTracks'],
  userPlaylists: ['getUserPlaylist'],
  userProfile: ['getUserMe'],
  personalFM: ['getPersonalFM'],
  dailyTracks: ['getDailyTracks']
} as const;

const statefulCapabilities = new Set([
  'playlistMutation',
  'playlistFavorite',
  'trackFavorite',
  'favoriteTracks',
  'userPlaylists',
  'userProfile'
]);

export function inferCapabilities(adapter: WowAdapter, stateless = true): string[] {
  return Object.entries(capabilityMethods)
    .filter(([, methods]) => methods.every((method) => typeof adapter[method as keyof WowAdapter] === 'function'))
    .filter(([capability]) => !stateless || !statefulCapabilities.has(capability))
    .map(([capability]) => capability);
}
