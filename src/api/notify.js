import { get, post } from '@/http/request'

export function getNotifyList(data) {
  return post('/notify/list', data)
}

export function getNotifyDetail(id) {
  return get(`/notify/${id}`)
}

export function markAsRead(id) {
  return post('/notify/mark-read', { id })
}

export function batchMarkAsRead(ids) {
  return post('/notify/mark-read-batch', { ids })
}
