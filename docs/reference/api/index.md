---
title: API reference
aside: false
outline: false
---

<script setup lang="ts">
import { data } from "../api.data.ts";
</script>

<ClientOnly><ApiReference :version="data[0].version" /></ClientOnly>

<ApiDownloadLink :version="data[0].version" />
