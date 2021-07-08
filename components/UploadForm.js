import React, { useState, useCallback } from 'react'
import { Box, Button } from '@chakra-ui/core'
import fetch from 'node-fetch'
import waitFileUpload from 'lib/waitFileUpload'
import waitTranscript from 'lib/waitTranscript'

export default React.memo(({ initialFields, onFileChange, onSubmit }) => {
  console.log('UploadForm rendered!!!!!!')

  const [fields, setFields] = useState(initialFields)
  const [filename, setFilename] = useState('')
  const [isSubmiting, setIsSubmiting] = useState(false)

  const handleFileChange = useCallback((e) => {
    const input = e.target
    if ('files' in input && input.files.length > 0) {
      const file = input.files[0]
      setFilename(file.name)
      if (onFileChange) {
        onFileChange(file)
      }
    }
  }, [])

  const handleSubmit = async (e) => {
    setIsSubmiting(true)
    console.log('Form submitted!')
    await waitFileUpload(fields.key)
    const rootUrl = process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : 'https://speech-blond.vercel.app'
    const speechResult = await fetch(rootUrl + `/api/speech?key=${fields.key}`).then((res) => res.json())
    console.log('speechResult', speechResult)
    if (speechResult && speechResult.name) {
      const transcriptResult = await waitTranscript(speechResult.name)
      console.log('transcriptResult', transcriptResult)
      if (transcriptResult && transcriptResult.response && transcriptResult.response.results) {
        const results = transcriptResult.response.results
        const text = results
          .map(result => result.alternatives[0].transcript)
          .join('')
        console.log('transcription', text)
        if (onSubmit) {
          onSubmit(text)
        }
      }
    }

    const newFields = await fetch(rootUrl + '/api/fields').then(res => res.json())
    setFields(newFields)
    setIsSubmiting(false)
  }

  return (
    <form id='upload-form' action={`https://${fields.bucket}.storage.googleapis.com`} method='post' encType='multipart/form-data' onSubmit={handleSubmit}>
      <input type='hidden' name='key' value={fields.key} />
      <input type='hidden' name='bucket' value={fields.bucket} />
      <input type='hidden' name='GoogleAccessId' value={fields.GoogleAccessId} />
      <input type='hidden' name='policy' value={fields.policy} />
      <input type='hidden' name='signature' value={fields.signature} />
      <input type='hidden' name='Content-Type' value={fields['Content-Type']} />

      <Box>
        <label htmlFor='file-upload' className={`custom-file-upload ${isSubmiting ? 'disabled' : ''}`} onClick={isSubmiting ? e => e.preventDefault() : undefined}>
          開啟 .mp3 音頻檔
        </label>
        <input id='file-upload' name='file' type='file' accept='audio/mpeg, audio/ogg, audio/*' onChange={handleFileChange} />
        <style jsx>{`
          input[type="file"] {
            display: none;
          }
          .custom-file-upload {
            border: 1px solid #fff;
            display: inline-flex;
            cursor: pointer;
            border-radius: 0.25rem;
            height: 2.5rem;
            min-width: 2.5rem;
            font-size: 1rem;
            padding-left: 1rem;
            padding-right: 1rem;
            vertical-align: middle;
            line-height: 1.2;
            font-weight: 600;
            align-items: center;
            justify-content: center;
          }
          .custom-file-upload.disabled {
            opacity: 0.4;
            cursor: not-allowed;
            box-shadow: none;
          }
        `}
        </style>
      </Box>
      {!!filename && (
        <>
          <Box mt='2'>
            {filename}
          </Box>
          <Box mt='2'>
            <Button
              form='upload-form'
              type='submit'
              variant='outline'
              borderColor='white'
              isLoading={isSubmiting}
              loadingText='上傳和分析中'
            >
              上傳到 Google A.I. 作字幕分析
            </Button>
          </Box>
        </>
      )}
    </form>
  )
})
