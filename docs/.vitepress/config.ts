import { defineConfig } from "vitepress";

// VitePress reads the config from the default export.
export default defineConfig({
    title: "Eventail",
    description: "A call for papers and scheduling system for conferences",
    lang: "en-US",
    base: "/eventail-docs/",
    cleanUrls: true,
    head: [["link", { rel: "icon", type: "image/svg+xml", href: "/eventail-docs/favicon.svg" }]],
    themeConfig: {
        logo: { light: "/logo-light.svg", dark: "/logo-dark.svg" },
        search: { provider: "local" },
        socialLinks: [{ icon: "github", link: "https://github.com/eventail-scheduling" }],
    },
});
