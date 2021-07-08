import express from 'express'
import fetch from 'node-fetch'

const app = express()

// 由 speech-to-text 返回的 name, 再檢查進度
app.use(async function (req, res, next) {
  // 返回進度 result, 若果完成, transcript 也會存在 result 內.
  const result = await fetch(`https://speech.googleapis.com/v1/operations/${req.query.name}?key=AIxxxxxxxxxxxxxxxxxxxxx`)
    .then((response) => {
      return response.json()
    })
    .catch(error => {
      console.log(error)
    })

  res.json(result)
})

export default app
