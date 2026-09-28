import { readFileSync } from "node:fs";
import type { useSidebar } from "vitepress-openapi";
import { listVersions } from "./versions.ts";

type OpenApiDocument = NonNullable<NonNullable<Parameters<typeof useSidebar>[0]>["spec"]>;

export type ApiSpec = {
    version: string;
    spec: OpenApiDocument;
};

const specsDirectory = new URL("../public/specs/", import.meta.url);

/**
 * Reads every `public/specs/vX.Y.json`, newest first.
 *
 * Throws when there is none, since the reference's pages and sidebar need at least one version.
 */
export const readApiSpecs = (): ApiSpec[] => {
    const versions = listVersions(specsDirectory);

    if (versions.length === 0) {
        throw new Error("public/specs/ holds no vX.Y.json OpenAPI document");
    }

    return versions.map((version) => ({
        version,
        spec: JSON.parse(
            readFileSync(new URL(`v${version}.json`, specsDirectory), "utf8"),
        ) as OpenApiDocument,
    }));
};
