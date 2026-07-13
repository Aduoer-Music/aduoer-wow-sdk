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
      ]
    };
  }
}));
app.listen(3000);
```

`createWowRouter()` 自带 `/v1` 路由前缀，不要在 Express 中再次挂载 `/v1`。

`GET /v1/status` 的 `data.version` 始终来自 SDK 自身版本。能力列表根据 Adapter 已实现的方法自动生成。

`qualityMap` 会通过 `GET /v1/status` 返回，同时用于校验获取歌曲地址时传入的 `quality` 参数。

完整教程与 Scalar API Reference 位于 [aduoer-wow-template](https://github.com/Aduoer-Music/aduoer-wow-template)。
