// Packages
import React, { useEffect, useRef, createRef } from 'react'
import { Box, PseudoBox, Input } from '@chakra-ui/core'
import { FastField } from 'formik'
import { useWindowSize } from 'react-use'

// lib
import { draw, playAudio } from 'lib/audio'

let currentInput = null

const Canvas = ({ index, data, start, length, blockHeight, clips, setFocusedClipStart, setCurrentInput }) => {
  console.log({ index, start, length })
  // ref
  const canvasRef = useRef(null)
  // window 寬度改變, 會重新 render canvases
  const { width } = useWindowSize()
  // const [focusedClipStart, setFocusedClipStart] = useState(null)

  // componentDidMount 和 componentDidUpdate 時才開始畫
  useEffect(() => {
    console.log('draw!!!!!!!!!!!!!!!!!!!!!!!')
    draw(canvasRef.current, data, start, length, blockHeight)
  }, [data, width])

  // // 準備參數
  // // clips 為根據無聲音的分段
  // const clips = []
  // // clip 開始位置為 canvas block 的開始位置
  // let clipStart = start
  // // 一開始沒有 clip end
  // let clipEnd = null
  // // 由 blocks 的開始至結束
  // for (let i = start; i < start + length; i++) {
  //   // block 的值少過 0.01 (無聲音)
  //   if (data[i] < 0.01) {
  //     if (!clipEnd) {
  //       // 若什麼都未開始，重置 clip start 的值
  //       clipStart = i
  //     } else {
  //       // 若已經開始了, 更新 clip end 的值
  //       clipEnd = i

  //       // 現在已經有 clip start 和 clip end
  //       // 但需要判斷他們是否真的適合變成一個 clip
  //       // end - start >= 4 即係大於或等於 1 秒
  //       if (clipEnd && clipEnd - clipStart + 1 >= 4) {
  //         // 若果「過長」，大於 5 秒, 那要需要再分割
  //         if (clipEnd - clipStart + 1 > (4 * 5)) {
  //           // 將這個「過長」clip / 20, 即以 5 秒作為一part，最後知道這個大 clip 要變成幾多 part
  //           const parts = Math.ceil((clipEnd - clipStart + 1) / (4 * 5))
  //           // 每 part 有幾多個 blocks
  //           const num = Math.floor((clipEnd - clipStart + 1) / parts)
  //           console.log(parts, num)
  //           // 每 part loop, 變成一個新 clip
  //           for (let j = 0; j < parts; j++) {
  //             // part start 和 part end
  //             const partStart = clipStart + j * num
  //             let partEnd = partStart + num - 1
  //             // 處理最後一part時, partEnd 有可能有錯
  //             // 這裡做一個修正
  //             if (j === parts - 1) {
  //               partEnd = clipEnd
  //             }
  //             // 新增 clip
  //             clips.push({
  //               clipStart: partStart,
  //               clipEnd: partEnd,
  //               top: (partStart - start) * blockHeight,
  //               height: (partEnd - partStart + 1) * blockHeight
  //             })
  //           }
  //         } else {
  //           // 少於五秒，接受這個 clip
  //           clips.push({ clipStart, clipEnd, top: (clipStart - start) * blockHeight, height: (clipEnd - clipStart + 1) * blockHeight })
  //         }
  //         // 準備下一段 clip
  //         clipStart = i + 1
  //         clipEnd = null
  //       }
  //     }
  //   } else {
  //     // 有聲音，不斷更新 clipEnd
  //     clipEnd = i
  //     // 若 i 為最後一個, 則成立
  //     if (i === start + length - 1) {
  //       // 若超過 1 秒，則成立
  //       if (clipEnd && clipEnd - clipStart + 1 >= 4) {
  //         // 建立最後的 clip
  //         clips.push({ clipStart, clipEnd, top: (clipStart - start) * blockHeight, height: (clipEnd - clipStart + 1) * blockHeight })
  //       }
  //     }
  //   }
  // }

  // console.log('focusedClipStart', focusedClipStart)

  return (
    // div 高度跟長度和 block height 有關
    <Box pos='relative' h={`${length * blockHeight}px`}>
      {/* 圖表 w 只有 30% */}
      <Box pos='absolute' top='0' left='0' w='30%' zIndex='1000'>
        <canvas
          ref={canvasRef}
          style={{
            // width 100%
            width: '100%',
            // 高度跟長度和 block height 有關
            height: `${length * blockHeight}px`
          }}
          // mouse move 時
          onMouseMove={(e) => {
            const rect = canvasRef.current.getBoundingClientRect()
            const y = e.clientY - rect.top
            if (y >= 0) {
              const selectedBlock = Math.floor(y / blockHeight) + start
              // 知道一下那個 block 的數據，輸出一下
              console.log(selectedBlock, data[selectedBlock])
            }
          }}
        />
      </Box>
      <Box>
        {/* 每個 clip 都給它一個 input */}
        {clips.map(({ top, height, clipStart, clipEnd }, index) => {
          const ref = createRef()
          return (
            <FastField key={index} name={`subtitles.${clipStart}`}>
              {({ field, form, meta }) => {
                return (
                  <PseudoBox
                    pos='absolute'
                    top={top + 'px'}
                    left='0'
                    w='100%'
                    h={height + 'px'}
                    borderTopWidth='1px'
                    borderBottomWidth='1px'
                    borderColor='gray.600'
                    onClick={() => {
                      // onclick 時 focus input 和 play audio
                      if (ref.current) {
                        ref.current.focus()
                      }
                      playAudio(clipStart * 0.25, (clipEnd - clipStart + 1) * 0.25)
                    }}
                    _focusWithin={{ bg: 'blackAlpha.400' }}
                  >
                    <Box
                      pos='absolute'
                      top='0'
                      left='30%'
                      d='flex'
                      alignItems='center'
                      w='30%'
                    >
                      <Box ml='-40px' w='40px' pr={1} textAlign='right' zIndex='2000'>
                        {/* 輸出 clip 秒數 */}
                        {((clipEnd - clipStart + 1) * 0.25).toFixed(1)}s
                      </Box>
                      <Box w='100%'>

                        <Input
                          ref={ref}
                          w='100%'
                          size='sm'
                          mt='1'
                          {...field}
                          value={field.value || ''}
                          onFocus={() => {
                            // focus 時 play audio
                            if (ref.current !== currentInput) {
                              playAudio(clipStart * 0.25, (clipEnd - clipStart + 1) * 0.25)
                            }
                            setFocusedClipStart(clipStart)
                            if (ref.current) {
                              currentInput = ref.current
                              setCurrentInput(ref.current)
                            }
                          }}
                          onmou
                        />

                      </Box>
                    </Box>

                  </PseudoBox>
                )
              }}
            </FastField>
          )
        })}
      </Box>
    </Box>
  )
}

export default Canvas
