<script setup lang="ts">
import { useRouter, withBase } from "vitepress";

type Props = {
    label: string;
    versions: string[];
    current: string;
    /** Left out by a reference that keeps every version on one page. */
    hrefFor?: (version: string) => string;
};

const props = defineProps<Props>();
const emit = defineEmits<{ select: [version: string] }>();
const router = useRouter();

const switchTo = (event: Event): void => {
    const version = (event.target as HTMLSelectElement).value;

    if (props.hrefFor === undefined) {
        emit("select", version);
        return;
    }

    void router.go(withBase(props.hrefFor(version)));
};
</script>

<template>
    <label class="version-select">
        {{ label }}
        <select :value="current" @change="switchTo">
            <option v-for="(version, index) in versions" :key="version" :value="version">
                {{ index === 0 ? `${version} (latest)` : version }}
            </option>
        </select>
    </label>
</template>

<style scoped>
.version-select {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--vp-c-text-2);
    font-size: 14px;
    font-weight: 500;
}

select {
    padding: 4px 8px;
    border: 1px solid var(--vp-c-divider);
    border-radius: 6px;
    background-color: var(--vp-c-bg-soft);
    color: var(--vp-c-text-1);
    font-size: 14px;
}
</style>
