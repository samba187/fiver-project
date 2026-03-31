const rateLimitMap = new Map<string, { count: number; startTime: number }>();

export function isRateLimited(
  ip: string,
  limit: number = 5,
  windowMs: number = 60000 // 1 minute default
): boolean {
  const now = Date.now();
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, startTime: now });
    return false;
  }

  const data = rateLimitMap.get(ip)!;
  if (now - data.startTime > windowMs) {
    rateLimitMap.set(ip, { count: 1, startTime: now });
    return false;
  }

  if (data.count >= limit) {
    return true;
  }

  data.count++;
  rateLimitMap.set(ip, data);
  return false;
}
