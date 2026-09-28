<script setup lang="ts">
import { withBase } from "vitepress";

type Props = {
    version: string;
};

defineProps<Props>();
</script>

<template>
    <p class="api-download">
        <a :href="withBase(`/specs/v${version}.json`)" download>Download the OpenAPI document</a>
        for API {{ version }}.
    </p>
</template>

<style scoped>
.api-download {
    color: var(--vp-c-text-2);
    font-size: 14px;
}
</style>
