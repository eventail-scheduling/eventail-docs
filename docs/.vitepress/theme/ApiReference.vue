<script setup lang="ts">
import { OAMarkdown, OAOperation } from "vitepress-openapi/client";
import { computed, ref, watch } from "vue";
import { loadApiSpec, type OpenApiDocument } from "./api-spec.ts";
import { useRendererStyle } from "./renderer-style.ts";

type Props = {
    version: string;
    operationId?: string;
};

type ApiInfo = {
    title?: string;
    description?: string;
};

const props = defineProps<Props>();

useRendererStyle();

const spec = ref<OpenApiDocument>();
const failed = ref(false);

const info = computed((): ApiInfo => (spec.value?.info ?? {}) as ApiInfo);

watch(
    () => props.version,
    async (version, _previous, onCleanup) => {
        let stale = false;
        onCleanup(() => {
            stale = true;
        });
        spec.value = undefined;
        failed.value = false;

        try {
            const loaded = await loadApiSpec(version);

            if (!stale) {
                spec.value = loaded;
            }
        } catch {
            if (!stale) {
                failed.value = true;
            }
        }
    },
    { immediate: true },
);
</script>

<template>
    <p v-if="failed">
        Couldn't load the OpenAPI document for API {{ version }}. Reload the page to try again.
    </p>
    <template v-else-if="spec !== undefined">
        <OAOperation
            v-if="operationId !== undefined"
            :key="`${version}/${operationId}`"
            :spec="spec"
            :operation-id="operationId"
            hide-branding
        />
        <template v-else>
            <h1>{{ info.title }}</h1>
            <OAMarkdown
                v-if="info.description !== undefined"
                class="api-description"
                :content="info.description"
            />
        </template>
    </template>
</template>

<style scoped>
.vp-doc .api-description :deep(p) {
    /* biome-ignore lint/complexity/noImportantStyles: vitepress-openapi sets these with !important. */
    margin-block: 16px !important;
}
</style>
