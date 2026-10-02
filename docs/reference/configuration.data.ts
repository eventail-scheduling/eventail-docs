import { readFileSync } from "node:fs";
import { defineLoader } from "vitepress";
import { compareVersions, versionOf } from "../.vitepress/versions.ts";

export type SchemaNode = {
    type?: string;
    description?: string;
    default?: unknown;
    examples?: unknown[];
    enum?: unknown[];
    format?: string;
    minimum?: number;
    maximum?: number;
    exclusiveMinimum?: number;
    exclusiveMaximum?: number;
    items?: SchemaNode;
    properties?: Record<string, SchemaNode>;
    required?: string[];
    "x-env"?: string;
};

export type ConfigVersion = {
    version: string;
    schema: SchemaNode;
};

/** The products that publish a configuration schema, each on its own version line. */
export type ConfigProduct = "eventail" | "furry-schedule-adapter";

export declare const data: Record<ConfigProduct, ConfigVersion[]>;

const versionsIn = (files: string[]): ConfigVersion[] =>
    files
        .flatMap((file) => {
            const version = versionOf(file);

            return version === undefined
                ? []
                : [{ version, schema: JSON.parse(readFileSync(file, "utf8")) as SchemaNode }];
        })
        .sort((left, right) => compareVersions(right.version, left.version));

/**
 * Reads every published `vX.Y.json` configuration schema, newest first per product.
 *
 * Each product's publish-docs workflow writes one per minor version on each release, replacing
 * it with the newest patch's, so a hand edit lasts only until that minor's next release.
 */
export default defineLoader({
    watch: ["../public/config/v*.json", "../public/config/furry-schedule-adapter/v*.json"],
    load: (files: string[]): Record<ConfigProduct, ConfigVersion[]> => {
        const adapter = files.filter((file) => file.includes("/furry-schedule-adapter/"));

        return {
            eventail: versionsIn(files.filter((file) => !adapter.includes(file))),
            "furry-schedule-adapter": versionsIn(adapter),
        };
    },
});
