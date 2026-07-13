---
'aduoer-wow-sdk': patch
---

让 `createWowRouter()` 自带 `/v1` 路由前缀。源项目现在应直接将返回的 Router 挂载到应用根节点，为后续独立的 V2 Router 保留版本边界。同时统一歌曲地址、歌词和榜单摘要模型命名，并为请求参数、请求体、响应模型及字段补充 OpenAPI 说明。
