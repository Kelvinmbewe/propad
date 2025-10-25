declare module 'class-validator' {
  type Decorator = PropertyDecorator & MethodDecorator & ParameterDecorator;

  export function IsString(): Decorator;
  export function IsOptional(): Decorator;
  export function IsUUID(): Decorator;
  export function IsInt(): Decorator;
  export function IsArray(): Decorator;
  export function IsBoolean(): Decorator;
  export function IsUrl(): Decorator;
  export function MaxLength(max: number): Decorator;
  export function MinLength(min: number): Decorator;
  export function IsEnum(_enum: object): Decorator;
  export function Max(max: number): Decorator;
  export function Min(min: number): Decorator;
  export function IsNumber(): Decorator;
  export function IsEmail(): Decorator;
}

declare module 'class-transformer' {
  export function Transform(transformer: (params: { value: unknown }) => unknown): PropertyDecorator;
}

declare module 'bcryptjs' {
  export function compare(data: string, encrypted: string): Promise<boolean>;
}

declare module 'cookie-parser' {
  import type { RequestHandler } from 'express';
  type CookieParser = (secret?: string | string[], options?: Record<string, unknown>) => RequestHandler;
  const cookieParser: CookieParser;
  export default cookieParser;
}

declare module 'nodemailer' {
  export interface SendMailOptions {
    to: string | string[];
    from: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: Array<{ filename: string; content: Buffer | string }>;
  }

  export interface Transporter {
    sendMail(options: SendMailOptions): Promise<void>;
  }

  export interface TransportConfig {
    host: string;
    port: number;
    secure?: boolean;
    auth?: { user: string; pass: string };
  }

  function createTransport(config: TransportConfig): Transporter;
  const nodemailer: { createTransport: typeof createTransport };
  export { createTransport, Transporter };
  export default nodemailer;
}

declare module 'pdfkit' {
  import { Readable } from 'stream';

  class PDFDocument extends Readable {
    constructor(options?: Record<string, unknown>);
    text(text: string, options?: Record<string, unknown>): this;
    fontSize(size: number): this;
    moveDown(lines?: number): this;
    pipe(stream: NodeJS.WritableStream): NodeJS.WritableStream;
    end(): void;
  }

  export default PDFDocument;
}

declare module 'socket.io' {
  import { EventEmitter } from 'events';

  export interface ServerOptions {
    cors?: { origin: string | string[]; credentials?: boolean };
  }

  export interface Socket extends EventEmitter {
    id: string;
    data: Record<string, unknown>;
    disconnect(close?: boolean): void;
    emit(event: string, ...args: unknown[]): boolean;
  }

  export class Server extends EventEmitter {
    constructor(httpServer?: unknown, options?: ServerOptions);
    to(room: string): Server;
    emit(event: string, ...args: unknown[]): boolean;
  }
}
