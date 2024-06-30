import { ref, watch } from 'vue'

export function useSerial(createChannelTimeSeries, streamTo, channelTimeSeries) {
  const port = ref(null)
  const loading = ref(false)
  const connected = ref(false)
  const sampling = ref(false)
  const recording = ref(false)
  const readPromise = ref(null)
  const availableChannels = ref(6)
  const usedChannels = ref([1, 0, 0, 0, 0, 0])
  const samplingRate = ref(100)
  const channels = ref([])
  const channelLabels = ref([])

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
    const usedChannelsStr = usedChannels.value.map((used) => (used ? 1 : 0)).join('')
    const command = `s${sampling.value ? '1' : '0'},${samplingRate.value},${usedChannelsStr}\n`
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
      availableChannels.value = parseInt(decoded[0])
      samplingRate.value = parseInt(decoded[1])
      channelLabels.value = decoded.slice(2, availableChannels.value + 2)
      usedChannels.value = decoded
        .slice(availableChannels.value + 2)
        .map((used) => (used == 1 ? true : false))
    } else {
      console.error('Invalid info format received')
    }
  }

  const startSampling = async () => {
    sampling.value = true
    await sendSettings()
    createChannelTimeSeries()
    streamTo()
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
        buffer = lines.pop()

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

  watch(usedChannels, createChannelTimeSeries)

  return {
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
  }
}
