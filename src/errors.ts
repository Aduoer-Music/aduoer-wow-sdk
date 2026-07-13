export class WowError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: number = status
  ) {
    super(message);
    this.name = 'WowError';
  }
}

export class BadRequestError extends WowError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class UnauthorizedError extends WowError {
  constructor(message = 'Authorization token 无效或未提供') {
    super(message, 401);
  }
}

export class UnsupportedFeatureError extends WowError {
  constructor(feature: string) {
    super(`当前源不支持此功能: ${feature}`, 501);
  }
}
