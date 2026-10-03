<script setup lang="ts">
import { useData } from "vitepress";
import { computed } from "vue";
import { data as apiVersions } from "../../reference/api.data.ts";
import VersionSelect from "./VersionSelect.vue";

const { page, params } = useData();

const versions = apiVersions.map((entry) => entry.version);

const onApiPage = computed((): boolean => page.value.relativePath.startsWith("reference/api/"));

const current = computed((): string => {
    const version = params.value?.version;

    return typeof version === "string" ? version : versions[0];
});

const hrefFor = (version: string): string => {
    const operationId = params.value?.operationId;
    const target = apiVersions.find((entry) => entry.version === version);

    if (typeof operationId === "string" && target?.operationIds.includes(operationId)) {
        return version === versions[0]
            ? `/reference/api/${operationId}`
            : `/reference/api/${version}/${operationId}`;
    }

    return version === versions[0] ? "/reference/api/" : `/reference/api/${version}/`;
};
</script>

<template>
    <div v-if="onApiPage" class="api-sidebar-version">
        <VersionSelect
            label="API version"
            :versions="versions"
            :current="current"
            :href-for="hrefFor"
        />
    </div>
</template>

<style scoped>
.api-sidebar-version {
    padding: 16px 0 8px;
}
</style>
