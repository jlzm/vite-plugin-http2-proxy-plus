import type { Plugin, Connect } from "vite";
import proxy from "http2-proxy";
import type { IncomingMessage } from "http";
import type { Socket } from "net";
import type { Buffer } from "buffer";

const error = (message: string): never => {
  throw new Error(message);
};

export default (options: {
  [regexp: string]: {
    target: string;
    rewrite?: (url: string) => string;
    headers?: Record<string, number | string | string[] | undefined>;
    secure?: boolean;
    timeout?: number;
  };
}): Plugin => {
  const prepareRules = () => {
    return Object.entries(options).map(([regexp, rule]) => {
      const re = new RegExp(regexp);
      const targetUrl = new URL(rule.target);

      if (!targetUrl.pathname.endsWith("/")) {
        targetUrl.pathname += "/";
      }

      const protocol = /^https?:$/.test(targetUrl.protocol)
        ? (targetUrl.protocol.slice(0, -1) as "http" | "https")
        : /^wss?:$/.test(targetUrl.protocol)
        ? (targetUrl.protocol.slice(0, -1) as "ws" | "wss")
        : error(`Invalid protocol: ${targetUrl.href}`);

      const port =
        targetUrl.port === ""
          ? { https: 443, http: 80, ws: 80, wss: 443 }[protocol]
          : /^\d+$/.test(targetUrl.port)
          ? Number(targetUrl.port)
          : error(`Invalid port: ${targetUrl.href}`);

      return {
        re,
        rewrite: rule.rewrite,
        headers: rule.headers,
        secure: rule.secure ?? true,
        timeout: rule.timeout ?? 30_000,
        protocol,
        port,
        hostname: targetUrl.hostname,
        pathname: targetUrl.pathname,
      };
    });
  };

  const configure = ({ middlewares, httpServer }: { middlewares: Connect.Server; httpServer: any }) => {
    const rules = prepareRules();

    // Handle HTTP/HTTPS requestions
    for (const rule of rules) {
      middlewares.use((req, res, next) => {
        if (req.url && rule.re.test(req.url)) {
          const rewritten = (rule.rewrite?.(req.url) ?? req.url).replace(/^\/+/, "");
          const targetBase = `${rule.protocol}://${rule.hostname}:${rule.port}${rule.pathname}`;
          const { pathname, search } = new URL(rewritten, targetBase);

          proxy.web(
            req,
            res,
            {
              protocol: rule.protocol as "http" | "https",
              port: rule.port,
              hostname: rule.hostname,
              path: pathname + search,
              proxyTimeout: rule.timeout,
              onReq: async (_, options) => {
                options.headers = {
                  ...options.headers,
                  ...rule.headers,
                };
              },
              ["rejectUnauthorized" as never]: rule.secure,
            },
            (err) => err && next(err),
          );
        } else {
          next();
        }
      });
    }

    // Handle WS/WSS requestions
    httpServer.on("upgrade", (req: IncomingMessage, socket: Socket, head: Buffer) => {
      const matched = rules.find((rule) => req.url && rule.re.test(req.url!));
      if (!matched) return;

      const rewritten = (matched.rewrite?.(req.url!) ?? req.url!).replace(/^\/+/, "");
      const targetBase = `${matched.protocol}://${matched.hostname}:${matched.port}${matched.pathname}`;
      const { pathname, search } = new URL(rewritten, targetBase);

      proxy.ws(
        req,
        socket,
        head,
        {
          protocol: matched.protocol as "http" | "https",
          port: matched.port,
          hostname: matched.hostname,
          path: pathname + search,
          proxyTimeout: matched.timeout,
          onReq: async (_, options) => {
            options.headers = {
              ...options.headers,
              ...matched.headers,
            };
          },
          ["rejectUnauthorized" as never]: matched.secure,
        },
        (err) => {
          if (err) {
            socket.destroy(err);
          }
        },
      );
    });
  };

  return {
    name: "http2-proxy-plus",
    configureServer: configure,
    configurePreviewServer: configure,
  };
};
