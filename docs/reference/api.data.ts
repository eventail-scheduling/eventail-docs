import { readFileSync } from "node:fs";
import { defineLoader } from "vitepress";
import { compareVersions, versionOf } from "../.vitepress/versions.ts";

export type ApiVersion = {
    version: string;
    operationIds: string[];
};

type OpenApiOperation = {
    operationId?: string;
};

type OpenApiPaths = Record<string, Record<string, OpenApiOperation>>;

type OpenApiDocument = {
    paths: OpenApiPaths;
};

export declare const data: ApiVersion[];

/** Lists the minor versions `public/specs/` holds, newest first, with their operation IDs. */
export default defineLoader({
    watch: ["../public/specs/v*.json"],
    load: (files: string[]): ApiVersion[] =>
        files
            .flatMap((file) => {
                const version = versionOf(file);

                if (version === undefined) {
                    return [];
                }

                const { paths } = JSON.parse(readFileSync(file, "utf8")) as OpenApiDocument;

                return [
                    {
                        version,
                        operationIds: Object.values(paths).flatMap((item) =>
                            Object.values(item).flatMap((operation) =>
                                operation.operationId === undefined ? [] : [operation.operationId],
                            ),
                        ),
                    },
                ];
            })
            .sort((left, right) => compareVersions(right.version, left.version)),
});
