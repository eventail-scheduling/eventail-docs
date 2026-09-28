<script setup lang="ts">
import { computed } from "vue";
import { type ConfigVersion, data, type SchemaNode } from "../../reference/configuration.data.ts";
import VersionSelect from "./VersionSelect.vue";

type Props = {
    version?: string;
};

type Setting = {
    path: string;
    node: SchemaNode;
    required: boolean;
};

type Section = {
    path: string;
    depth: number;
    description?: string;
    settings: Setting[];
};

const props = defineProps<Props>();

const selected = computed((): ConfigVersion | undefined =>
    props.version === undefined ? data[0] : data.find((entry) => entry.version === props.version),
);

const collectSections = (
    node: SchemaNode,
    path: string[],
    depth: number,
    sections: Section[],
): void => {
    const properties = Object.entries(node.properties ?? {});
    const settings = properties
        .filter(([, child]) => child.properties === undefined)
        .map(([key, child]) => ({
            path: [...path, key].join("."),
            node: child,
            required: (node.required ?? []).includes(key) && child.default === undefined,
        }));

    if (settings.length > 0 || path.length > 0) {
        sections.push({
            path: path.length > 0 ? path.join(".") : "general",
            depth,
            description: path.length > 0 ? node.description : undefined,
            settings,
        });
    }

    for (const [key, child] of properties) {
        if (child.properties !== undefined) {
            const childDepth = path.length === 0 ? depth : depth + 1;
            collectSections(child, [...path, key], Math.min(childDepth, 4), sections);
        }
    }
};

const sections = computed((): Section[] => {
    const collected: Section[] = [];

    if (selected.value !== undefined) {
        collectSections(selected.value.schema, [], 2, collected);
    }

    return collected;
});

const formatLabels: Record<string, string> = {
    duration: "ISO 8601 duration",
    uri: "URL",
    email: "email address",
};

// zod reports JavaScript's safe-integer limits as the bounds of every unbounded integer.
const lowerBound = (node: SchemaNode): number | undefined => {
    if (node.exclusiveMinimum !== undefined) {
        return node.exclusiveMinimum + 1;
    }

    return node.minimum === undefined || node.minimum <= Number.MIN_SAFE_INTEGER
        ? undefined
        : node.minimum;
};

const upperBound = (node: SchemaNode): number | undefined => {
    if (node.exclusiveMaximum !== undefined) {
        return node.exclusiveMaximum - 1;
    }

    return node.maximum === undefined || node.maximum >= Number.MAX_SAFE_INTEGER
        ? undefined
        : node.maximum;
};

const describeInteger = (node: SchemaNode): string => {
    const lower = lowerBound(node);
    const upper = upperBound(node);

    if (lower !== undefined && upper !== undefined) {
        return `integer, ${lower} to ${upper}`;
    }

    if (lower !== undefined) {
        return `integer, at least ${lower}`;
    }

    return upper === undefined ? "integer" : `integer, at most ${upper}`;
};

const describeType = (node: SchemaNode): string => {
    if (node.enum !== undefined) {
        return `one of ${node.enum.map((value) => String(value)).join(", ")}`;
    }

    if (node.type === "array") {
        return node.items === undefined ? "list" : `list of ${describeType(node.items)}`;
    }

    const formatLabel = node.format === undefined ? undefined : formatLabels[node.format];

    if (formatLabel !== undefined) {
        return formatLabel;
    }

    return node.type === "integer" ? describeInteger(node) : (node.type ?? "any");
};

const formatValue = (value: unknown): string =>
    typeof value === "string" ? value : JSON.stringify(value);

const anchor = (path: string): string => path.replaceAll(".", "-");

const hrefFor = (version: string): string =>
    version === data[0].version
        ? "/reference/configuration/"
        : `/reference/configuration/${version}`;
</script>

<template>
    <p v-if="selected === undefined">
        No configuration schema is published for version {{ version }}.
    </p>
    <template v-else>
        <VersionSelect
            label="API version"
            :versions="data.map((entry) => entry.version)"
            :current="selected.version"
            :href-for="hrefFor"
        />
        <template v-for="section in sections" :key="section.path">
            <component :is="`h${section.depth}`" :id="anchor(section.path)" tabindex="-1">
                <code>{{ section.path }}</code>
                <a
                    class="header-anchor"
                    :href="`#${anchor(section.path)}`"
                    :aria-label="`Permalink to ${section.path}`"
                    >&ZeroWidthSpace;</a
                >
            </component>
            <p v-if="section.description">{{ section.description }}</p>
            <table v-if="section.settings.length > 0">
                <thead>
                    <tr>
                        <th>Setting</th>
                        <th>Type</th>
                        <th>Default</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="setting in section.settings" :key="setting.path">
                        <td>
                            <code>{{ setting.path }}</code><br>
                            <code class="env">{{ setting.node["x-env"] }}</code>
                        </td>
                        <td>{{ describeType(setting.node) }}</td>
                        <td>
                            <strong v-if="setting.required">Required</strong>
                            <code v-else-if="setting.node.default !== undefined">{{
                                formatValue(setting.node.default)
                            }}</code>
                        </td>
                        <td>
                            <span v-if="setting.node.description">{{
                                setting.node.description
                            }}</span>
                            <template v-if="setting.node.examples !== undefined">
                                <br>
                                Examples:
                                <template
                                    v-for="(example, index) in setting.node.examples"
                                    :key="index"
                                >
                                    <code>{{ formatValue(example) }}</code
                                    ><template v-if="index < setting.node.examples.length - 1"
                                        >,
                                    </template>
                                </template>
                            </template>
                        </td>
                    </tr>
                </tbody>
            </table>
        </template>
    </template>
</template>

<style scoped>
.env {
    color: var(--vp-c-text-2);
}
</style>
