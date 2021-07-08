import express from 'express'

// google storage lib
const CloudStorage = require('gcs-signed-urls')(
`把 google-services-private-key.pem 的內容複製到這邊`,
  'subtitle@getting-started-210713.iam.gserviceaccount.com',
  'getting-started-210713-mlengine'
)

const app = express()

// 根據 key 檢查 gcs 檔案是否存在
app.use(function (req, res, next) {
  CloudStorage.exists(req.query.key, value => {
    res.json({ exists: value })
  })
})

export default app
