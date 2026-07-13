import { schemas } from './schemas';
import { wowRoutes } from './routes';
import { sdkVersion } from './version';

function schemaDescription(name: keyof typeof schemas): string {
  return String(schemas[name].description ?? name);
}

function dataReference(name: keyof typeof schemas, array = false): Record<string, unknown> {
  const description = array
    ? `${schemaDescription(name)}列表。`
    : schemaDescription(name);
  const reference = { $ref: `#/components/schemas/${name}` };
  return array
    ? { type: 'array', description, items: reference }
    : { ...reference, description };
}

function successResponse(name: keyof typeof schemas, array = false, summary: string) {
  return {
    description: `${summary}成功；data 为 ${array ? `${name}[]` : name}。`,
    content: {
      'application/json': {
        schema: {
          allOf: [
            { $ref: '#/components/schemas/ApiResponse' },
            {
              type: 'object',
              required: ['data'],
              properties: { data: dataReference(name, array) }
            }
          ]
        }
      }
    }
  };
}

const paths = Object.fromEntries(wowRoutes.map((route) => [
  `/v1${route.path}`,
  {
    [route.method]: {
      tags: [route.tag],
      summary: route.summary,
      description: `${route.summary}。成功响应的 data 字段为 ${route.responseArray ? `${route.response}[]` : route.response}。`,
      security: [{ ApiKeyAuth: [] }],
      parameters: route.parameters ?? [],
      ...(route.bodySchema ? {
        requestBody: {
          required: true,
          description: String(route.bodySchema.description ?? `${route.summary}所需的请求参数。`),
          content: { 'application/json': { schema: route.bodySchema } }
        }
      } : {}),
      responses: {
        200: successResponse(route.response, route.responseArray, route.summary),
        400: { $ref: '#/components/responses/BadRequest' },
        401: { $ref: '#/components/responses/Unauthorized' },
        501: { $ref: '#/components/responses/UnsupportedFeature' },
        500: { $ref: '#/components/responses/InternalError' }
      }
    }
  }
]));

const errorResponse = (description: string) => ({
  description,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorResponse' }
    }
  }
});

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Aduoer Wow Origin API',
    version: sdkVersion,
    description: 'Aduoer Wow 音乐源的公开请求与响应契约。'
  },
  servers: [{ url: '/', description: '当前服务' }],
  tags: [
    { name: 'status', description: '源状态和 SDK 版本' },
    { name: 'playlist', description: '歌单' },
    { name: 'discovery', description: '发现' },
    { name: 'track', description: '歌曲与播放' },
    { name: 'search', description: '搜索' },
    { name: 'artist', description: '艺人' },
    { name: 'album', description: '专辑' },
    { name: 'user', description: '当前账号' }
  ],
  paths,
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'Authorization',
        description: '账号访问密钥，支持裸 token；解析策略由源项目实现。'
      }
    },
    schemas,
    responses: {
      BadRequest: errorResponse('请求参数错误'),
      Unauthorized: errorResponse('Authorization 无效或缺失'),
      UnsupportedFeature: errorResponse('当前源未实现该能力'),
      InternalError: errorResponse('服务内部错误')
    }
  }
} as const;
