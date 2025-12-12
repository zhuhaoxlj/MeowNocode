/** @type {import('next').NextConfig} */
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  // Production optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Enable compression
  compress: true,
  
  // Use SWC for minification (faster than Terser)
  swcMinify: true,
  
  // Disable source maps in production for smaller bundles
  productionBrowserSourceMaps: false,
  
  // Optimize fonts
  optimizeFonts: true,
  
  // Experimental optimizations
  experimental: {
    serverComponentsExternalPackages: ['sqlite3', 'sql.js'],
    // Optimize CSS (experimental)
    optimizeCss: true,
    // Optimize package imports for tree shaking
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-accordion',
      '@radix-ui/react-alert-dialog',
      '@radix-ui/react-aspect-ratio',
      '@radix-ui/react-avatar',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-collapsible',
      '@radix-ui/react-context-menu',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-hover-card',
      '@radix-ui/react-label',
      '@radix-ui/react-menubar',
      '@radix-ui/react-navigation-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-progress',
      '@radix-ui/react-radio-group',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slider',
      '@radix-ui/react-slot',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group',
      '@radix-ui/react-tooltip',
      'date-fns',
      'framer-motion',
      'recharts',
    ],
  },
  
  // TypeScript configuration
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // ESLint configuration
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Redirects
  async redirects() {
    return [];
  },
  
  // Webpack configuration for code splitting and optimizations
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Support WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    
    // Handle sql.js WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });
    
    // Externalize server-side database drivers
    if (isServer) {
      config.externals.push('sqlite3', 'better-sqlite3', 'sql.js');
    }
    
    // Fallback for browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    
    // Production optimizations for client-side bundles
    if (!isServer && !dev) {
      // Enable module concatenation (scope hoisting) for tree shaking
      config.optimization.concatenateModules = true;
      
      // Configure code splitting with 200KB chunk size limit
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // Disable default cache groups
          default: false,
          vendors: false,
          
          // Framework chunk (React, React DOM, Scheduler)
          framework: {
            name: 'framework',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            priority: 40,
            enforce: true,
          },
          
          // Radix UI components
          radix: {
            name: 'radix',
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            chunks: 'all',
            priority: 35,
            enforce: true,
          },
          
          // Large libraries split into separate chunks
          lib: {
            test: /[\\/]node_modules[\\/]/,
            name(module) {
              // Get the package name
              const match = module.context?.match(
                /[\\/]node_modules[\\/](.*?)([\\/]|$)/
              );
              if (!match) return 'vendors';
              const packageName = match[1];
              // Create a chunk for each package
              return `npm.${packageName.replace('@', '')}`;
            },
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          
          // Common chunks shared between pages
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
          },
        },
        // Maximum number of parallel requests at an entry point
        maxInitialRequests: 25,
        // Minimum size before creating a chunk (20KB)
        minSize: 20000,
        // Maximum size for chunks (200KB as per requirements)
        maxSize: 200000,
      };
      
      // Minimize configuration
      config.optimization.minimize = true;
    }
    
    return config;
  },
  
  // Static asset configuration
  assetPrefix: '',
  
  // Image optimization
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
  },
  
  // API route configuration
  serverRuntimeConfig: {
    apiTimeout: 300000, // 5 minutes
    maxRequestSize: '100mb'
  },
};

export default withBundleAnalyzer(nextConfig);
