import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import {
  createWowRouter,
  inferCapabilities,
  openApiDocument,
  sdkVersion,
  type Track,
  type WowAdapter
} from '../src';

const track: Track = {
  id: 'track-1',
  title: '示例歌曲',
  artists: [{ id: 'artist-1', name: '示例艺人' }],
  album: { id: 'album-1', name: '示例专辑', coverUrl: 'https://example.com/cover.jpg' },
  durationMs: 180_000,
  favorite: false,
  qualities: []
};

function createApp(adapter: WowAdapter, token = 'test-token', stateless?: boolean) {
  const app = express();
  app.use(express.json());
  app.use(createWowRouter({
    resolveContext: ({ authorization }) => authorization === token ? { adapter, stateless } : null,
    validateResponses: true
  }));
  return app;
}

describe('createWowRouter', () => {
  it('能力推断默认按无状态源过滤用户数据能力', () => {
    const capabilities = inferCapabilities({
      getUserPlaylist: async () => [],
      favoriteTrack: async (_id, status) => ({ success: true, status })
    });

    expect(capabilities).not.toContain('userPlaylists');
    expect(capabilities).not.toContain('trackFavorite');
  });

  it('由 SDK 自己提供 /v1 前缀', async () => {
    await request(createApp({}))
      .get('/status')
      .set('Authorization', 'test-token')
      .expect(404);

    await request(createApp({}))
      .get('/v1/status')
      .set('Authorization', 'test-token')
      .expect(200);
  });

  it('status 返回 SDK SemVer 且不包含 apiVersion', async () => {
    const response = await request(createApp({ getTrackDetail: async () => track }))
      .get('/v1/status')
      .set('Authorization', 'test-token')
      .expect(200);

    expect(response.body).toEqual({
      code: 200,
      data: {
        type: 'wow',
        version: sdkVersion,
        stateless: true,
        capabilities: ['songDetail'],
        qualityMap: []
      }
    });
    expect(response.body.data).not.toHaveProperty('apiVersion');
  });

  it('缺少 Authorization 返回规范化 401', async () => {
    const response = await request(createApp({}))
      .get('/v1/status')
      .expect(401);

    expect(response.body).toEqual({
      code: 401,
      message: 'Authorization token 无效或未提供',
      data: null
    });
  });

  it('调用未实现能力返回 501', async () => {
    const response = await request(createApp({}))
      .get('/v1/track?id=track-1')
      .set('Authorization', 'test-token')
      .expect(501);

    expect(response.body.code).toBe(501);
    expect(response.body.data).toBeNull();
  });

  it('无状态源拒绝用户数据接口且过滤相关能力', async () => {
    const adapter: WowAdapter = {
      getUserPlaylist: async () => [],
      favoriteTrack: async (_id, status) => ({ success: true, status })
    };
    const app = createApp(adapter);

    const status = await request(app)
      .get('/v1/status')
      .set('Authorization', 'test-token')
      .expect(200);
    expect(status.body.data.stateless).toBe(true);
    expect(status.body.data.capabilities).not.toContain('trackFavorite');
    expect(status.body.data.capabilities).not.toContain('userPlaylists');

    await request(app)
      .get('/v1/user/playlist/list')
      .set('Authorization', 'test-token')
      .expect(501);
  });

  it('有状态源保留用户数据接口', async () => {
    const app = createApp({ getUserPlaylist: async () => [] }, 'test-token', false);

    const status = await request(app)
      .get('/v1/status')
      .set('Authorization', 'test-token')
      .expect(200);
    expect(status.body.data.stateless).toBe(false);
    expect(status.body.data.capabilities).toContain('userPlaylists');

    await request(app)
      .get('/v1/user/playlist/list')
      .set('Authorization', 'test-token')
      .expect(200);
  });

  it('校验 Adapter 响应', async () => {
    const response = await request(createApp({
      getTrackDetail: async () => ({ id: 'invalid' } as Track)
    }))
      .get('/v1/track?id=track-1')
      .set('Authorization', 'test-token')
      .expect(500);

    expect(response.body.message).toContain('Adapter response does not match Track');
  });

  it('接受由基础模型扩展的详情响应', async () => {
    const response = await request(createApp({
      getPlaylistDetail: async (id) => ({
        id,
        name: '示例歌单',
        description: '',
        coverUrl: 'https://example.com/playlist.jpg',
        trackCount: 1,
        tracks: [track]
      })
    }))
      .get('/v1/playlist/detail?id=playlist-1')
      .set('Authorization', 'test-token')
      .expect(200);

    expect(response.body.data.tracks).toHaveLength(1);
  });

  it('校验 mutation 请求体', async () => {
    const response = await request(createApp({ favoriteTrack: async (_id, status) => ({ success: true, status }) }))
      .post('/v1/track/favorite')
      .set('Authorization', 'test-token')
      .send({ id: 'track-1', status: 'true' })
      .expect(400);

    expect(response.body.message).toContain('Invalid request body');
  });
});

describe('OpenAPI contract', () => {
  it('由同一路由表生成 paths 和 SDK 版本', () => {
    expect(openApiDocument.openapi).toBe('3.1.0');
    expect(openApiDocument.info.version).toBe(sdkVersion);
    expect(openApiDocument.paths).toHaveProperty('/v1/status');
    expect(openApiDocument.paths).toHaveProperty('/v1/track/lyric');
    expect(openApiDocument.paths).toHaveProperty('/v1/playlist/favorite');
    expect(openApiDocument.components.schemas).toHaveProperty('TrackUrl');
    expect(openApiDocument.components.schemas).not.toHaveProperty('Audio');
    expect(openApiDocument.components.schemas).toHaveProperty('TrackLyrics');
    expect(openApiDocument.components.schemas).not.toHaveProperty('PlaybackLyrics');
    expect(openApiDocument.components.schemas).toHaveProperty('ToplistTrackSummary');
    expect(openApiDocument.components.schemas).not.toHaveProperty('ToplistTrackPreview');
    expect(openApiDocument.components.schemas.Status.properties).toHaveProperty('version');
    expect(openApiDocument.components.schemas.Status.properties).toHaveProperty('stateless');
    expect(openApiDocument.components.schemas.Status.properties).not.toHaveProperty('apiVersion');
  });

  it('为请求和响应提供 OpenAPI description', () => {
    const document = openApiDocument as any;

    for (const schema of Object.values(document.components.schemas) as any[]) {
      expect(schema.description).toBeTruthy();
      for (const property of Object.values(schema.properties ?? {}) as any[]) {
        expect(property.description).toBeTruthy();
      }
    }

    for (const pathItem of Object.values(document.paths) as any[]) {
      for (const operation of Object.values(pathItem) as any[]) {
        expect(operation.description).toBeTruthy();
        for (const parameter of operation.parameters ?? []) {
          expect(parameter.description).toBeTruthy();
        }
        if (operation.requestBody) {
          expect(operation.requestBody.description).toBeTruthy();
          const bodySchema = operation.requestBody.content['application/json'].schema;
          for (const property of Object.values(bodySchema.properties ?? {}) as any[]) {
            expect(property.description).toBeTruthy();
          }
        }
        for (const response of Object.values(operation.responses) as any[]) {
          if ('$ref' in response) continue;
          expect(response.description).toBeTruthy();
        }
      }
    }
  });
});
