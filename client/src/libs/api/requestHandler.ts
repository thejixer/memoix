import httpClient from "./httpClient"
import type { Routes } from "./routes"

export type HttpResult<T = any> = Promise<{ data: T | null; status: number }>

export async function post<TBody = any, TResponse = any>(
  route: Routes | string,
  body: TBody
): HttpResult<TResponse> {
  return httpClient.post<TResponse>(route, body)
}