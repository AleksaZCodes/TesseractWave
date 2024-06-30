const primaryColor = 'hsl(149, 59%, 54%)'

const primaryHSL = primaryColor.slice(4, -1).split(', ')
const primaryHue = parseInt(primaryHSL[0])

export function useChartColors(numColors) {
  const chartColors = []
  for (let i = 0; i < numColors; i++) {
    const hue = (i * 360.0) / numColors + primaryHue
    chartColors[i] = `hsl(${hue}, ${primaryHSL[1]}, ${primaryHSL[2]})`
  }
  return chartColors
}
