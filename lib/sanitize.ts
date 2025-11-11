import DOMPurify from 'dompurify';

/**
 * Sanitize HTML to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof window === 'undefined') {
    // Server-side: just escape HTML
    return escapeHtml(dirty);
  }
  
  // Client-side: use DOMPurify
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // No HTML tags allowed, plain text only
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

/**
 * Escape HTML characters for server-side rendering
 */
export function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitize text for safe display (removes any HTML, keeps only text)
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  
  // Remove any potential HTML/script tags
  const cleaned = text.replace(/<[^>]*>/g, '');
  
  // Limit length to prevent DoS
  const maxLength = 500000; // 500KB
  return cleaned.length > maxLength 
    ? cleaned.substring(0, maxLength) + '...' 
    : cleaned;
}

/**
 * Validate and sanitize error messages for display
 */
export function sanitizeErrorMessage(error: unknown): string {
  let message = 'An unexpected error occurred';
  
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }
  
  // Remove sensitive information
  message = message
    .replace(/sk-[a-zA-Z0-9]+/g, '[REDACTED]')
    .replace(/Bearer\s+[^\s]+/g, '[REDACTED]')
    .replace(/https?:\/\/api\.[^\s]+/g, '[API_URL]');
  
  // Sanitize HTML
  message = sanitizeText(message);
  
  // Limit length
  return message.length > 200 ? message.substring(0, 200) + '...' : message;
}
