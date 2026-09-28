import { listVersions } from "../../../.vitepress/versions.ts";

export default {
    paths: () =>
        listVersions(new URL("../../../public/specs/", import.meta.url))
            .slice(1)
            .map((version) => ({
                params: { version },
            })),
};
