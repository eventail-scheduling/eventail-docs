import type { Theme } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { defineAsyncComponent, h } from "vue";
import ApiDownloadLink from "./ApiDownloadLink.vue";
import ApiSidebarVersion from "./ApiSidebarVersion.vue";
import ConfigReference from "./ConfigReference.vue";
import "./style.css";

export default {
    extends: DefaultTheme,
    Layout: () =>
        h(DefaultTheme.Layout, null, { "sidebar-nav-before": () => h(ApiSidebarVersion) }),
    enhanceApp: (context) => {
        const { app } = context;
        app.component("ConfigReference", ConfigReference);
        app.component("ApiDownloadLink", ApiDownloadLink);
        app.component(
            "ApiReference",
            // The renderer is 600 KB compressed, so only the API reference pages load it.
            defineAsyncComponent({
                loader: async () => {
                    const [{ theme, useTheme }, { default: ApiReference }] = await Promise.all([
                        import("vitepress-openapi/client"),
                        import("./ApiReference.vue"),
                    ]);
                    theme.enhanceApp(context);
                    useTheme({
                        operation: {
                            hiddenSlots: ["playground"],
                            defaultBaseUrl: "https://api.eventail.example.com",
                        },
                    });
                    return ApiReference;
                },
                errorComponent: () =>
                    h("p", "Couldn't load the API reference. Reload the page to try again."),
                onError: (_error, retry, fail, attempts) => (attempts <= 1 ? retry() : fail()),
            }),
        );
    },
} satisfies Theme;
