/**
 * Secure Logger
 *
 * Provides logging functionality that sanitizes sensitive information
 * such as passwords, tokens, and email addresses from log outputs.
 *
 * Requirements: 9.4, 9.5, 10.4
 */

const SENSITIVE_KEYS = ['password', 'token', 'access_token', 'refresh_token', 'secret', 'key'];

/**
 * Sanitizes an object by masking sensitive string values.
 */
export function sanitize(data: any): any {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // If it looks like a long token or password, partially mask it
    if (data.length > 20 && !data.includes(' ')) {
      return `${data.substring(0, 4)}...[redacted]...${data.substring(data.length - 4)}`;
    }
    // Basic email masking
    if (data.includes('@') && data.includes('.')) {
      const parts = data.split('@');
      return `${parts[0].substring(0, 2)}***@${parts[1]}`;
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitize(item));
  }

  if (typeof data === 'object') {
    const sanitizedObj: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
        sanitizedObj[key] = '[REDACTED]';
      } else {
        sanitizedObj[key] = sanitize(value);
      }
    }
    return sanitizedObj;
  }

  return data;
}

export const logger = {
  log: (message: string, data?: any) => {
    if (data) {
      console.log(`[INFO] ${message}`, sanitize(data));
    } else {
      console.log(`[INFO] ${message}`);
    }
  },
  warn: (message: string, data?: any) => {
    if (data) {
      console.warn(`[WARN] ${message}`, sanitize(data));
    } else {
      console.warn(`[WARN] ${message}`);
    }
  },
  error: (message: string, error?: any) => {
    let sanitizedError = error;
    if (error && typeof error === 'object') {
      sanitizedError = sanitize({
        message: error.message,
        code: error.code,
        stack: error.stack,
        ...error
      });
    }
    
    if (error) {
      console.error(`[ERROR] ${message}`, sanitizedError);
    } else {
      console.error(`[ERROR] ${message}`);
    }
  }
};
