import { PaginationMeta } from '../models/response.model'

// Offset pagination shared by list endpoints. Each feature keeps its own query
// names/defaults (page/limit or currentPage/pageSize) and maps them here.

export function toSkipTake(
  page: number,
  pageSize: number
): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize }
}

export function toPaginationMeta(
  page: number,
  pageSize: number,
  totalItem: number
): PaginationMeta {
  return {
    current: page,
    pageSize,
    totalPage: Math.ceil(totalItem / pageSize),
    totalItem
  }
}
