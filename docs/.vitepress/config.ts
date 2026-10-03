import { type DefaultTheme, defineConfig } from "vitepress";
import { useSidebar } from "vitepress-openapi";
import { type ApiSpec, readApiSpecs } from "./api-specs.ts";

const apiSpecs = readApiSpecs();

const apiSidebar = (version: string, spec: ApiSpec["spec"]): DefaultTheme.SidebarItem[] => [
    {
        text: "Overview",
        link: version === apiSpecs[0].version ? "/reference/api/" : `/reference/api/${version}/`,
    },
    ...useSidebar({
        spec,
        linkPrefix:
            version === apiSpecs[0].version ? "/reference/api/" : `/reference/api/${version}/`,
        sidebarItemTemplate: ({ method, path, title }) =>
            `<span class="api-method api-method-${method}">${method.toUpperCase()}</span>${title ?? path}`,
    })
        .generateSidebarGroups()
        .map((group) => ({ ...group, collapsed: true })),
];

export default defineConfig({
    title: "Eventail",
    description: "A call for papers and scheduling system for conferences",
    lang: "en-US",
    base: "/eventail-docs/",
    cleanUrls: true,
    vite: {
        // vitepress-openapi's chunks reach 2 MB: the renderer, loaded on the API reference pages
        // only, and syntax grammars its code samples load on demand.
        build: { chunkSizeWarningLimit: 2500 },
    },
    transformPageData: (pageData) => {
        if (typeof pageData.params?.title === "string") {
            pageData.title = pageData.params.title;
        }
    },
    head: [["link", { rel: "icon", type: "image/svg+xml", href: "/eventail-docs/favicon.svg" }]],
    themeConfig: {
        logo: { light: "/logo-light.svg", dark: "/logo-dark.svg" },
        nav: [
            { text: "Introduction", link: "/guide/introduction" },
            { text: "Self-hosting", link: "/self-hosting/docker-compose" },
            { text: "Integration", link: "/integration/schedule" },
            { text: "Adapter", link: "/furry-schedule-adapter/" },
            {
                text: "Reference",
                items: [
                    { text: "Configuration", link: "/reference/configuration/" },
                    { text: "API", link: "/reference/api/" },
                ],
            },
        ],
        sidebar: {
            "/reference/api/": apiSidebar(apiSpecs[0].version, apiSpecs[0].spec),
            ...Object.fromEntries(
                apiSpecs.map(({ version, spec }) => [
                    `/reference/api/${version}/`,
                    apiSidebar(version, spec),
                ]),
            ),
            "/": [
                {
                    text: "Getting started",
                    items: [{ text: "Introduction", link: "/guide/introduction" }],
                },
                {
                    text: "Self-hosting",
                    items: [
                        { text: "Docker Compose", link: "/self-hosting/docker-compose" },
                        { text: "Kubernetes", link: "/self-hosting/kubernetes" },
                        { text: "Sign-in provider", link: "/self-hosting/sign-in-provider" },
                        { text: "Object storage", link: "/self-hosting/object-storage" },
                        { text: "Workers and scaling", link: "/self-hosting/workers" },
                    ],
                },
                {
                    text: "Integration",
                    items: [{ text: "Showing the schedule", link: "/integration/schedule" }],
                },
                {
                    text: "Furry schedule adapter",
                    items: [{ text: "Running it", link: "/furry-schedule-adapter/" }],
                },
                {
                    text: "Reference",
                    items: [
                        { text: "Configuration", link: "/reference/configuration/" },
                        { text: "API", link: "/reference/api/" },
                    ],
                },
            ],
        },
        search: { provider: "local" },
        socialLinks: [{ icon: "github", link: "https://github.com/eventail-scheduling" }],
    },
});
