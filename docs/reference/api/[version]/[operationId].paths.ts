import { usePaths } from "vitepress-openapi";
import { readApiSpecs } from "../../../.vitepress/api-specs.ts";

export default {
    paths: () =>
        readApiSpecs()
            .slice(1)
            .flatMap(({ version, spec }) =>
                usePaths({ spec })
                    .getPathsByVerbs()
                    .map(({ operationId, summary }) => ({
                        params: { version, operationId, title: summary },
                    })),
            ),
};
