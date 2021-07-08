import express from 'express'
import fetch from 'node-fetch'

const app = express()

// 把 gcs 的網址 (根據 key) 交比 speech-to-text API
app.use(async function (req, res, next) {
  // 返回 result
  // 有 result.name, 可以比客戶端稍後用來 call 其他 api 檢查進度
  const result = await fetch('https://speech.googleapis.com/v1/speech:longrunningrecognize?key=AIxxxxxxxxxxxxxxxxxxxxx', {
    method: 'POST',
    body: JSON.stringify({
      config: {
        // MP3
        encoding: 8,
        // 44100
        sampleRateHertz: 44100,
        // 廣東話
        languageCode: 'cmn-Hans-CN'
      },
      audio: {
        uri: `gs://getting-started-210713-mlengine/${req.query.key}`
      }
    })
  })
    .then((response) => {
      return response.json()
    })
    .catch(error => {
      console.log(error)
    })

  res.json(result)
})

export default app
