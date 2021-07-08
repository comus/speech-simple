import fetch from 'node-fetch'

let interval

// 透過 api 來檢查 gcs 是否已存在該檔案
async function check (key) {
  const rootUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://speech-blond.vercel.app'
  const result = await fetch(rootUrl + `/api/exists?key=${key}`)
    .then((response) => {
      return response.json()
    })

  if (result && result.exists) {
    return true
  }
  return false
}

// 每隔兩秒檢查一下 gcs 是否存在該 key 的檔案
// 直到有才結束
export default async (key) => {
  clearInterval(interval)
  return new Promise((resolve, reject) => {
    interval = setInterval(async () => {
      const value = await check(key)
      if (value) {
        clearInterval(interval)
        resolve()
      }
    }, 2000)
  })
}
