# aduoer-wow-sdk

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
