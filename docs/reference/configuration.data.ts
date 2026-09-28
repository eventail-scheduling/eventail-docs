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

export declare const data: ConfigVersion[];

/** Reads every `public/config/vX.Y.json`, newest first. */
export default defineLoader({
    watch: ["../public/config/v*.json"],
    load: (files: string[]): ConfigVersion[] =>
        files
            .flatMap((file) => {
                const version = versionOf(file);

                return version === undefined
                    ? []
                    : [{ version, schema: JSON.parse(readFileSync(file, "utf8")) as SchemaNode }];
            })
            .sort((left, right) => compareVersions(right.version, left.version)),
});
