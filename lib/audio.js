// https://css-tricks.com/making-an-audio-waveform-visualizer-with-vanilla-javascript/
// https://codepen.io/SitePoint/pen/JRaLVR
// https://gist.github.com/diem1/4fd37cf1542bb3ab880e
// https://jsbin.com/bigudupera/edit?html,css,js,output
// https://stackoverflow.com/questions/30134803/webaudio-audiocontext-jump-to-position

let audioContext
let buffer
let source

// 由邊到開始播
// 播幾奈
// buffer 來自 global
export function playAudio (offsetInSeconds, duration) {
  if (source) {
    source.stop(0)
    source = null
  }
  source = audioContext.createBufferSource()
  source.connect(audioContext.destination)
  source.buffer = buffer
  source.start(audioContext.currentTime, offsetInSeconds, duration)
}

// 由檔案讀取 rawData 和 duration
export const getAudioDataFromFile = async (file) => {
  // AudioContext
  audioContext = new (window.AudioContext || window.webkitAudioContext)()
  // file reader
  const reader = new window.FileReader()
  // 檔名
  reader.filename = file.name
  // 準備 file reader 的 promise
  const p = new Promise((resolve, reject) => {
    reader.onload = event => resolve(event.target.result)
    reader.onerror = error => reject(error)
    reader.readAsArrayBuffer(file)
  })
  // file reader 讀檔處理
  return p
    // 將 buffer 交比 decodeAudioData
    .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
    .then(audioBuffer => {
      // 將 audioBuffer 存到 global buffer
      // 播音樂用 only
      buffer = audioBuffer

      // 獲取 rawData 和 duration
      const rawData = audioBuffer.getChannelData(0)
      const duration = audioBuffer.duration
      return {
        rawData,
        duration,
        filename: file.name
      }
    })
}

// 將 rawData 根據 samples 的數量分組
export const filterData = (rawData, samples) => {
  // rawData 分成 samples 組
  // 而每組個大小就是 blockSize
  const blockSize = Math.floor(rawData.length / samples) // the number of samples in each subdivision
  const filteredData = []
  console.log('rawData.length', rawData.length)
  console.log('blockSize', blockSize)
  // 根據 samples 每組 loop 下佢
  for (let i = 0; i < samples; i++) {
    // 計算每組的開始位置
    const blockStart = blockSize * i // the location of the first sample in the block
    // 加總一開始為 0
    let sum = 0
    // 將 blockSize 這麼多項的資料加到 sum
    for (let j = 0; j < blockSize; j++) {
      sum = sum + Math.abs(rawData[blockStart + j]) // find the sum of all the samples in the block
    }
    // 將 sum 的平均值加回到 filteredData
    filteredData.push(sum / blockSize) // divide the sum by the block size to get the average
  }
  return filteredData
}

// 標準化數據
export const normalizeData = filteredData => {
  console.log('Math.max(...filteredData)', Math.max(...filteredData))
  // 找一找 filteredData 中哪一個是最大的
  const multiplier = Math.pow(Math.max(...filteredData), -1)
  // 將 filteredData 除以最大的值，得出由 0 ~ 1 的值
  const result = filteredData.map(n => n * multiplier)
  console.log('Math.max(...result)', Math.max(...result))
  return result
}

// 已知 canvas, data, 所屬的開始位置, 長度, block 的高度
// 然後畫 canvas 出來
export const draw = (canvas, normalizedData, start, length, height) => {
  // 設定 canvas 的長和寬
  canvas.width = canvas.offsetWidth
  canvas.height = canvas.offsetHeight
  // canvas context
  const ctx = canvas.getContext('2d')

  // draw the line segments
  // 由開始位置至結束位置
  for (let i = start; i < start + length; i++) {
    // y 為該 block 所在的 y 座標
    const y = height * (i - start)
    // block 的寬度 = 該 block 的值 (0~1) * canvas 的寬度, 再乘  0.95 是為了不要太寬
    let width = normalizedData[i] * canvas.offsetWidth * 0.95

    // 最大最小值的處理
    if (width < 0) {
      width = 0
    } else if (width > canvas.offsetWidth) {
      width = canvas.offsetWidth
    }

    // 開始畫 block
    drawLineSegment(ctx, y, height, width)
  }
}

// 已知 canvas 的 ctx, y 座標, 高度, 和寬度
// 畫 block
export const drawLineSegment = (ctx, y, height, width) => {
  // 線
  ctx.lineWidth = 1 // how thick the line is
  ctx.strokeStyle = '#fff' // what color our line is

  // 開始畫
  ctx.beginPath()
  // 去到 y 座標
  ctx.moveTo(0, y)
  // 畫一條水平線
  ctx.lineTo(width, y)
  // 加個圓角
  ctx.arc(width, y + height / 2, height / 2, Math.PI * 1.5, Math.PI * 0.5, false)
  // 再畫水平線返回
  ctx.lineTo(0, y + height)
  // 畫線
  ctx.stroke()
  // ctx.fillStyle = 'blue'
  // ctx.fill()
}
