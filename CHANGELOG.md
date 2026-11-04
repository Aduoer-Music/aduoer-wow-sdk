# aduoer-wow-sdk

## 0.4.1

### Patch Changes

- 新增独立的 `/artist/list` 分页接口与 `getArtists` Adapter 方法。旧 `/artist/top` 标记弃用，保持原有行为。

## 0.4.0

### Minor Changes

- 歌曲新增可选的 `coverUrl` 和 `animatedCoverUrl`，声明动态封面、歌曲静态封面、专辑静态封面的优先级与加载失败回退规则，保留旧客户端的 `album.coverUrl`。
- 收藏歌曲和添加歌单支持逗号分隔的批量参数，响应仅返回失败 ID。保留单 ID 参数及响应，并在同时传参时优先单 ID。Adapter 可提供原生批量实现；未提供时 SDK 逐首处理并隔离失败。

## 0.3.5

### Patch Changes

- Track 新增可选正整数 `discNumber` 和 `trackNumber`，分别表示从 1 开始的碟号和碟内曲号。

## 0.3.4

### Patch Changes

- 歌单和歌单详情新增必填 favorite，表示当前账号的收藏状态；删除未使用的 favoriteCount。自己的歌单应返回 false，已收藏的非自建歌单返回 true。所有歌单响应必须同步更新。

## 0.3.3

### Patch Changes

- 歌曲、艺人、专辑、歌单及详情新增可选 `fromLabel` 来源标签，补充客户端展示规则与单来源使用建议

## 0.3.2

### Patch Changes

- 0db497b: 分别声明 searchTracks、searchArtists、searchAlbums、searchPlaylists 和 searchSuggest 能力，移除聚合 search 标识，并在 README 列出全部能力及其实现条件
- 将歌曲漫游能力 trackRoam 重命名为 roamTracks，对应 Adapter 方法 getTrackRoam 改为 getRoamTracks；HTTP 路径 GET /v1/track/roam 保持不变，源项目需要同步更新方法实现

## 0.3.1

### Patch Changes

- 新增艺人、专辑收藏写入及当前账号收藏列表四个基础接口，不新增 capability 声明，未实现返回 HTTP 501。
- 艺人和专辑模型新增可选 `favorite` 状态，同步 OpenAPI 和接入文档。

## 0.3.0

### Minor Changes

- 585658f: 为歌单详情增加可选的 `sort` 和 `order` 参数，并通过状态接口的 `playlistSortOptions` 声明音乐源支持的排序字段。

## 0.2.0

### Minor Changes

- dcaf7a3: 移除用户资料响应中的 VIP 字段，会员展示由 Aduoer App 自身的 Pro 订阅状态决定。
- 歌曲漫游升级：新增 `/v1/track/roam` 和 `getTrackRoam`，能力名为 `trackRoam`，旧 `/v1/track/fm` 保留为永久重定向。

## 0.1.4

### Patch Changes

- 统一歌词响应字段为 `lyrics`、`wordLyrics` 和 `translatedLyrics`，翻译歌词不再区分逐行与逐字格式。新增 `/v1/track/lyrics` 和 `getTrackLyrics`，旧 `/v1/track/lyric` 保留为永久重定向兼容入口。

## 0.1.3

### Patch Changes

- 6fd1d2d: 修正直接调用能力推断时的默认无状态行为，避免暴露用户数据能力。
- 新增 `/v1/track/similar?id=` 相似歌曲接口、Adapter 方法和能力声明。

## 0.1.2

### Patch Changes

- 在状态响应中增加默认开启的 `stateless` 标识，并统一限制无状态源的用户资料、歌单和收藏接口。

## 0.1.1

### Patch Changes

- f06cefb: 让 `createWowRouter()` 自带 `/v1` 路由前缀。源项目现在应直接将返回的 Router 挂载到应用根节点，为后续独立的 V2 Router 保留版本边界。同时统一歌曲地址、歌词和榜单摘要模型命名，并为请求参数、请求体、响应模型及字段补充 OpenAPI 说明。
