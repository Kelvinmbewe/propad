declare namespace NodeJS {
  interface Timeout {
    ref?(): void;
    unref?(): void;
  }

  interface WritableStream {
    write(chunk: unknown): boolean;
    end(chunk?: unknown): void;
  }

  interface ReadableStream {
    on(event: 'data', listener: (chunk: unknown) => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'error', listener: (error: unknown) => void): this;
    pipe<T extends WritableStream>(destination: T): T;
  }
}

declare class Buffer {
  static from(data: string, encoding?: string): Buffer;
  static concat(list: Buffer[]): Buffer;
}

declare module 'node:events' {
  class EventEmitter {
    on(event: string, listener: (...args: unknown[]) => void): this;
    off(event: string, listener: (...args: unknown[]) => void): this;
    emit(event: string, ...args: unknown[]): boolean;
  }

  export { EventEmitter };
  export default EventEmitter;
}

declare module 'events' {
  import EventEmitterDefault, { EventEmitter } from 'node:events';
  export { EventEmitter };
  export default EventEmitterDefault;
}

declare module 'stream' {
  class Readable implements NodeJS.ReadableStream {
    on(event: 'data', listener: (chunk: unknown) => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'error', listener: (error: unknown) => void): this;
    pipe<T extends NodeJS.WritableStream>(destination: T): T;
    read(size?: number): unknown;
  }

  export { Readable };
}

declare function setInterval(handler: (...args: unknown[]) => void, timeout?: number, ...args: unknown[]): NodeJS.Timeout;
declare function clearInterval(handle?: NodeJS.Timeout): void;
declare function setTimeout(handler: (...args: unknown[]) => void, timeout?: number, ...args: unknown[]): NodeJS.Timeout;
declare function clearTimeout(handle?: NodeJS.Timeout): void;

declare const process: {
  env: Record<string, string | undefined>;
};
