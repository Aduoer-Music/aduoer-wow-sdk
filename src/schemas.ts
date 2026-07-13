import { Static, TSchema, Type } from '@sinclair/typebox';

const nullable = <T extends TSchema>(schema: T, description: string) => (
  Type.Union([schema, Type.Null()], { description })
);

export const QualityOptionSchema = Type.Object({
  key: Type.String({ description: '音质标识，作为歌曲地址接口的 quality 参数值。' }),
  label: Type.String({ description: '面向用户展示的音质名称。' })
}, { $id: 'QualityOption', description: '音乐源支持的音质选项。', additionalProperties: false });

export const StatusSchema = Type.Object({
  type: Type.Literal('wow', { description: '协议类型，固定为 wow。' }),
  version: Type.String({ minLength: 1, description: '当前服务使用的 aduoer-wow-sdk SemVer。' }),
  capabilities: Type.Array(Type.String(), { description: '当前 Adapter 已实现的能力标识列表。' }),
  qualityMap: Type.Optional(Type.Array(QualityOptionSchema, { description: '当前音乐源支持的音质选项；未配置时返回空数组。' }))
}, { $id: 'Status', description: 'Wow 音乐源的运行状态与能力信息。', additionalProperties: false });

export const ArtistSchema = Type.Object({
  id: Type.String({ description: '艺人在当前音乐平台中的唯一标识。' }),
  name: Type.String({ description: '艺人名称。' }),
  coverUrl: Type.Optional(Type.String({ description: '艺人封面图片地址。' }))
}, { $id: 'Artist', description: '艺人的基础信息。', additionalProperties: false });

export const AlbumSchema = Type.Object({
  id: Type.String({ description: '专辑在当前音乐平台中的唯一标识。' }),
  name: Type.String({ description: '专辑名称。' }),
  coverUrl: Type.String({ description: '专辑封面图片地址。' }),
  description: Type.Optional(Type.String({ description: '专辑简介。' })),
  publishTime: Type.Optional(nullable(Type.Number(), '专辑发行时间的 Unix 时间戳（毫秒）；未知时为 null。')),
  genre: Type.Optional(Type.String({ description: '专辑流派。' })),
  language: Type.Optional(Type.String({ description: '专辑主要语言。' })),
  trackCount: Type.Optional(Type.Integer({ minimum: 0, description: '专辑包含的歌曲数量。' })),
  artistName: Type.Optional(Type.String({ description: '专辑主要艺人名称。' }))
}, { $id: 'Album', description: '专辑的基础信息。', additionalProperties: false });

export const QualitySchema = Type.Object({
  key: Type.String({ description: '音质标识，可传给歌曲地址接口的 quality 参数。' }),
  label: Type.String({ description: '面向用户展示的音质名称。' }),
  description: Type.Optional(Type.String({ description: '音质的补充说明。' })),
  bitrate: Type.Optional(nullable(Type.Integer({ minimum: 0 }), '音频码率，单位为 bps；未知时为 null。')),
  format: Type.Optional(Type.String({ description: '音频封装或编码格式，例如 mp3、m4a、flac。' })),
  size: Type.Number({ minimum: 0, description: '音频文件大小，单位为字节。' })
}, { $id: 'Quality', description: '歌曲可用的单个音质信息。', additionalProperties: false });

export const TrackSchema = Type.Object({
  id: Type.String({ description: '歌曲在当前音乐平台中的唯一标识。' }),
  title: Type.String({ description: '歌曲标题。' }),
  artists: Type.Array(ArtistSchema, { description: '参与歌曲的艺人列表。' }),
  album: Type.Intersect([AlbumSchema], { description: '歌曲所属专辑。' }),
  durationMs: Type.Number({ minimum: 0, description: '歌曲时长，单位为毫秒。' }),
  aliases: Type.Optional(Type.Array(Type.String(), { description: '歌曲别名或副标题列表。' })),
  mvId: Type.Optional(nullable(Type.String(), '关联 MV 的平台标识；没有 MV 时为 null。')),
  favorite: Type.Optional(Type.Boolean({ description: '当前账号是否已收藏该歌曲。' })),
  fee: Type.Optional(Type.Boolean({ description: '歌曲是否存在付费或会员播放限制。' })),
  qualities: Type.Optional(Type.Array(QualitySchema, { description: '歌曲可用的音质列表。' }))
}, { $id: 'Track', description: '歌曲详情。', additionalProperties: false });

export const CreatorSchema = Type.Object({
  id: Type.String({ description: '创建者在当前音乐平台中的唯一标识。' }),
  name: Type.String({ description: '创建者昵称。' }),
  avatarUrl: Type.String({ description: '创建者头像地址。' })
}, { $id: 'Creator', description: '歌单创建者信息。', additionalProperties: false });

export const PlaylistSchema = Type.Object({
  id: Type.String({ description: '歌单在当前音乐平台中的唯一标识。' }),
  name: Type.String({ description: '歌单名称。' }),
  description: Type.String({ description: '歌单简介。' }),
  coverUrl: Type.String({ description: '歌单封面图片地址。' }),
  trackCount: Type.Integer({ minimum: 0, description: '歌单包含的歌曲数量。' }),
  playCount: Type.Optional(Type.Number({ minimum: 0, description: '歌单累计播放次数。' })),
  favoriteCount: Type.Optional(Type.Number({ minimum: 0, description: '歌单被收藏的次数。' })),
  tags: Type.Optional(Type.Array(Type.String(), { description: '歌单标签列表。' })),
  creator: Type.Optional(Type.Intersect([CreatorSchema], { description: '歌单创建者。' })),
  createdAt: Type.Optional(nullable(Type.Number(), '歌单创建时间的 Unix 时间戳（毫秒）；未知时为 null。')),
  updatedAt: Type.Optional(nullable(Type.Number(), '歌单最后更新时间的 Unix 时间戳（毫秒）；未知时为 null。'))
}, { $id: 'Playlist', description: '歌单的基础信息。', additionalProperties: false });

export const PlaylistDetailSchema = Type.Object({
  ...PlaylistSchema.properties,
  tracks: Type.Array(TrackSchema, { description: '歌单内的歌曲列表。' })
}, { $id: 'PlaylistDetail', description: '包含歌曲列表的歌单详情。', additionalProperties: false });

export const PlaylistCategorySchema = Type.Object({
  key: Type.String({ description: '分类标识，作为歌单列表接口的 category 参数值。' }),
  label: Type.String({ description: '面向用户展示的分类名称。' })
}, { $id: 'PlaylistCategory', description: '音乐平台提供的歌单分类。', additionalProperties: false });

export const ToplistTrackSummarySchema = Type.Object({
  name: Type.String({ description: '歌曲名称。' }),
  artistName: Type.String({ description: '歌曲主要艺人名称。' })
}, { $id: 'ToplistTrackSummary', description: '榜单列表中用于展示的歌曲摘要。', additionalProperties: false });

export const ToplistSchema = Type.Object({
  id: Type.String({ description: '榜单在当前音乐平台中的唯一标识。' }),
  name: Type.String({ description: '榜单名称。' }),
  coverUrl: Type.String({ description: '榜单封面图片地址。' }),
  updateFrequency: Type.String({ description: '榜单更新频率或更新时间说明。' }),
  tracks: Type.Array(ToplistTrackSummarySchema, { description: '榜单歌曲摘要，通常用于展示前三首歌曲。' }),
  targetType: Type.Optional(Type.String({ description: '音乐平台提供的榜单目标类型。' }))
}, { $id: 'Toplist', description: '单个音乐榜单的摘要信息。', additionalProperties: false });

export const ToplistGroupSchema = Type.Object({
  name: Type.String({ description: '榜单分组名称。' }),
  displayType: Type.Optional(Type.String({ description: '客户端建议采用的榜单展示样式。' })),
  list: Type.Array(ToplistSchema, { description: '该分组包含的榜单列表。' })
}, { $id: 'ToplistGroup', description: '一组具有相同展示分类的音乐榜单。', additionalProperties: false });

export const TrackUrlScheme = Type.Object({
  url: Type.String({ description: '可用于播放或下载歌曲的音频地址。' }),
  quality: Type.String({ description: '实际返回的音质标识。' }),
  format: Type.String({ description: '音频封装或编码格式，例如 mp3、m4a、flac。' }),
  bitrate: nullable(Type.Integer({ minimum: 0 }), '音频码率，单位为 bps；未知时为 null。'),
  size: Type.Number({ minimum: 0, description: '音频文件大小，单位为字节。' })
}, { $id: 'TrackUrl', description: '歌曲播放地址及其音频信息。', additionalProperties: false });

export const TrackLyricsSchema = Type.Object({
  lyric: Type.String({ description: '逐行原文歌词；没有内容时为空字符串。' }),
  wordLyric: Type.String({ description: '逐字原文歌词；没有内容时为空字符串。' }),
  translateLyric: Type.String({ description: '逐行翻译歌词；没有内容时为空字符串。' }),
  translateWordLyric: Type.String({ description: '逐字翻译歌词；没有内容时为空字符串。' })
}, { $id: 'TrackLyrics', description: '歌曲的逐行、逐字及翻译歌词。', additionalProperties: false });

export const ArtistDetailSchema = Type.Object({
  ...ArtistSchema.properties,
  avatarUrl: Type.Optional(Type.String({ description: '艺人头像图片地址。' })),
  description: Type.Optional(Type.String({ description: '艺人简介。' })),
  tracks: Type.Array(TrackSchema, { description: '艺人的代表歌曲列表。' })
}, { $id: 'ArtistDetail', description: '艺人详情及其代表歌曲。', additionalProperties: false });

export const AlbumDetailSchema = Type.Object({
  ...AlbumSchema.properties,
  artist: Type.Optional(Type.Intersect([ArtistSchema], { description: '专辑主要艺人。' })),
  tracks: Type.Array(TrackSchema, { description: '专辑包含的歌曲列表。' })
}, { $id: 'AlbumDetail', description: '专辑详情及其歌曲列表。', additionalProperties: false });

export const SearchSuggestSchema = Type.Object({
  songs: Type.Array(TrackSchema, { description: '匹配关键词的歌曲建议。' }),
  artists: Type.Array(ArtistSchema, { description: '匹配关键词的艺人建议。' }),
  albums: Type.Array(AlbumSchema, { description: '匹配关键词的专辑建议。' })
}, { $id: 'SearchSuggest', description: '搜索框自动补全建议。', additionalProperties: false });

export const UserProfileSchema = Type.Object({
  userId: Type.String({ description: '当前账号在音乐平台中的用户标识。' }),
  nickname: Type.String({ description: '当前账号昵称。' }),
  avatar: Type.String({ description: '当前账号头像地址。' }),
  isVip: Type.Boolean({ description: '当前账号是否具有会员权益。' }),
  platform: Type.String({ description: '当前账号所属音乐平台标识。' })
}, { $id: 'UserProfile', description: '当前认证账号的资料。', additionalProperties: false });

export const MutationStatusSchema = Type.Object({
  success: Type.Boolean({ description: '操作是否执行成功。' }),
  status: Type.Boolean({ description: '操作完成后的目标状态，例如是否已收藏。' })
}, { $id: 'MutationStatus', description: '带有最终状态的写操作结果。', additionalProperties: false });

export const MutationSuccessSchema = Type.Object({
  success: Type.Boolean({ description: '操作是否执行成功。' })
}, { $id: 'MutationSuccess', description: '不包含额外数据的写操作结果。', additionalProperties: false });

export const paginatedSchema = <T extends TSchema>(item: T, id?: string) => Type.Object({
  items: Type.Array(item, { description: '当前页的数据列表。' }),
  offset: Type.Integer({ minimum: 0, description: '当前页相对于结果集起点的偏移量。' }),
  limit: Type.Integer({ minimum: 1, description: '当前请求的最大返回数量。' }),
  hasMore: Type.Boolean({ description: '是否还有更多数据可继续请求。' })
}, { ...(id ? { $id: id } : {}), description: '分页结果。', additionalProperties: false });

export const PlaylistPageSchema = paginatedSchema(PlaylistSchema, 'PlaylistPage');
export const TrackPageSchema = paginatedSchema(TrackSchema, 'TrackPage');
export const ArtistPageSchema = paginatedSchema(ArtistSchema, 'ArtistPage');
export const AlbumPageSchema = paginatedSchema(AlbumSchema, 'AlbumPage');

export const ApiResponseSchema = Type.Object({
  code: Type.Integer({ description: '业务状态码；成功时为 200。' }),
  data: Type.Unknown({ description: '接口返回的数据，具体类型由各接口定义。' })
}, { $id: 'ApiResponse', description: '所有成功响应的统一外层结构。' });

export const ErrorResponseSchema = Type.Object({
  code: Type.Integer({ description: 'HTTP 错误状态码。' }),
  message: Type.String({ description: '便于定位问题的错误说明。' }),
  data: Type.Null({ description: '错误响应不包含业务数据，固定为 null。' })
}, { $id: 'ErrorResponse', description: '所有错误响应的统一结构。', additionalProperties: false });

export const schemas = {
  ApiResponse: ApiResponseSchema,
  ErrorResponse: ErrorResponseSchema,
  QualityOption: QualityOptionSchema,
  Status: StatusSchema,
  Artist: ArtistSchema,
  Album: AlbumSchema,
  Quality: QualitySchema,
  Track: TrackSchema,
  Creator: CreatorSchema,
  Playlist: PlaylistSchema,
  PlaylistDetail: PlaylistDetailSchema,
  PlaylistCategory: PlaylistCategorySchema,
  ToplistTrackSummary: ToplistTrackSummarySchema,
  Toplist: ToplistSchema,
  ToplistGroup: ToplistGroupSchema,
  TrackUrl: TrackUrlScheme,
  TrackLyrics: TrackLyricsSchema,
  ArtistDetail: ArtistDetailSchema,
  AlbumDetail: AlbumDetailSchema,
  SearchSuggest: SearchSuggestSchema,
  UserProfile: UserProfileSchema,
  MutationStatus: MutationStatusSchema,
  MutationSuccess: MutationSuccessSchema,
  PlaylistPage: PlaylistPageSchema,
  TrackPage: TrackPageSchema,
  ArtistPage: ArtistPageSchema,
  AlbumPage: AlbumPageSchema
} as const;

export type QualityOption = Static<typeof QualityOptionSchema>;
export type Status = Static<typeof StatusSchema>;
export type Artist = Static<typeof ArtistSchema>;
export type Album = Static<typeof AlbumSchema>;
export type Quality = Static<typeof QualitySchema>;
export type Track = Static<typeof TrackSchema>;
export type Playlist = Static<typeof PlaylistSchema>;
export type PlaylistDetail = Static<typeof PlaylistDetailSchema>;
export type PlaylistCategory = Static<typeof PlaylistCategorySchema>;
export type ToplistTrackSummary = Static<typeof ToplistTrackSummarySchema>;
export type Toplist = Static<typeof ToplistSchema>;
export type ToplistGroup = Static<typeof ToplistGroupSchema>;
export type TrackUrl = Static<typeof TrackUrlScheme>;
export type TrackLyrics = Static<typeof TrackLyricsSchema>;
export type ArtistDetail = Static<typeof ArtistDetailSchema>;
export type AlbumDetail = Static<typeof AlbumDetailSchema>;
export type SearchSuggest = Static<typeof SearchSuggestSchema>;
export type UserProfile = Static<typeof UserProfileSchema>;
export type MutationStatus = Static<typeof MutationStatusSchema>;
export type MutationSuccess = Static<typeof MutationSuccessSchema>;
export type PlaylistPage = Static<typeof PlaylistPageSchema>;
export type TrackPage = Static<typeof TrackPageSchema>;
export type ArtistPage = Static<typeof ArtistPageSchema>;
export type AlbumPage = Static<typeof AlbumPageSchema>;
