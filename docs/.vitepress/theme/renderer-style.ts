import css from "vitepress-openapi/dist/style.css?inline";
import { onMounted, onUnmounted } from "vue";

let users = 0;
let element: HTMLStyleElement | undefined;

/**
 * Adds vitepress-openapi's stylesheet while the calling component is mounted.
 *
 * VitePress merges all imported CSS into one global stylesheet, so the renderer's styles, Tailwind
 * utilities among them, arrive inline instead and leave with the last component using them. The
 * removal waits a tick, so moving from one API page to the next keeps the stylesheet in place.
 */
export const useRendererStyle = (): void => {
    onMounted(() => {
        users++;

        if (element === undefined) {
            element = document.createElement("style");
            element.textContent = css;
            document.head.append(element);
        }
    });

    onUnmounted(() => {
        users--;

        setTimeout(() => {
            if (users === 0 && element !== undefined) {
                element.remove();
                element = undefined;
            }
        });
    });
};
