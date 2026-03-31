<template>
  <div class="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1 space-y-0.5 min-h-0">

    <!-- Pinned tabs -->
    <template v-if="store.pinnedTabs.length > 0">
      <p class="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-fg/25">
        Pinned
      </p>
      <div class="flex flex-wrap gap-1 px-1 pb-2">
        <TabItem
          v-for="id in store.pinnedTabs"
          :key="id"
          :tabId="id"
          class="!w-9 !h-9 !p-0 !justify-center"
        />
      </div>
      <div class="border-t border-fg/5 mx-1 my-1" />
    </template>

    <!-- Regular tabs -->
    <p class="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-fg/25">
      Tabs
    </p>
    <TabItem
      v-for="id in store.regularTabs"
      :key="id"
      :tabId="id"
    />
  </div>
</template>

<script setup>
import { useTabsStore } from '../store/tabs'
import TabItem from './TabItem.vue'

const store = useTabsStore()
</script>
