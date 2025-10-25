declare module 'tailwindcss/types/config' {
  export interface PluginAPI {
    addBase: (styles: Record<string, unknown>) => void;
  }

  export type PluginCreator = (api: PluginAPI) => void;
}

declare module 'tailwindcss' {
  import type { PluginCreator } from 'tailwindcss/types/config';

  export type Config = {
    darkMode?: string | [string, ...string[]];
    theme?: Record<string, unknown>;
    plugins?: PluginCreator[];
  };
}

declare module 'tailwindcss/plugin' {
  import type { PluginCreator } from 'tailwindcss/types/config';

  const plugin: (handler: PluginCreator) => PluginCreator;
  export default plugin;
}
