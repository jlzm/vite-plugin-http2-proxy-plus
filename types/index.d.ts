import type { Plugin } from "vite";
declare const _default: (options: {
    [regexp: string]: {
        target: string;
        rewrite?: (url: string) => string;
        headers?: Record<string, number | string | string[] | undefined>;
        secure?: boolean;
        timeout?: number;
    };
}) => Plugin;
export default _default;
