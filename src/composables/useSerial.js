import { ref, watch } from 'vue'
import StreamSaver from 'streamsaver'

export function useSerial(createChannelTimeSeries, streamTo, channelTimeSeries) {
  const port = ref(null)
  const loading = ref(false)
  const connected = ref(false)
  const sampling = ref(false)
  const recording = ref(false)
  const readPromise = ref(null)
  const boardName = ref('')
  const availableChannels = ref(6)
  const usedChannels = ref([1, 0, 0, 0, 0, 0])
  const samplingRate = ref(100)
  const channels = ref([])
  const channelLabels = ref([])

  const toMark = ref(0)

  // CSV buffer
  const sampleCounter = ref(0)
  let fileStream
  let writer

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
    if (!recording.value) return
    toMark.value = 1
  }

  const startRecording = () => {
    recording.value = true
    sampleCounter.value = 0

    const filename = `recording-${boardName.value}-${Date.now()}-${samplingRate.value}`
    const usedChannelLabels = usedChannels.value
      .filter((channel) => channel)
      .map((channel) => channelLabels.value[usedChannels.value.indexOf(channel)])
    const fileExtension = `${filename}-${usedChannelLabels.join('-')}.csv`
    fileStream = StreamSaver.createWriteStream(fileExtension)
    writer = fileStream.getWriter()

    // Write CSV header
    const header = [
      'timestamp',
      'sample',
      ...usedChannels.value
        .filter((channel) => channel)
        .map((channel) => channelLabels.value[usedChannels.value.indexOf(channel)]),
      'mark'
    ].join(',')
    writer.write(new TextEncoder().encode(header + '\n'))
  }

  const stopRecording = () => {
    recording.value = false
    writer.close()
  }

  const disconnect = async () => {
    if (port.value) {
      await port.value.close()
      port.value = null
      connected.value = false
      sampling.value = false
      readPromise.value = null
      fileStream = null
      writer = null
      toMark.value = 0
      boardName.value = ''
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

    if (decoded.length >= 3) {
      boardName.value = decoded[0]
      availableChannels.value = parseInt(decoded[1])
      samplingRate.value = parseInt(decoded[2])
      channelLabels.value = decoded.slice(3, availableChannels.value + 3)
      usedChannels.value = decoded
        .slice(availableChannels.value + 3)
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
          const channelsData = line.split(',').map((value) => parseInt(value))
          channels.value = channelsData
          channelsData.forEach((value, index) => {
            if (channelTimeSeries.value[index]) {
              channelTimeSeries.value[index].append(Date.now(), value)
            }
          })
          if (recording.value) {
            const row = [
              Date.now(),
              sampleCounter.value++,
              ...usedChannels.value
                .filter((channel, index) => channel && channelsData[index])
                .map((channel, index) => channelsData[index]),
              toMark.value
            ].join(',')
            writer.write(new TextEncoder().encode(row + '\n'))
            toMark.value = 0
          }
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
    boardName,
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
