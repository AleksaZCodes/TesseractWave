<template>
  <div class="h-screen p-2 flex flex-col gap-2 justify-between">
    <div class="card flex-grow overflow-hidden" ref="chartContainer">
      <canvas id="chart" :width="canvasWidth" :height="canvasHeight"></canvas>
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

      <button class="btn" v-if="connected" @click="sampling ? stopSampling() : startSampling()">
        <i
          class="fa-solid"
          :class="[
            sampling ? 'text-red-400 fa-stop' : 'text-primary fa-play',
            loading ? 'fa-fade' : ''
          ]"
        ></i>
        {{ sampling ? 'Stop' : 'Start' }}
      </button>

      <button
        class="btn"
        v-if="connected"
        onclick="options.showModal()"
        :disabled="loading || sampling"
      >
        <i class="fa-solid fa-gear"></i> Options
      </button>
    </div>
  </div>
  <dialog id="options" class="modal">
    <div class="modal-box">
      <h3 class="font-bold text-lg">Hello!</h3>
      <p class="py-4">Press ESC key or click the button below to close</p>
      <div class="modal-action">
        <form method="dialog">
          <button class="btn">Save</button>
        </form>
      </div>
    </div>
  </dialog>
</template>

<script setup>
import { SmoothieChart, TimeSeries } from 'smoothie'
import { onMounted, onUnmounted, ref } from 'vue'

const loading = ref(false)
const connected = ref(false)

const port = ref(null)
const channels = ref([])
const channelTimeSeries = ref([]) // Array to hold TimeSeries for each channel
const channelLabels = ref([])
const sampling = ref(false)
const usedChannels = ref(6)
const samplingRate = ref(1000)
const readPromise = ref(null)
const chartContainer = ref(null)
const canvasWidth = ref(800) // Initial width
const canvasHeight = ref(800) // Initial height

const smoothie = new SmoothieChart({
  millisPerPixel: 5,
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
    console.log('channel')

    smoothie.addTimeSeries(series, {
      lineWidth: 3,
      strokeStyle: `hsl(${(i * 360) / usedChannels.value}, 100%, 50%)`,
      fillToBottom: false,
      interpolation: 'bezier'
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
