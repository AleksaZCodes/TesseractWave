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
        <i class="fa-solid fa-chart-line text-primary"></i> One chart layout
      </div>
      <!-- <div class="flex justify-around items-center w-full gap-2"> -->
      <!-- <Slider class="w-[60%]" v-model="xresolution" :min="1" :max="100" :step="1" /> -->

      <!-- <div
          class="h-2 bg-primary rounded-full flex justify-center items-center"
          :class="`w-[${Math.round(1000 / xresolution[0])}px]`"
        ></div> -->
      <!-- </div> -->
    </div>

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
      <div class="flex gap-2 justify-between items-center mb-4">
        <input
          type="range"
          min="1"
          max="6"
          v-model="usedChannels"
          class="range range-primary"
          step="1"
        />
        <span class="w-[4.5ch] text-right">{{ usedChannels }}</span>
      </div>
      <!-- <div class="grid grid-cols-6 gap-3 md:gap-5">
        <label class="swap swap-flip" v-for="label in channelLabels" :key="label">
          <input type="checkbox" />

          <div
            class="swap-on card w-10 md:w-12 bg-primary text-base-100 font-bold aspect-square justify-center items-center"
          >
            {{ label }}
          </div>
          <div
            class="swap-off card w-10 md:w-12 bg-base-200 font-bold aspect-square justify-center items-center"
          >
            {{ label }}
          </div>
        </label>
      </div> -->

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

const loading = ref(false)
const connected = ref(false)

const port = ref(null)
const channels = ref([])
const channelTimeSeries = ref([]) // Array to hold TimeSeries for each channel
const channelLabels = ref([])
const sampling = ref(false)
const recording = ref(false)
const usedChannels = ref(6)
const samplingRate = ref(100)
const readPromise = ref(null)
const chartContainer = ref(null)
const canvasWidth = ref(800) // Initial width
const canvasHeight = ref(800) // Initial height

const smoothie = new SmoothieChart({
  millisPerPixel: 4,
  grid: { fillStyle: '#00000000', strokeStyle: '#00000000', borderVisible: false },
  labels: { disabled: true, intermediateLabelSameAxis: false },
  tooltipLine: { strokeStyle: '#bbbbbb' },
  yRangeFunction: () => {
    return { min: 0, max: 1023 }
  }
})

// Function to create TimeSeries for each channel
const createChannelTimeSeries = () => {
  channelTimeSeries.value = []
  for (let i = 0; i < usedChannels.value; i++) {
    const series = new TimeSeries()
    channelTimeSeries.value.push(series)

    smoothie.addTimeSeries(series, {
      lineWidth: 3,
      strokeStyle: `hsl(${(((i + 1) * 360) / usedChannels.value - 211) % 360}, 59%, 54%)`,
      fillToBottom: false,
      interpolation: 'linear'
    })
  }
}

// Handle window resize to adjust canvas height
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

// Clean up resize listener on component unmount
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

const connect = async () => {
  try {
    loading.value = true
    port.value = await navigator.serial.requestPort()
    await port.value.open({ baudRate: 115200 })

    // Create a reader to read from the serial port
    const reader = port.value.readable.getReader()
    const decoder = new TextDecoder()

    // Wait for "READY\r\n"
    let received = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) {
        throw new Error('Port closed before READY signal received')
      }
      received += decoder.decode(value)
      if (received.includes('READY\r\n')) {
        break
      }
    }

    // Release the reader lock after reading "READY\r\n"
    reader.releaseLock()

    await getInfo()

    connected.value = true
    loading.value = false
  } catch (error) {
    console.error('Failed to connect:', error)
    loading.value = false
  }
}

const mark = () => {
  console.log('mark')
}

const startRecording = () => {
  recording.value = true
  console.log('startRecording')
}

const stopRecording = () => {
  recording.value = false
  console.log('stopRecording')
}

const disconnect = async () => {
  if (port.value) {
    await port.value.close()
    port.value = null
    connected.value = false
    sampling.value = false
  }
}

const sendSettings = async () => {
  if (!port.value) return
  const writer = port.value.writable.getWriter()
  const command = `s${sampling.value ? '1' : '0'},${usedChannels.value},${samplingRate.value}\n`
  await writer.write(new TextEncoder().encode(command))
  writer.releaseLock()
}

const getInfo = async () => {
  if (!port.value) return
  const writer = port.value.writable.getWriter()
  const command = 'i\n'
  await writer.write(new TextEncoder().encode(command))
  writer.releaseLock()

  const reader = port.value.readable.getReader()
  const decoder = new TextDecoder()
  let received = ''

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) {
        throw new Error('Port closed before complete info received')
      }
      received += decoder.decode(value, { stream: true })
      if (received.includes('\r\n')) {
        break
      }
    }
  } catch (error) {
    console.error('Failed to receive info:', error)
  } finally {
    reader.releaseLock()
  }

  const decoded = received.trim().split('\r\n')[0].split(',')

  if (decoded.length >= 2) {
    usedChannels.value = parseInt(decoded[0])
    samplingRate.value = parseInt(decoded[1])
    channelLabels.value = decoded.slice(2)
  } else {
    console.error('Invalid info format received')
  }
}

const startSampling = async () => {
  sampling.value = true
  await sendSettings()
  createChannelTimeSeries() // Create TimeSeries for each channel
  smoothie.streamTo(document.getElementById('chart'), 0)
  readPromise.value = readSamples()
}

const stopSampling = async () => {
  sampling.value = false
  await readPromise.value
  await sendSettings()
}

const readSamples = async () => {
  if (!port.value) return
  const reader = port.value.readable.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (sampling.value) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let lines = buffer.split('\r\n')
      buffer = lines.pop() // Keep any incomplete line in the buffer

      for (let line of lines) {
        channels.value = line.split(',').map((value) => parseInt(value))
        channels.value.forEach((value, index) => {
          if (channelTimeSeries.value[index]) {
            channelTimeSeries.value[index].append(Date.now(), value)
          }
        })
      }
    }
  } catch (error) {
    console.error('Error reading samples:', error)
  } finally {
    reader.releaseLock()
  }
}
</script>
