<template>
  <div class="h-screen p-2 flex flex-col gap-2 justify-between">
    <NavBar />

    <div class="card h-full overflow-hidden" ref="chartContainer">
      <canvas
        v-if="sampling"
        id="chart"
        :width="canvasWidth"
        :height="canvasHeight"
        class="bg-base-200"
      ></canvas>
      <div
        v-else
        class="skeleton bg-base-200 w-full h-full flex justify-center items-center gap-2 italic"
      >
        <i class="fa-solid fa-chart-line text-primary"></i> Single chart layout
      </div>
    </div>

    <LegendBar v-if="sampling" :usedChannels="usedChannels" :channelLabels="channelLabels" />

    <div class="card flex flex-row justify-center items-center gap-2">
      <button
        v-if="!sampling"
        class="btn"
        :disabled="loading || sampling"
        @click="connected ? disconnect() : connect()"
      >
        <i
          class="fa-solid"
          :class="[
            connected ? 'text-red-400 fa-link-slash' : 'text-primary fa-link',
            loading ? 'fa-fade' : ''
          ]"
        ></i>
        {{ connected ? 'Disconnect' : 'Connect' }}
      </button>

      <button v-else class="btn" :disabled="loading || !sampling" @click="mark()">
        <i class="fa-solid fa-scissors text-primary"></i> Mark
      </button>

      <button class="btn" v-if="connected" @click="sampling ? stopSampling() : startSampling()">
        <i
          class="fa-solid"
          :class="[
            sampling ? 'text-red-400 fa-xmark' : 'text-primary fa-play',
            loading ? 'fa-fade' : ''
          ]"
        ></i>
        {{ sampling ? 'Close' : 'Open' }}
      </button>

      <button class="btn" v-if="sampling" @click="recording ? stopRecording() : startRecording()">
        <i
          class="fa-solid"
          :class="[
            recording ? 'text-red-400 fa-stop' : 'text-primary fa-circle',
            loading ? 'fa-fade' : ''
          ]"
        ></i>
        {{ recording ? 'Finish' : 'Record' }}
      </button>

      <button
        class="btn"
        v-if="connected && !sampling"
        onclick="options.showModal()"
        :disabled="loading || sampling"
      >
        <i class="fa-solid fa-sliders"></i> Options
      </button>
    </div>
  </div>
  <dialog id="options" class="modal">
    <div class="modal-box prose">
      <h3 class="font-bold">Recording options</h3>

      <h4>Sampling rate</h4>
      <div class="flex gap-2 justify-between items-center">
        <input
          type="range"
          min="100"
          max="1000"
          v-model="samplingRate"
          class="range range-primary"
          step="100"
        />
        <span class="w-[4.5ch] text-right">{{ samplingRate }}</span>
      </div>

      <h4>Used channels</h4>
      <div class="grid grid-cols-6 gap-3 md:gap-5">
        <label class="swap swap-flip" v-for="(label, index) in channelLabels" :key="label">
          <input
            type="checkbox"
            :disabled="
              usedChannels[index] &&
              usedChannels.reduce((count, value) => count + (value === true), 0) === 1
            "
            v-model="usedChannels[index]"
          />

          <div
            class="swap-on card rounded-2xl w-10 md:w-12 bg-primary text-base-100 font-bold aspect-square justify-center items-center"
          >
            {{ label }}
          </div>
          <div
            class="swap-off card rounded-2xl w-10 md:w-12 bg-base-200 font-bold aspect-square justify-center items-center"
          >
            {{ label }}
          </div>
        </label>
      </div>

      <div class="modal-action">
        <form method="dialog">
          <button class="btn">Close</button>
        </form>
      </div>
    </div>
  </dialog>
</template>

<script setup>
import NavBar from '@/components/NavBar.vue'
import { SmoothieChart, TimeSeries } from 'smoothie'
import { onMounted, onUnmounted, ref } from 'vue'
import { useSerial } from '@/composables/useSerial'
import { useChartColors } from '@/composables/useChartColors'
import LegendBar from '@/components/LegendBar.vue'

const channelTimeSeries = ref([])
const chartContainer = ref(null)
const canvasWidth = ref(800)
const canvasHeight = ref(800)

const createChannelTimeSeries = () => {
  channelTimeSeries.value = []
  const chartColors = useChartColors(channelLabels.value.length)

  for (let i = 0; i < availableChannels.value; i++) {
    if (usedChannels.value[i]) {
      const series = new TimeSeries()
      channelTimeSeries.value.push(series)

      smoothie.addTimeSeries(series, {
        lineWidth: 3,
        strokeStyle: chartColors[i],
        fillToBottom: false,
        interpolation: 'linear'
      })
    }
  }
}

const streamTo = () => {
  smoothie.streamTo(document.getElementById('chart'), 0)
}

const {
  connect,
  disconnect,
  startRecording,
  stopRecording,
  startSampling,
  stopSampling,
  mark,
  samplingRate,
  availableChannels,
  usedChannels,
  channelLabels,
  connected,
  loading,
  recording,
  sampling
} = useSerial(createChannelTimeSeries, streamTo, channelTimeSeries)

const smoothie = new SmoothieChart({
  millisPerPixel: 4,
  grid: { fillStyle: '#00000000', strokeStyle: '#00000000', borderVisible: false },
  labels: { disabled: true, intermediateLabelSameAxis: false },
  tooltipLine: { strokeStyle: '#bbbbbb' },
  yRangeFunction: () => {
    return { min: 0, max: 1023 }
  }
})

const handleResize = () => {
  if (chartContainer.value) {
    canvasHeight.value = chartContainer.value.clientHeight
    canvasWidth.value = chartContainer.value.clientWidth
  }
}

onMounted(() => {
  createChannelTimeSeries()
  window.addEventListener('resize', handleResize)
  handleResize()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>
