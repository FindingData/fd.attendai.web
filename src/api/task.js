import { get, post } from '@/http/request'
/**
 * 创建任务
 */
export const createTask = (data) => post('/task/create', data)

export const createTaskBatch = (data) => post('/task/create-batch', data)

/**
 * 获取执行人列表
 */
export const fetchUserList = () => get('/user/GetCustomerUsers')

/**
 * 获取任务类型列表
 */
export const fetchTaskTypes = () => get('/tasktype/GetTaskTypes')

/**
 * 获取任务类型列表
 */
export const fetchRootTaskTypes = () => get('/tasktype/GetRootTaskTypes')

/**
 * 获取标签列表
 */
export const fetchTagList = () => get('/tag/all')
