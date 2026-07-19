/**
 * 应用错误类型定义
 * 统一错误处理，提供具体的错误信息
 */

export enum ErrorType {
  // 数据库错误
  DatabaseError = 'DATABASE_ERROR',
  NotFoundError = 'NOT_FOUND_ERROR',
  
  // 验证错误
  ValidationError = 'VALIDATION_ERROR',
  
  // 网络错误
  NetworkError = 'NETWORK_ERROR',
  
  // 未知错误
  UnknownError = 'UNKNOWN_ERROR',
}

export interface AppError {
  type: ErrorType;
  message: string;
  details?: string;
}

/**
 * 创建错误对象
 */
export function createError(type: ErrorType, message: string, details?: string): AppError {
  return { type, message, details };
}

/**
 * 解析 Tauri invoke 错误
 */
export function parseInvokeError(error: unknown): AppError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // 根据错误信息判断错误类型
  if (errorMessage.includes('not found') || errorMessage.includes('Not found')) {
    return createError(ErrorType.NotFoundError, '未找到相关数据', errorMessage);
  }
  
  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return createError(ErrorType.ValidationError, '输入数据无效', errorMessage);
  }
  
  if (errorMessage.includes('database') || errorMessage.includes('sqlite')) {
    return createError(ErrorType.DatabaseError, '数据库操作失败', errorMessage);
  }
  
  return createError(ErrorType.UnknownError, '操作失败', errorMessage);
}

/**
 * 获取用户友好的错误消息
 */
export function getUserFriendlyMessage(error: AppError): string {
  switch (error.type) {
    case ErrorType.NotFoundError:
      return '未找到相关数据';
    case ErrorType.ValidationError:
      return '输入数据无效，请检查后重试';
    case ErrorType.DatabaseError:
      return '数据库操作失败，请稍后重试';
    case ErrorType.NetworkError:
      return '网络连接失败，请检查网络';
    default:
      return error.message || '发生未知错误';
  }
}
