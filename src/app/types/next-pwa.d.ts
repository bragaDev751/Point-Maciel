declare module 'next-pwa' {
    import { NextConfig } from 'next';

    interface PWAConfig {
        dest?: string;
        disable?: boolean;
        register?: boolean;
        scope?: string;
        sw?: string;
        skipWaiting?: boolean;
        runtimeCaching?: unknown[]; 
        publicExcludes?: string[];
        buildExcludes?: unknown[]; 
        cacheOnFrontEndNav?: boolean;
        reloadOnOnline?: boolean;
        addUnconditionalHandler?: boolean;
        fallbacks?: Record<string, string>; 
        cacheStartUrl?: boolean;
        dynamicStartUrl?: boolean;
        dynamicStartUrlRedirect?: string;
    }

    // Define que withPWA recebe a config e retorna uma função que envolve o NextConfig
    function withPWA(config: PWAConfig): (nextConfig: NextConfig) => NextConfig;
    
    export default withPWA;
}