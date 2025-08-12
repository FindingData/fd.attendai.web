import request from '@/http/axios'

export const get = (url, params = {}) => {
  return request.get(url, { params })
}

export const post = (url, data = {}) => {
  return request.post(url, data)
}

export async function upload(url, file, extraData = {}, axiosOptions = {}) {
  const formData = new FormData()
  formData.append('file', file)

  for (const key in extraData) {
    formData.append(key, extraData[key])
  }

  const res = await request.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    ...axiosOptions,
  })
  return res
}
