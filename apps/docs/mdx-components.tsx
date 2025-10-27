import type { ReactNode } from 'react';

type MDXComponent = (props: Record<string, unknown>) => ReactNode;

type MDXComponents = Record<string, MDXComponent> & {
  wrapper?: (props: { children: ReactNode }) => ReactNode;
};

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
  };
}
