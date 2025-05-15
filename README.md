# vite-plugin-http2-proxy-plus

A Vite plugin that allows you to proxy HTTP, HTTPS, and WebSocket (WS/WSS) requests with HTTP/2 support. This plugin makes it easy to handle various proxy requirements in Vite projects with improved flexibility and performance.

## Installation

```bash
npm install @vitecraft/vite-plugin-http2-proxy-plus --save-dev
```

Usage
In your vite.config.ts (or vite.config.js), add the plugin to the plugins array:

```typescript
import http2ProxyPlus from '@vitecraft/vite-plugin-http2-proxy-plus';

export default {
  plugins: [
    http2ProxyPlus({
      "^/api": {
        target: "http://localhost:3000",
        rewrite: (url) => url.replace(/^\/api/, ""),
      },
      "^/socket": {
        target: "ws://your.websocket.server", // WebSocket support
        rewrite: (url) => url.replace(/^\/socket/, ""),
      },
    }),
  ],
};
```

Configuration
target: The target URL to proxy to (HTTP/HTTPS/WS/WSS).

rewrite: (Optional) A function to rewrite the URL before proxying.

secure: (Optional) Whether to reject unauthorized certificates. Default is true.

timeout: (Optional) Timeout in milliseconds. Default is 30000.


License
MIT
