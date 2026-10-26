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

## 歌曲位置

`Track` 支持以下可选字段，未知时省略。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `discNumber` | 正整数 | 碟号，从 1 开始 |
| `trackNumber` | 正整数 | 当前碟内的曲号，从 1 开始 |

## 条目来源标签

歌曲、艺人、专辑、歌单及对应详情支持可选的 `fromLabel?: string | null`。只有包含多个来源的 Wow 音源才应按条目提供标签，例如 `fromLabel: '来源 A'`；如果 Wow 只有一个来源，请勿提供此参数，否则可能干扰客户端展示

建议标签不超过 10 字符（ASCII 算 1，其余字符算 2），这只是建议，不做硬性长度校验。客户端显示为 `客户端音源名称-fromLabel`，两段共用 16 字符预算，连接短横线不计数。超限先截源名称，最短保留 6 字符；仍超限再截标签。原名称不足 6 字符时保留原名称

省略、`null`、空字符串或纯空白均不展示额外标签；聚合源保留客户端音源名称，非聚合源不显示来源标签

## Capabilities

`GET /v1/status` 的 `data.capabilities` 根据当前请求上下文中的 Adapter 方法自动生成，无需手动维护能力清单

歌曲漫游能力使用 `roamTracks`，对应 SDK Adapter 方法为 `getRoamTracks()`，HTTP 路径为 `GET /v1/track/roam`；SDK 0.3.2 起替代旧的 `trackRoam` 和 `getTrackRoam()`

当前 SDK 可生成的全部能力如下

| 能力标识 | 用途 | 适用源 |
| --- | --- | --- |
| `playlists` | 歌单列表 | 全部源 |
| `playlistCategory` | 歌单分类 | 全部源 |
| `playlistMutation` | 创建、删除、编辑歌单及增删歌曲 | 仅有状态源 |
| `playlistFavorite` | 收藏或取消收藏歌单 | 仅有状态源 |
| `toplist` | 排行榜列表 | 全部源 |
| `toplistTracks` | 排行榜歌曲 | 全部源 |
| `newTracks` | 新歌 | 全部源 |
| `topArtists` | 热门艺人 | 全部源 |
| `songDetail` | 歌曲详情 | 全部源 |
| `similarTracks` | 相似歌曲 | 全部源 |
| `songUrl` | 歌曲播放地址 | 全部源 |
| `lyrics` | 歌词 | 全部源 |
| `streaming` | 歌曲流媒体播放（与 songUrl 使用同一方法） | 全部源 |
| `searchSuggest` | 搜索建议 | 全部源 |
| `searchTracks` | 歌曲搜索 | 全部源 |
| `searchArtists` | 艺人搜索 | 全部源 |
| `searchAlbums` | 专辑搜索 | 全部源 |
| `searchPlaylists` | 歌单搜索 | 全部源 |
| `artistDetail` | 艺人详情 | 全部源 |
| `albumDetail` | 专辑详情 | 全部源 |
| `trackFavorite` | 收藏或取消收藏歌曲 | 仅有状态源 |
| `favoriteTracks` | 用户收藏歌曲 | 仅有状态源 |
| `userPlaylists` | 用户歌单 | 仅有状态源 |
| `userProfile` | 当前用户资料 | 仅有状态源 |
| `roamTracks` | 歌曲漫游 | 全部源 |
| `dailyTracks` | 每日推荐歌曲 | 全部源 |

`stateless` 默认是 `true`，此时“仅有状态源”的能力即使实现了方法也不会出现在列表中。只有 `resolveContext` 返回 `stateless: false` 才会声明这些能力

能力检测只检查方法是否为函数，不会调用方法验证上游是否可用。请仅实现源真实支持的方法，避免用始终抛错或空结果的占位方法声明能力。能力列表不是所有接口的清单，未参与推断的基础接口仍可直接调用，未实现时返回 HTTP 501

## OpenAPI 文档

SDK 在构建时从 TypeBox Schema 生成 `openapi.json`。每次 `main` 分支更新后，GitHub Actions 会更新 [`openapi-latest` Release](https://docs.aduoer.app/development/api-reference) 中的 `openapi.json`，供文档站构建时下载。
