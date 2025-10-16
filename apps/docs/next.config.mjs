import withMDX from '@next/mdx';

const nextConfig = {
  experimental: {
    mdxRs: true,
  },
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
};

export default withMDX({})(nextConfig);
