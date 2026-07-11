import { isSafeUrl } from '../urlUtils';

describe('isSafeUrl', () => {
  it('should allow http and https protocols', () => {
    expect(isSafeUrl('http://example.com')).toBe(true);
    expect(isSafeUrl('https://example.com/path?query=1')).toBe(true);
  });

  it('should allow mailto, tel, and sms protocols', () => {
    expect(isSafeUrl('mailto:dev@example.com')).toBe(true);
    expect(isSafeUrl('tel:+1234567890')).toBe(true);
    expect(isSafeUrl('sms:+1234567890')).toBe(true);
  });

  it('should block dangerous protocols', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeUrl('file:///etc/passwd')).toBe(false);
  });

  it('should handle malformed URLs or protocol-only strings', () => {
    expect(isSafeUrl('https://')).toBe(true);
    expect(isSafeUrl('mailto:')).toBe(true);
    expect(isSafeUrl('not-a-url')).toBe(false);
    expect(isSafeUrl('')).toBe(false);
  });

  it('should be case-insensitive for protocols', () => {
    expect(isSafeUrl('HTTPS://example.com')).toBe(true);
    expect(isSafeUrl('MAILTO:dev@example.com')).toBe(true);
  });
});
