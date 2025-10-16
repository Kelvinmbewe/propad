import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { env } from '@propad/config';

type CacheEntry = { value: unknown; expiresAt: number };

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: Redis | null = null;
  private readonly fallback = new Map<string, CacheEntry>();
  private connected = false;

  async onModuleInit() {
    try {
      this.client = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
      this.client.on('error', (error) => {
        this.logger.error(`Redis error: ${error.message}`);
      });
      await this.client.connect();
      this.connected = true;
      this.logger.log('Connected to Redis cache');
    } catch (error) {
      this.logger.warn(`Redis unavailable, falling back to in-memory cache: ${error instanceof Error ? error.message : error}`);
      this.client = null;
      this.connected = false;
    }
  }

  async onModuleDestroy() {
    if (this.client && this.connected) {
      await this.client.quit();
    }
    this.fallback.clear();
  }

  buildKey(...parts: Array<string | number>) {
    return ['propad', ...parts.map((part) => String(part))].join(':');
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.client && this.connected) {
      const value = await this.client.get(key);
      return value ? (JSON.parse(value) as T) : null;
    }

    const entry = this.fallback.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt < Date.now()) {
      this.fallback.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number) {
    if (this.client && this.connected) {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      return;
    }

    this.fallback.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async del(...keys: string[]) {
    if (!keys.length) {
      return;
    }
    if (this.client && this.connected) {
      await this.client.del(...keys);
      return;
    }
    keys.forEach((key) => this.fallback.delete(key));
  }

  async deleteMatching(pattern: string) {
    if (this.client && this.connected) {
      const stream = this.client.scanStream({ match: pattern, count: 100 });
      const keys: string[] = [];
      await new Promise<void>((resolve, reject) => {
        stream.on('data', (resultKeys: string[]) => {
          keys.push(...resultKeys);
        });
        stream.on('error', (error) => reject(error));
        stream.on('end', () => resolve());
      });
      if (keys.length) {
        await this.client.del(...keys);
      }
      return;
    }

    for (const key of Array.from(this.fallback.keys())) {
      if (this.matchesPattern(key, pattern)) {
        this.fallback.delete(key);
      }
    }
  }

  private matchesPattern(key: string, pattern: string) {
    if (pattern === key) {
      return true;
    }
    const regex = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
    return regex.test(key);
  }
}
