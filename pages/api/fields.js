import express from 'express'

// google storage lib
const CloudStorage = require('gcs-signed-urls')(
`把 google-services-private-key.pem 的內容複製到這邊`,
  'subtitle@getting-started-210713.iam.gserviceaccount.com',
  'getting-started-210713-mlengine'
)

const app = express()

// 產生上傳檔案的 fields 資料, 用在 form 的.
app.use(function (req, res, next) {
  const fields = CloudStorage.uploadRequest('example.mp3', 'key' + Date.now() + '.mp3')
  res.json(fields)
})

export default app
