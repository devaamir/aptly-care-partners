declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

declare module 'event-source-polyfill' {
  export class EventSourcePolyfill {
    constructor(url: string, eventSourceInitDict?: any);
    onmessage: ((event: any) => void) | null;
    onerror: ((event: any) => void) | null;
    close(): void;
  }
}

interface MessageEvent<T = any> {
  data: T;
  type: string;
}

interface EventSource {
  onmessage: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  close(): void;
}
