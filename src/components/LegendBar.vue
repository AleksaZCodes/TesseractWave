<template>
  <div class="flex flex-wrap justify-center gap-2">
    <div
      v-for="(channel, index) in usedChannels"
      :key="index"
      :class="['badge', channel ? `bg-base-100` : 'badge-ghost']"
      :style="channel ? { 'background-color': chartColors[index] } : ''"
    >
      <span class="font-bold text-base-100">{{ channelLabels[index] }}</span>
    </div>
  </div>
</template>

<script setup>
import { useChartColors } from '@/composables/useChartColors'

const props = defineProps({
  usedChannels: {
    type: Array,
    required: true
  },
  channelLabels: {
    type: Array,
    required: true
  }
})

const chartColors = useChartColors(props.channelLabels.length)
</script>
