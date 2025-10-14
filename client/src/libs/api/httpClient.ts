import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios"
import cookieClient from "../utils/cookie"

class HttpClient {
  private static instance: HttpClient | null = null
  private axiosInstance: AxiosInstance

  private constructor(baseURL: string) {
    this.axiosInstance = axios.create({
      baseURL,
    })

    this.axiosInstance.interceptors.request.use((config) => {
      const token = this.getToken()
      if (token) {
        config.headers = config.headers ?? {}
        if ('set' in config.headers) {
          config.headers.set("Authorization", `ut ${token}`)
        } else {
          (config.headers as any)["Authorization"] = `ut ${token}`
        }
      }
      return config
    })
  }

  public static getInstance(baseURL = "http://localhost:4848"): HttpClient {
    if (!HttpClient.instance) {
      HttpClient.instance = new HttpClient(baseURL)
    }
    return HttpClient.instance
  }

  private getToken(): string | null {
    return cookieClient.getCookie("token")
  }

  async get<T = any>(endpoint: string, config?: AxiosRequestConfig): Promise<{ data: T | null; status: number }> {
    try {
      const response: AxiosResponse<T> = await this.axiosInstance.get(endpoint, config)
      return { data: response.data, status: response.status }
    } catch (error: any) {
      console.error(error)
      return { data: null, status: error.response?.status || 500 }
    }
  }

  async post<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<{ data: T | null; status: number }> {
    try {
      const response: AxiosResponse<T> = await this.axiosInstance.post(endpoint, data, config)
      return { data: response.data, status: response.status }
    } catch (error: any) {
      console.error(error)
      return { data: null, status: error.response?.status || 500 }
    }
  }

  async patch<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<{ data: T | null; status: number }> {
    try {
      const response: AxiosResponse<T> = await this.axiosInstance.patch(endpoint, data, config)
      return { data: response.data, status: response.status }
    } catch (error: any) {
      console.error(error)
      return { data: null, status: error.response?.status || 500 }
    }
  }

  async delete<T = any>(endpoint: string, data?: any, config?: AxiosRequestConfig): Promise<{ data: T | null; status: number }> {
    try {
      const response: AxiosResponse<T> = await this.axiosInstance.delete(endpoint, { data, ...config })
      return { data: response.data, status: response.status }
    } catch (error: any) {
      console.error(error)
      return { data: null, status: error.response?.status || 500 }
    }
  }

  async uploadFile<T = any>(endpoint: string, file: File, fieldName = "avatar"): Promise<{ data: T | null; status: number }> {
    try {
      const formData = new FormData()
      formData.append(fieldName, file)

      const response: AxiosResponse<T> = await this.axiosInstance.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      return { data: response.data, status: response.status }
    } catch (error: any) {
      console.error(error)
      return { data: null, status: error.response?.status || 500 }
    }
  }
}

const httpClient = HttpClient.getInstance()
export default httpClient
