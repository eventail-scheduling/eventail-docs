---
aside: false
outline: false
---

<script setup lang="ts">
import { data } from "../api.data.ts";
</script>

<ClientOnly><ApiReference :version="data[0].version" :operation-id="$params.operationId" /></ClientOnly>
