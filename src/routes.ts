import type { Request } from 'express';
import { Type, type TSchema } from '@sinclair/typebox';
import type { WowAdapter, WowRequestContext } from './adapter';
import { BadRequestError, UnsupportedFeatureError } from './errors';
import type { MutationFailure, schemas } from './schemas';
import { sdkVersion } from './version';

export type SchemaName = keyof typeof schemas;

export interface ParameterSpec {
  name: string;
  in: 'query';
  required?: boolean;
  description?: string;
  schema: Record<string, unknown>;
}

export interface WowRouteDefinition {
  method: 'get' | 'post';
  path: string;
  summary: string;
  tag: string;
  response: SchemaName;
  responseArray?: boolean;
  parameters?: ParameterSpec[];
  bodySchema?: TSchema;
  requiresStateful?: boolean;
  run(context: WowRequestContext, request: Request): Promise<unknown>;
}

export interface WowRedirectDefinition {
  method: 'get';
  path: string;
  target: string;
  summary: string;
  tag: string;
  parameters?: ParameterSpec[];
}

const paginationParams: ParameterSpec[] = [
  { name: 'offset', in: 'query', description: '相对于结果集起点的偏移量，从 0 开始。', schema: { type: 'integer', minimum: 0, default: 0 } },
  { name: 'limit', in: 'query', description: '本次请求期望返回的最大数量；具体上限由接口决定。', schema: { type: 'integer', minimum: 1, default: 20 } }
];

const idParam = (resourceName: string): ParameterSpec => ({
  name: 'id',
  in: 'query',
  required: true,
  description: `${resourceName}在当前音乐平台中的唯一标识。`,
  schema: { type: 'string', minLength: 1 }
});

const trackLimitParam: ParameterSpec = {
  name: 'trackLimit',
  in: 'query',
  description: '详情中最多附带的歌曲数量；-1 表示由音乐源决定或不限制。',
  schema: { type: 'integer', minimum: -1, maximum: 1000, default: -1 }
};

const keywordParam: ParameterSpec = {
  name: 'keyword',
  in: 'query',
  required: true,
  description: '用于搜索或获取搜索建议的关键词。',
  schema: { type: 'string', minLength: 1 }
};

const nameBody = Type.Object({
  name: Type.String({ minLength: 1, description: '要创建的歌单名称。' })
}, { description: '创建歌单所需参数。', additionalProperties: false });
const idBody = Type.Object({
  id: Type.String({ minLength: 1, description: '要删除的歌单在当前音乐平台中的唯一标识。' })
}, { description: '删除歌单所需参数。', additionalProperties: false });
const updatePlaylistBody = Type.Object({
  id: Type.String({ minLength: 1, description: '要更新的歌单在当前音乐平台中的唯一标识。' }),
  name: Type.String({ minLength: 1, description: '更新后的歌单名称。' }),
  description: Type.String({ description: '更新后的歌单简介；传空字符串可清空简介。' })
}, { description: '更新歌单所需参数。', additionalProperties: false });
const playlistTrackBody = Type.Object({
  playlistId: Type.String({ minLength: 1, description: '目标歌单在当前音乐平台中的唯一标识。' }),
  trackId: Type.String({ minLength: 1, description: '要添加或移除的歌曲在当前音乐平台中的唯一标识。' })
}, { description: '修改歌单歌曲所需参数。', additionalProperties: false });
const favoriteBody = (resourceName: string) => Type.Object({
  id: Type.String({ minLength: 1, description: `${resourceName}在当前音乐平台中的唯一标识。` }),
  status: Type.Boolean({ description: '目标收藏状态；true 表示收藏，false 表示取消收藏。' })
}, { description: `修改${resourceName}收藏状态所需参数。`, additionalProperties: false });

const addPlaylistTracksBody = Type.Object({
  playlistId: Type.String({ minLength: 1, description: '目标歌单 ID。' }),
  trackId: Type.Optional(Type.String({ minLength: 1, description: '单曲 ID；与 trackIds 同时提供时优先使用。' })),
  trackIds: Type.Optional(Type.String({ minLength: 1, description: '批量歌曲 ID，用逗号分隔；单首也可使用此参数。' }))
}, { description: 'trackId、trackIds 至少提供一个；单曲结果保持不变，批量结果只返回失败 ID。', additionalProperties: false });

const favoriteTracksBody = Type.Object({
  id: Type.Optional(Type.String({ minLength: 1, description: '单曲 ID；与 ids 同时提供时优先使用。' })),
  ids: Type.Optional(Type.String({ minLength: 1, description: '批量歌曲 ID，用逗号分隔；单首也可使用此参数。' })),
  status: Type.Boolean({ description: '目标收藏状态。' })
}, { description: 'id、ids 至少提供一个；单曲结果保持不变，批量结果只返回失败 ID。', additionalProperties: false });

function batchIDs(value: unknown, name: string): string[] {
  const ids = stringValue(value, name)!.split(',').map((id) => id.trim());
  if (ids.some((id) => !id)) throw new BadRequestError(`${name} must contain non-empty IDs`);
  return [...new Set(ids)];
}

/** 无原生批量接口的 Adapter 逐首执行并收集失败；不重试，也不因单首失败中断。 */
async function mutateIndividually(ids: string[], mutate: (id: string) => Promise<boolean>): Promise<MutationFailure[]> {
  const failures: MutationFailure[] = [];
  for (const id of ids) {
    try {
      if (!await mutate(id)) failures.push({ id });
    } catch {
      failures.push({ id });
    }
  }
  return failures;
}

type AdapterMethod = keyof WowAdapter;
type AsyncAdapterFunction = (...args: never[]) => Promise<unknown>;

function callAdapter(adapter: WowAdapter, method: AdapterMethod, args: unknown[], feature: string): Promise<unknown> {
  const candidate = adapter[method];
  if (typeof candidate !== 'function') throw new UnsupportedFeatureError(feature);
  return (candidate as AsyncAdapterFunction).apply(adapter, args as never[]);
}

function stringValue(value: unknown, name: string, required = true): string | undefined {
  if (value === undefined || value === null || String(value).trim() === '') {
    if (required) throw new BadRequestError(`${name} is required`);
    return undefined;
  }
  return String(value).trim();
}

function integerValue(value: unknown, name: string, fallback: number, min: number, max: number): number {
  if (value === undefined) return fallback;
  if (!/^-?\d+$/.test(String(value))) throw new BadRequestError(`${name} must be an integer`);
  const parsed = Number(value);
  if (parsed < min || parsed > max) throw new BadRequestError(`${name} must be between ${min} and ${max}`);
  return parsed;
}

function paging(request: Request, max = 100, defaultLimit = 20): [number, number] {
  return [
    integerValue(request.query.offset, 'offset', 0, 0, Number.MAX_SAFE_INTEGER),
    integerValue(request.query.limit, 'limit', defaultLimit, 1, max)
  ];
}

function bodyString(request: Request, name: string, required = true): string {
  const value = stringValue(request.body?.[name], name, required);
  return value ?? '';
}

function simpleGet(
  path: string,
  summary: string,
  tag: string,
  response: SchemaName,
  method: AdapterMethod,
  feature: string,
  responseArray = false,
  requiresStateful = false
): WowRouteDefinition {
  return {
    method: 'get', path, summary, tag, response, responseArray, requiresStateful,
    run: ({ adapter }) => callAdapter(adapter, method, [], feature)
  };
}

export const wowRoutes: WowRouteDefinition[] = [
  {
    method: 'get', path: '/status', summary: '获取 Wow 源状态、SDK 版本、能力和音质选项', tag: 'status', response: 'Status',
    run: async ({ adapter, qualityMap, playlistSortOptions, stateless }) => {
      const resolvedStateless = stateless ?? true;
      return {
        type: 'wow',
        version: sdkVersion,
        stateless: resolvedStateless,
        capabilities: (await import('./adapter')).inferCapabilities(adapter, resolvedStateless),
        qualityMap: qualityMap ?? [],
        playlistSortOptions: playlistSortOptions ?? []
      };
    }
  },
  {
    method: 'get', path: '/playlist/list', summary: '获取歌单列表', tag: 'playlist', response: 'PlaylistPage',
    parameters: [...paginationParams, { name: 'category', in: 'query', description: '歌单分类标识，可从歌单分类接口获取。', schema: { type: 'string' } }],
    run: ({ adapter }, request) => {
      const [offset, limit] = paging(request, 50);
      return callAdapter(adapter, 'getPlaylists', [offset, limit, stringValue(request.query.category, 'category', false)], 'playlists');
    }
  },
  simpleGet('/playlist/category', '获取歌单分类', 'playlist', 'PlaylistCategory', 'getPlaylistCategories', 'playlistCategory', true),
  simpleGet('/toplist/list', '获取榜单分组', 'discovery', 'ToplistGroup', 'getToplist', 'toplist', true),
  {
    method: 'get', path: '/toplist/detail', summary: '获取榜单歌曲', tag: 'discovery', response: 'PlaylistDetail',
    parameters: [idParam('榜单'), ...paginationParams],
    run: ({ adapter }, request) => {
      const [offset, limit] = paging(request, 200, 100);
      return callAdapter(adapter, 'getToplistTracks', [stringValue(request.query.id, 'id'), offset, limit], 'toplistTracks');
    }
  },
  simpleGet('/track/new', '获取新歌列表', 'discovery', 'Track', 'getNewTracks', 'newTracks', true),
  simpleGet('/artist/top', '获取热门艺人', 'discovery', 'Artist', 'getTopArtists', 'topArtists', true),
  {
    method: 'get', path: '/playlist/recommended', summary: '获取推荐歌单', tag: 'playlist', response: 'PlaylistPage', parameters: paginationParams,
    run: ({ adapter }, request) => {
      const [offset, limit] = paging(request, 50);
      return callAdapter(adapter, 'getRecommendedPlaylist', [offset, limit], 'playlists');
    }
  },
  {
    method: 'get', path: '/playlist/detail', summary: '获取歌单详情', tag: 'playlist', response: 'PlaylistDetail', parameters: [
      idParam('歌单'), trackLimitParam,
      { name: 'sort', in: 'query', description: '排序标识，可从状态接口的 playlistSortOptions 获取。', schema: { type: 'string' } },
      { name: 'order', in: 'query', description: '排序方向。', schema: { type: 'string', enum: ['asc', 'desc'] } }
    ],
    run: ({ adapter, playlistSortOptions }, request) => {
      const sort = stringValue(request.query.sort, 'sort', false);
      const order = stringValue(request.query.order, 'order', false);
      if (sort && !playlistSortOptions?.some((option) => option.key === sort)) throw new BadRequestError('Unsupported sort');
      if (order && order !== 'asc' && order !== 'desc') throw new BadRequestError('Unsupported order');
      if (order && !sort) throw new BadRequestError('sort is required when order is set');
      return callAdapter(adapter, 'getPlaylistDetail', [
        stringValue(request.query.id, 'id'),
        integerValue(request.query.trackLimit, 'trackLimit', -1, -1, 1000),
        sort, order
      ], 'playlists');
    }
  },
  {
    method: 'post', path: '/playlist/create', summary: '创建歌单', tag: 'playlist', response: 'Playlist', bodySchema: nameBody, requiresStateful: true,
    run: ({ adapter }, request) => callAdapter(adapter, 'createPlaylist', [bodyString(request, 'name')], 'playlistMutation')
  },
  {
    method: 'post', path: '/playlist/delete', summary: '删除歌单', tag: 'playlist', response: 'MutationSuccess', bodySchema: idBody, requiresStateful: true,
    run: ({ adapter }, request) => callAdapter(adapter, 'deletePlaylist', [bodyString(request, 'id')], 'playlistMutation')
  },
  {
    method: 'post', path: '/playlist/update', summary: '更新歌单', tag: 'playlist', response: 'Playlist', bodySchema: updatePlaylistBody, requiresStateful: true,
    run: ({ adapter }, request) => callAdapter(adapter, 'updatePlaylist', [
      bodyString(request, 'id'), bodyString(request, 'name'), bodyString(request, 'description', false)
    ], 'playlistMutation')
  },
  {
    method: 'post', path: '/playlist/addTrack', summary: '添加歌曲到歌单', tag: 'playlist', response: 'PlaylistTrackAdditionResult', bodySchema: addPlaylistTracksBody, requiresStateful: true,
    run: async ({ adapter }, request) => {
      const playlistId = bodyString(request, 'playlistId');
      if (request.body.trackId !== undefined) {
        return callAdapter(adapter, 'addTrackToPlaylist', [playlistId, bodyString(request, 'trackId')], 'playlistMutation');
      }
      const ids = batchIDs(request.body.trackIds, 'trackIds');
      if (adapter.addTracksToPlaylist) return adapter.addTracksToPlaylist(playlistId, ids);
      if (!adapter.addTrackToPlaylist) throw new UnsupportedFeatureError('playlistMutation');
      return mutateIndividually(ids, async (id) => (await adapter.addTrackToPlaylist!(playlistId, id)).success);
    }
  },
  {
    method: 'post', path: '/playlist/removeTrack', summary: '从歌单移除歌曲', tag: 'playlist', response: 'MutationSuccess', bodySchema: playlistTrackBody, requiresStateful: true,
    run: ({ adapter }, request) => callAdapter(adapter, 'removeTrack', [bodyString(request, 'playlistId'), bodyString(request, 'trackId')], 'playlistMutation')
  },
  {
    method: 'post', path: '/playlist/favorite', summary: '收藏或取消收藏歌单', tag: 'playlist', response: 'MutationStatus', bodySchema: favoriteBody('歌单'), requiresStateful: true,
    run: ({ adapter }, request) => callAdapter(adapter, 'favoritePlaylist', [bodyString(request, 'id'), request.body.status], 'playlistFavorite')
  },
  {
    method: 'get', path: '/track', summary: '获取歌曲详情', tag: 'track', response: 'Track', parameters: [idParam('歌曲')],
    run: ({ adapter }, request) => callAdapter(adapter, 'getTrackDetail', [stringValue(request.query.id, 'id')], 'songDetail')
  },
  {
    method: 'get', path: '/track/similar', summary: '获取相似歌曲', tag: 'track', response: 'Track', responseArray: true, parameters: [idParam('歌曲')],
    run: ({ adapter }, request) => callAdapter(adapter, 'getSimilarTracks', [stringValue(request.query.id, 'id')], 'similarTracks')
  },
  {
    method: 'get', path: '/track/url', summary: '获取歌曲播放地址', tag: 'track', response: 'TrackUrl',
    parameters: [idParam('歌曲'), { name: 'quality', in: 'query', description: '期望获取的音质标识，可从状态接口的 qualityMap 获取。', schema: { type: 'string' } }],
    run: ({ adapter, qualityMap }, request) => {
      const quality = stringValue(request.query.quality, 'quality', false);
      if (quality && qualityMap && !qualityMap.some((item) => item.key === quality)) throw new BadRequestError('Unsupported quality');
      return callAdapter(adapter, 'getTrackUrl', [stringValue(request.query.id, 'id'), quality], 'songUrl');
    }
  },
  {
    method: 'get', path: '/track/lyrics', summary: '获取歌曲歌词', tag: 'track', response: 'TrackLyrics', parameters: [idParam('歌曲')],
    run: ({ adapter }, request) => callAdapter(adapter, 'getTrackLyrics', [stringValue(request.query.id, 'id')], 'lyrics')
  },
  {
    method: 'post', path: '/track/favorite', summary: '收藏或取消收藏歌曲', tag: 'track', response: 'TrackFavoriteResult', bodySchema: favoriteTracksBody, requiresStateful: true,
    run: async ({ adapter }, request) => {
      const status: boolean = request.body.status;
      if (request.body.id !== undefined) {
        return callAdapter(adapter, 'favoriteTrack', [bodyString(request, 'id'), status], 'trackFavorite');
      }
      const ids = batchIDs(request.body.ids, 'ids');
      if (adapter.favoriteTracks) return adapter.favoriteTracks(ids, status);
      if (!adapter.favoriteTrack) throw new UnsupportedFeatureError('trackFavorite');
      return mutateIndividually(ids, async (id) => {
        const result = await adapter.favoriteTrack!(id, status);
        return result.success && result.status === status;
      });
    }
  },
  simpleGet('/track/daily', '获取每日推荐歌曲', 'discovery', 'Track', 'getDailyTracks', 'dailyTracks', true),
  simpleGet('/track/roam', '获取歌曲漫游歌曲', 'discovery', 'Track', 'getRoamTracks', 'roamTracks', true),
  {
    method: 'get', path: '/search/suggest', summary: '获取搜索建议', tag: 'search', response: 'SearchSuggest', parameters: [keywordParam],
    run: ({ adapter }, request) => callAdapter(adapter, 'searchSuggest', [stringValue(request.query.keyword, 'keyword')], 'search')
  },
  ...([
    ['/search/tracks', '搜索歌曲', 'TrackPage', 'searchTracks'],
    ['/search/artists', '搜索艺人', 'ArtistPage', 'searchArtists'],
    ['/search/albums', '搜索专辑', 'AlbumPage', 'searchAlbums'],
    ['/search/playlists', '搜索歌单', 'PlaylistPage', 'searchPlaylists']
  ] as const).map(([path, summary, response, method]): WowRouteDefinition => ({
    method: 'get', path, summary, tag: 'search', response, parameters: [keywordParam, ...paginationParams],
    run: ({ adapter }, request) => {
      const [offset, limit] = paging(request);
      return callAdapter(adapter, method, [stringValue(request.query.keyword, 'keyword'), offset, limit], 'search');
    }
  })),
  {
    method: 'get', path: '/artist/detail', summary: '获取艺人详情', tag: 'artist', response: 'ArtistDetail', parameters: [idParam('艺人'), trackLimitParam],
    run: ({ adapter }, request) => callAdapter(adapter, 'getArtistDetail', [
      stringValue(request.query.id, 'id'), integerValue(request.query.trackLimit, 'trackLimit', -1, -1, 1000)
    ], 'artistDetail')
  },
  {
    method: 'get', path: '/artist/tracks', summary: '获取艺人歌曲', tag: 'artist', response: 'TrackPage',
    parameters: [idParam('艺人'), { name: 'order', in: 'query', description: '歌曲排序方式；默认按热度排序。', schema: { type: 'string', default: 'hot' } }, ...paginationParams],
    run: ({ adapter }, request) => {
      const [offset, limit] = paging(request, 100, 50);
      return callAdapter(adapter, 'getArtistTracks', [stringValue(request.query.id, 'id'), stringValue(request.query.order, 'order', false) ?? 'hot', offset, limit], 'artistDetail');
    }
  },
  {
    method: 'get', path: '/artist/albums', summary: '获取艺人专辑', tag: 'artist', response: 'AlbumPage', parameters: [idParam('艺人'), ...paginationParams],
    run: ({ adapter }, request) => {
      const [offset, limit] = paging(request, 100, 50);
      return callAdapter(adapter, 'getArtistAlbums', [stringValue(request.query.id, 'id'), offset, limit], 'artistDetail');
    }
  },
  {
    method: 'get', path: '/album/detail', summary: '获取专辑详情', tag: 'album', response: 'AlbumDetail', parameters: [idParam('专辑'), trackLimitParam],
    run: ({ adapter }, request) => callAdapter(adapter, 'getAlbumDetail', [
      stringValue(request.query.id, 'id'), integerValue(request.query.trackLimit, 'trackLimit', -1, -1, 1000)
    ], 'albumDetail')
  },
  {
    method: 'post', path: '/artist/favorite', summary: '收藏或取消收藏艺人', tag: 'artist', response: 'MutationStatus', bodySchema: favoriteBody('艺人'), requiresStateful: true,
    run: ({ adapter }, request) => callAdapter(adapter, 'favoriteArtist', [bodyString(request, 'id'), request.body.status], 'favoriteArtist')
  },
  {
    method: 'post', path: '/album/favorite', summary: '收藏或取消收藏专辑', tag: 'album', response: 'MutationStatus', bodySchema: favoriteBody('专辑'), requiresStateful: true,
    run: ({ adapter }, request) => callAdapter(adapter, 'favoriteAlbum', [bodyString(request, 'id'), request.body.status], 'favoriteAlbum')
  },
  simpleGet('/user/artist/list', '获取当前账号收藏艺人', 'user', 'Artist', 'userArtists', 'userArtists', true, true),
  simpleGet('/user/album/list', '获取当前账号收藏专辑', 'user', 'Album', 'userAlbums', 'userAlbums', true, true),
  simpleGet('/user/playlist/list', '获取当前账号歌单', 'user', 'Playlist', 'getUserPlaylist', 'playlists', true, true),
  simpleGet('/user/favorite/tracks', '获取当前账号收藏歌曲', 'user', 'Track', 'userFavoriteTracks', 'favoriteTracks', true, true),
  simpleGet('/user/me', '获取当前账号资料', 'user', 'UserProfile', 'getUserMe', 'user', false, true)
];

export const wowRedirects: WowRedirectDefinition[] = [
  {
    method: 'get',
    path: '/track/fm',
    target: '/track/roam',
    summary: '兼容旧版歌曲漫游地址',
    tag: 'discovery'
  },
  {
    method: 'get',
    path: '/track/lyric',
    target: '/track/lyrics',
    summary: '兼容旧版歌曲歌词地址',
    tag: 'track',
    parameters: [idParam('歌曲')]
  }
];
