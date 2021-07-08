import fetch from 'node-fetch'

let interval

// 透過 api 來檢查 speech-to-text 是否已完成 processing
async function check (name) {
  const rootUrl = process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://speech-blond.vercel.app'
  const result = await fetch(rootUrl + `/api/operations?name=${name}`)
    .then((response) => {
      return response.json()
    })

  if (result && result.done) {
    return result
  }
  return false
}

// 每隔兩秒檢查一下 speech-to-text 是否已完成 processing
// 直到有才結束
export default async (key) => {
  clearInterval(interval)
  return new Promise((resolve, reject) => {
    interval = setInterval(async () => {
      const value = await check(key)
      if (value) {
        clearInterval(interval)
        resolve(value)
      }
    }, 2000)
  })
}
