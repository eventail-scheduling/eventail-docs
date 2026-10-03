import { usePaths } from "vitepress-openapi";
import { readApiSpecs } from "../../.vitepress/api-specs.ts";

export default {
    paths: () => {
        const [newest] = readApiSpecs();

        return usePaths({ spec: newest.spec })
            .getPathsByVerbs()
            .map(({ operationId, summary }) => ({
                params: { operationId, title: summary },
            }));
    },
};
