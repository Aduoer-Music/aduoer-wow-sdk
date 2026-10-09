# aduoer-wow-sdk

用于开发 Aduoer Wow 音乐源的公开 TypeScript SDK。SDK 统一维护 `/v1/*` 路由、请求/响应模型、OpenAPI 文档、鉴权上下文、错误包裹和能力检测。

## 安装

```bash
npm install aduoer-wow-sdk express
```

要求 Node.js 22 或更高版本。

## 最小使用方式

```ts
import express from 'express';
import { createWowRouter, type WowAdapter } from 'aduoer-wow-sdk';

const adapter: WowAdapter = {
  async getTrackDetail(id) {
    // 将上游数据转换为 SDK Track。
    throw new Error(`请实现歌曲 ${id}`);
  }
};

const app = express();
app.use(express.json());
app.use(createWowRouter({
  resolveContext: ({ authorization }) => {
    // 鉴权失败时返回 null，SDK 会响应未授权错误。
    if (authorization !== process.env.WOW_API_TOKEN) {
      return null;
    }

    return {
      adapter,
      // 对外声明当前音乐源支持的音质选项。
      qualityMap: [
        { key: 'standard', label: '标准音质' },
        { key: 'lossless', label: '无损音质' }
      ],
      // 仅声明目标服务真实支持的歌单歌曲排序。
      playlistSortOptions: [
        { key: 'title', label: 'Track' },
        { key: 'artist', label: '艺人' }
      ]
    };
  }
}));
app.listen(3000);
```

`createWowRouter()` 自带 `/v1` 路由前缀，不要在 Express 中再次挂载 `/v1`。

`GET /v1/status` 的 `data.version` 始终来自 SDK 自身版本。能力列表根据 Adapter 已实现的方法自动生成。

`qualityMap` 会通过 `GET /v1/status` 返回，同时用于校验获取歌曲地址时传入的 `quality` 参数。

`playlistSortOptions` 也由 `GET /v1/status` 返回。客户端在来源提供排序选项时默认选择首项，并调用 `GET /v1/playlist/detail?sort=<key>&order=asc|desc`；没有排序选项时不传这两个参数。`getPlaylistDetail(id, trackLimit, sort, order)` 从 SDK 接收这两个可选参数，源应在取数时完成排序。

完整教程与 Scalar API Reference 位于 [Aduoer 开发文档](https://aduoer-music.github.io/docs/development/)。

## Capabilities

`GET /v1/status` 的 `data.capabilities` 根据当前请求上下文中的 Adapter 方法自动生成，无需手动维护能力清单

搜索能力分别为 `searchTracks`、`searchArtists`、`searchAlbums`、`searchPlaylists`，实现哪一类就声明哪一类，互不依赖；搜索建议由 `searchSuggest` 单独声明。SDK 不再返回聚合的 `search` 标识，新版 App 应逐项判断能力并只展示、请求支持的搜索分类，源需要升级 SDK 以返回这些独立标识

现有采用固定能力的 Aduoer App 的 Wow 搜索不读取服务端能力，不依赖服务端的 `search` 标识，因此移除该标识不会影响已实现搜索接口的调用。旧版 App 仍可能请求未实现的分类，此时返回 HTTP 501

当前 SDK 可生成的全部能力如下，表中列出的多个方法需要全部实现

| 能力标识 | 用途 | 所需 Adapter 方法 | 适用源 |
| --- | --- | --- | --- |
| `playlists` | 歌单列表 | `getPlaylists` | 全部源 |
| `playlistCategory` | 歌单分类 | `getPlaylistCategories` | 全部源 |
| `playlistMutation` | 创建、删除、编辑歌单及增删歌曲 | `createPlaylist`, `deletePlaylist`, `updatePlaylist`, `addTrackToPlaylist`, `removeTrack` | 仅有状态源 |
| `playlistFavorite` | 收藏或取消收藏歌单 | `favoritePlaylist` | 仅有状态源 |
| `toplist` | 排行榜列表 | `getToplist` | 全部源 |
| `toplistTracks` | 排行榜歌曲 | `getToplistTracks` | 全部源 |
| `newTracks` | 新歌 | `getNewTracks` | 全部源 |
| `topArtists` | 热门艺人 | `getTopArtists` | 全部源 |
| `songDetail` | 歌曲详情 | `getTrackDetail` | 全部源 |
| `similarTracks` | 相似歌曲 | `getSimilarTracks` | 全部源 |
| `songUrl` | 歌曲播放地址 | `getTrackUrl` | 全部源 |
| `lyrics` | 歌词 | `getTrackLyrics` | 全部源 |
| `streaming` | 歌曲流媒体播放（与 songUrl 使用同一方法） | `getTrackUrl` | 全部源 |
| `searchSuggest` | 搜索建议 | `searchSuggest` | 全部源 |
| `searchTracks` | 歌曲搜索 | `searchTracks` | 全部源 |
| `searchArtists` | 艺人搜索 | `searchArtists` | 全部源 |
| `searchAlbums` | 专辑搜索 | `searchAlbums` | 全部源 |
| `searchPlaylists` | 歌单搜索 | `searchPlaylists` | 全部源 |
| `artistDetail` | 艺人详情 | `getArtistDetail` | 全部源 |
| `albumDetail` | 专辑详情 | `getAlbumDetail` | 全部源 |
| `trackFavorite` | 收藏或取消收藏歌曲 | `favoriteTrack` | 仅有状态源 |
| `favoriteTracks` | 用户收藏歌曲 | `userFavoriteTracks` | 仅有状态源 |
| `userPlaylists` | 用户歌单 | `getUserPlaylist` | 仅有状态源 |
| `userProfile` | 当前用户资料 | `getUserMe` | 仅有状态源 |
| `trackRoam` | 歌曲漫游 | `getTrackRoam` | 全部源 |
| `dailyTracks` | 每日推荐歌曲 | `getDailyTracks` | 全部源 |

`stateless` 默认是 `true`，此时“仅有状态源”的能力即使实现了方法也不会出现在列表中。只有 `resolveContext` 返回 `stateless: false` 才会声明这些能力

例如只实现 `searchTracks` 和 `searchSuggest`，搜索相关能力返回 `["searchSuggest", "searchTracks"]`，不会声明艺人、专辑或歌单搜索

能力检测只检查方法是否为函数，不会调用方法验证上游是否可用。请仅实现源真实支持的方法，避免用始终抛错或空结果的占位方法声明能力。能力列表不是所有接口的清单，未参与推断的基础接口仍可直接调用，未实现时返回 HTTP 501

## OpenAPI 文档

SDK 在构建时从 TypeBox Schema 生成 `openapi.json`。每次 `main` 分支更新后，GitHub Actions 会更新 [`openapi-latest` Release](https://github.com/Aduoer-Music/aduoer-wow-sdk/releases/tag/openapi-latest) 中的 `openapi.json`，供文档站构建时下载。

## 艺人和专辑收藏

基础接口不参与 capabilities 推断，未实现返回 HTTP 501：

- `POST /v1/artist/favorite` → `favoriteArtist(id, status)`
- `POST /v1/album/favorite` → `favoriteAlbum(id, status)`
- `GET /v1/user/artist/list` → `userArtists(): Promise<Artist[]>`
- `GET /v1/user/album/list` → `userAlbums(): Promise<Album[]>`

写入 body 为 `{ id, status }`，返回 `MutationStatus`；查询返回当前账号的完整收藏列表。
`Artist` 和 `Album`（包括详情）提供可选 `favorite` 状态。这些服务端路由沿用有状态用户数据规则；无状态源的收藏由客户端维护。
