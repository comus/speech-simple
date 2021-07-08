// Packages
import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { withTheme } from 'emotion-theming'
import { Box, Heading, Button, Text, IconButton } from '@chakra-ui/core'
import fetch from 'node-fetch'
import { useLocalStorage } from 'react-use'
import { Formik, Form } from 'formik'
import { useRouter } from 'next/router'

// components
import UploadForm from 'components/UploadForm'
import Canvas from 'components/Canvas'

// lib
import { getAudioDataFromFile, filterData, normalizeData } from 'lib/audio'

const useLocalContext = data => {
  const [ctx] = useState({})
  Object.keys(data).forEach(key => {
    ctx[key] = data[key]
  })
  return ctx
}

// Page
const Index = ({ fields = {} }) => {
  // router
  const router = useRouter()
  const { clipsecond = 3 } = router.query
  // audio 的 data, 由 audioBuffer.getChannelData 讀取 rawData
  // 裡面包含 rawData 和 duration, filename
  const [audioData, setAudioData] = useState(null)
  // 這裡是 0.25 秒當成一份
  // samples = 最後將成段錄音分成幾多份
  const [samples, setSamples] = useState(null)
  // 圖表中每個矩形的高度是 10
  const [blockHeight] = useState(10)
  // 將一段音頻變成多個 canvas 圖表
  // 這是 array, 用來存低多個 Canvas components
  // const [canvases, setCanvases] = useState(null)
  // transcription text
  const [transcriptionText, setTranscriptionText] = useLocalStorage('transcriptionText', '')
  // startFlag (新增字幕時用)
  const [transcriptionStartFlag, setTranscriptionStartFlag] = useLocalStorage('transcriptionStartFlag', 0)
  // 所有已填的字幕
  const [subtitles, setSubtitles] = useLocalStorage('subtitles', {})
  // canvases
  const [canvases, setCanvases] = useState(null)
  useEffect(() => {
    // 沒有 audio data 就算了
    if (!audioData) return

    // 經過 filter，將 rawData 返回 samples 咁多項的 array
    // 經過 normalizeData 得出全部的值為 0 ~ 1 的 array
    const normalizedData = normalizeData(filterData(audioData.rawData, samples))

    // 所有 block 的數量即是 samples 的數量
    const totalBlock = samples
    // 每個 canvas 最多只負責 400 個 blocks
    const numOfBlockInOneCanvas = Math.floor(4000 / blockHeight)
    // 所以求到我們所需的 canvas 數目
    const numOfCanvases = Math.ceil(totalBlock / numOfBlockInOneCanvas)
    console.log({
      totalBlock,
      numOfBlockInOneCanvas,
      numOfCanvases
    })

    // 開始產生 canvases components
    const result = []
    // 每個 canvas 中
    for (let i = 0; i < numOfCanvases; i++) {
      // 計算屬於這個 canvas 的 block 初始位置
      const start = i * numOfBlockInOneCanvas

      // 計算屬於這個 canvas 的 blocks 長度
      let length
      // 若果只需一個 canvas，長度為全長
      if (numOfCanvases === 1) {
        length = totalBlock
      } else {
        // 若果需要多個 canvas，首先計算一下剩余幾多個 blocks
        const remaining = totalBlock - start
        // 若果剩余幾 blocks 多過 400 個
        if (remaining >= numOfBlockInOneCanvas) {
          // 長度為 400
          length = numOfBlockInOneCanvas
        } else {
          // 少過 400 個，咁長度就為剩低的
          length = remaining
        }
      }

      // 將所有參數交比 Canvas, 它會 render 好處理好的
      // canvases.push(
      //   <Canvas key={i} index={i} data={normalizedData} start={start} length={length} blockHeight={blockHeight} />
      // )

      // 準備參數
      // clips 為根據無聲音的分段
      const clips = []
      // clip 開始位置為 canvas block 的開始位置
      let clipStart = start
      // 一開始沒有 clip end
      let clipEnd = null
      // 由 blocks 的開始至結束
      for (let i = start; i < start + length; i++) {
        // console.log('i=', i, 'start + length', start + length)
        // block 的值少過 0.01 (無聲音)
        if (normalizedData[i] < 0.01) {
          if (!clipEnd) {
            // 若什麼都未開始，重置 clip start 的值
            clipStart = i
          } else {
            // 若已經開始了, 更新 clip end 的值
            clipEnd = i

            // 現在已經有 clip start 和 clip end
            // 但需要判斷他們是否真的適合變成一個 clip
            // end - start >= 4 即係大於或等於 1 秒
            if (clipEnd && clipEnd - clipStart + 1 >= 4) {
              // 若果「過長」，大於 5 秒, 那要需要再分割
              if (clipEnd - clipStart + 1 > (4 * clipsecond)) {
                // 將這個「過長」clip / 20, 即以 5 秒作為一part，最後知道這個大 clip 要變成幾多 part
                const parts = Math.ceil((clipEnd - clipStart + 1) / (4 * clipsecond))
                // 每 part 有幾多個 blocks
                const num = Math.ceil((clipEnd - clipStart + 1) / parts)
                // console.log('若果「過長」，大於 5 秒', parts, num)
                // 每 part loop, 變成一個新 clip
                for (let j = 0; j < parts; j++) {
                  // part start 和 part end
                  const partStart = clipStart + j * num
                  let partEnd = partStart + num - 1
                  // 處理最後一part時, partEnd 有可能有錯
                  // 這裡做一個修正
                  if (j === parts - 1) {
                    partEnd = clipEnd
                  }
                  // 新增 clip
                  // console.log('partStart partEnd', partStart, partEnd, (partEnd - partStart + 1) * 0.25)
                  if (partEnd - partStart + 1 >= 4) {
                    clips.push({
                      clipStart: partStart,
                      clipEnd: partEnd,
                      top: (partStart - start) * blockHeight,
                      height: (partEnd - partStart + 1) * blockHeight
                    })
                  }
                }
              } else {
                // 少於五秒，接受這個 clip
                // console.log('少於五秒，接受這個 clip', clipStart, clipEnd, (clipEnd - clipStart + 1) * 0.25)
                clips.push({ clipStart, clipEnd, top: (clipStart - start) * blockHeight, height: (clipEnd - clipStart + 1) * blockHeight })
              }
              // 準備下一段 clip
              clipStart = i + 1
              clipEnd = null
            }
          }
        } else {
          // 有聲音，不斷更新 clipEnd
          clipEnd = i
          // 若 i 為最後一個, 則成立
          if (i === start + length - 1) {
            // 若超過 1 秒，則成立
            if (clipEnd && clipEnd - clipStart + 1 >= 4) {
              // 建立最後的 clip,
              // [bug] 最後一個有可能好長
              // console.log('建立最後的 clip', i, start + length - 1)
              // clips.push({ clipStart, clipEnd, top: (clipStart - start) * blockHeight, height: (clipEnd - clipStart + 1) * blockHeight })

              // 若果「過長」，大於 5 秒, 那要需要再分割
              if (clipEnd - clipStart + 1 > (4 * clipsecond)) {
                // 將這個「過長」clip / 20, 即以 5 秒作為一part，最後知道這個大 clip 要變成幾多 part
                const parts = Math.ceil((clipEnd - clipStart + 1) / (4 * clipsecond))
                // 每 part 有幾多個 blocks
                const num = Math.ceil((clipEnd - clipStart + 1) / parts)
                // console.log('若果「過長」，大於 5 秒', parts, num)
                // 每 part loop, 變成一個新 clip
                for (let j = 0; j < parts; j++) {
                  // part start 和 part end
                  const partStart = clipStart + j * num
                  let partEnd = partStart + num - 1
                  // 處理最後一part時, partEnd 有可能有錯
                  // 這裡做一個修正
                  if (j === parts - 1) {
                    partEnd = clipEnd
                  }
                  // 新增 clip
                  // console.log('partStart partEnd', partStart, partEnd, (partEnd - partStart + 1) * 0.25)
                  if (partEnd - partStart + 1 >= 4) {
                    clips.push({
                      clipStart: partStart,
                      clipEnd: partEnd,
                      top: (partStart - start) * blockHeight,
                      height: (partEnd - partStart + 1) * blockHeight
                    })
                  }
                }
              } else {
                // 少於五秒，接受這個 clip
                // console.log('少於五秒，接受這個 clip', clipStart, clipEnd, (clipEnd - clipStart + 1) * 0.25)
                clips.push({ clipStart, clipEnd, top: (clipStart - start) * blockHeight, height: (clipEnd - clipStart + 1) * blockHeight })
              }
            }
          }
        }
      }

      result.push({
        key: i,
        index: i,
        data: normalizedData,
        start,
        length,
        blockHeight,
        clips
      })
    }

    setCanvases(result)
  }, [audioData])
  // filename
  const [filename, setFilename] = useLocalStorage('filename', audioData ? audioData.filename : '')
  // resetting
  const [resetting, setResetting] = useState(false)
  // local ctx
  const ctx = useLocalContext({ audioData, canvases, subtitles, filename })
  const [focusedClipStart, setFocusedClipStart] = useState(-1)
  const [currentInput, setCurrentInput] = useState(null)

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // 開啟 mp3 後
  const handleFileChange = useCallback(async (file) => {
    // 清空 subtitles?
    if (file.name !== ctx.filename) {
      console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
      setFilename(file.name)
      setSubtitles({})
      setResetting(true)
      setTimeout(() => setResetting(false), 1)
      setCanvases(null)
      setFocusedClipStart(-1)
    }
    // 由檔案讀取 rawData 和 duration
    const data = await getAudioDataFromFile(file)
    // 知道 samples 數量, 以 0.25 秒作為劃分
    const samples = Math.ceil(data.duration / 0.25)
    setSamples(samples)
    // 將 rawData 和 duration 存到 audioData
    setAudioData(data)
  }, [])

  const download = useCallback(() => {
    let text = ''
    let i = 1
    ctx.canvases.forEach(({ clips }) => {
      clips.forEach(({ clipStart, clipEnd }, index) => {
        if (ctx.subtitles[clipStart]) {
          if (index === 0 && clipStart !== 0) {
            const timeStart = new Date(0 * 1000).toISOString().substr(11, 12).replace('.', ',')
            const timeEnd = new Date(0.1 * 1000).toISOString().substr(11, 12).replace('.', ',')
            text += i + '\n'
            text += `${timeStart} --> ${timeEnd}` + '\n'
            text += '!' + '\n'
            text += '\n'
            i++
          }

          console.log(new Date(clipStart * 0.25 * 1000).toISOString())
          const timeStart = new Date(clipStart * 0.25 * 1000).toISOString().substr(11, 12).replace('.', ',')
          const timeEnd = new Date((clipEnd + 1) * 0.25 * 1000).toISOString().substr(11, 12).replace('.', ',')
          text += i + '\n'
          text += `${timeStart} --> ${timeEnd}` + '\n'
          text += ctx.subtitles[clipStart] + '\n'
          text += '\n'
          i++
        }
      })
    })

    const filename = Date.now() + '.srt'
    var element = document.createElement('a')
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
    element.setAttribute('download', filename)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }, [])

  const handleTranscription = useCallback(text => {
    setTranscriptionText(text)
    setTranscriptionStartFlag(0)
    setSubtitles({})
    setResetting(true)
    setTimeout(() => setResetting(false), 1)
    setFocusedClipStart(-1)
  }, [])

  const canvasesComponents = useMemo(() => {
    if (!canvases) return null
    return canvases.map(({ key, index, data, start, length, blockHeight, clips }) => {
      return <Canvas key={key} index={index} data={data} start={start} length={length} blockHeight={blockHeight} clips={clips} setFocusedClipStart={setFocusedClipStart} setCurrentInput={setCurrentInput} />
    })
  }, [canvases])

  console.log('transcriptionText (localstorage)', transcriptionText)

  return (
    <Box>
      <Box mt='4' textAlign='center'>
        <Heading as='h1' size='2xl'>字幕編輯器</Heading>
      </Box>
      <Box my='4' textAlign='center'>
        {/* 上傳表格 */}
        <UploadForm
          initialFields={fields}
          onFileChange={handleFileChange}
          onSubmit={handleTranscription}
        />
        {mounted && transcriptionText && (
          <Box mt='2' mx='auto' maxWidth='46rem' pt={5} px={5}>
            <textarea style={{ color: 'black', width: '550px', height: '400px' }} value={transcriptionText} readOnly />
          </Box>
        )}
      </Box>
      {!resetting && (
        <Formik
          initialValues={{ subtitles }}
          validate={values => {
            setSubtitles(values.subtitles)
            return {}
          }}
          onSubmit={(values, { setSubmitting }) => {
            console.log(values)
            download()
          }}
        >
          {({
            values,
            errors,
            touched,
            handleChange,
            handleBlur,
            handleSubmit,
            isSubmitting,
            setFieldValue
          }) => (
            <Form>
              {!!canvases && !!canvases.length && (
                <Box pos='relative'>
                  {/* audio 圖表 */}
                  {canvasesComponents}

                  {focusedClipStart >= 0 && (
                    <Box
                      pos='absolute'
                      top={`${focusedClipStart * blockHeight}px`}
                      left='60%'
                      d='flex'
                      alignItems='center'
                      w='40%'
                    >
                      <IconButton
                        tabIndex='-1'
                        icon='chevron-left'
                        size='sm'
                        m={1}
                        onClick={(e) => {
                          e.stopPropagation()
                          let startFlag = transcriptionStartFlag - 1
                          if (startFlag < 0) startFlag = 0
                          setTranscriptionStartFlag(startFlag)
                          if (currentInput) {
                            currentInput.focus()
                          }
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          let startFlag = transcriptionStartFlag - 20
                          if (startFlag < 0) startFlag = 0
                          setTranscriptionStartFlag(startFlag)
                          if (currentInput) {
                            currentInput.focus()
                          }
                        }}
                      />
                      <Box overflow='hidden' d='flex' p={1} flexGrow={1}>
                        {transcriptionText.substr(transcriptionStartFlag, 20).split('').map((char, index) => {
                          return (
                            <Button
                              tabIndex='-1'
                              key={transcriptionStartFlag + index}
                              mr={1}
                              variant='link'
                              size='sm'
                              onClick={(e) => {
                                e.stopPropagation()
                                const str = (values.subtitles[focusedClipStart] || '') + transcriptionText.substr(transcriptionStartFlag, index + 1)
                                setFieldValue(`subtitles.${focusedClipStart}`, str)
                                setTranscriptionStartFlag(transcriptionStartFlag + index + 1)
                                if (currentInput) {
                                  currentInput.focus()
                                }
                              }}
                            >
                              {char}
                            </Button>
                          )
                        })}
                      </Box>
                      <IconButton
                        tabIndex='-1'
                        icon='chevron-right'
                        size='sm'
                        m={1}
                        onClick={(e) => {
                          e.stopPropagation()
                          let startFlag = transcriptionStartFlag + 1
                          if (startFlag > transcriptionText.length - 1) startFlag = transcriptionText.length - 1
                          setTranscriptionStartFlag(startFlag)
                          if (currentInput) {
                            currentInput.focus()
                          }
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          let startFlag = transcriptionStartFlag + 20
                          if (startFlag > transcriptionText.length - 1) startFlag = transcriptionText.length - 1
                          setTranscriptionStartFlag(startFlag)
                          if (currentInput) {
                            currentInput.focus()
                          }
                        }}
                      />
                    </Box>
                  )}

                  {/* 下載字幕按鈕 */}
                  <Box d='flex' justifyContent='center' pt={10} pb={20}>
                    <Button variant='outline' borderColor='white' size='lg' type='submit'>
                      下載字幕檔案
                    </Button>
                  </Box>
                </Box>
              )}
            </Form>
          )}
        </Formik>
      )}
    </Box>
  )
}

// Page 一開始就先獲取 fields 先, 給 UploadForm 上傳欄位用
Index.getInitialProps = async ({ req }) => {
  const rootUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://speech-blond.vercel.app'
  const fields = await fetch(rootUrl + '/api/fields')
    .then((response) => {
      return response.json()
    })

  return {
    fields
  }
}

export default withTheme(Index)
