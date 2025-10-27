import axios from 'axios'

export interface DownloadProgress {
  downloaded: number
  total: number
  percentage: number
  speed: number // bytes per second
  timeRemaining: number // seconds
}

class ModelDownloadService {
  private baseURL = 'http://localhost:3000'

  async checkModelExists(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseURL}/api/model/check`)
      return response.data.exists || false
    } catch (error) {
      console.error('Error checking model:', error)
      return false
    }
  }

  async downloadModel(
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<boolean> {
    try {
      const response = await axios.post(
        `${this.baseURL}/api/model/download`,
        {},
        {
          responseType: 'blob',
          onDownloadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const downloaded = progressEvent.loaded || 0
              const total = progressEvent.total || 0
              const percentage = (downloaded / total) * 100
              
              // Calculate speed (simplified)
              const currentTime = Date.now()
              const timeElapsed = (currentTime - (progressEvent.timeStamp || currentTime)) / 1000
              const speed = timeElapsed > 0 ? downloaded / timeElapsed : 0
              
              // Calculate time remaining
              const remaining = total - downloaded
              const timeRemaining = speed > 0 ? remaining / speed : 0

              onProgress({
                downloaded,
                total,
                percentage,
                speed,
                timeRemaining
              })
            }
          }
        }
      )

      // Save the blob to localStorage or handle it
      const blob = response.data
      const modelData = await blob.arrayBuffer()
      
      // Store in IndexedDB or localStorage
      // For now, we'll check with backend
      return true
    } catch (error) {
      console.error('Error downloading model:', error)
      return false
    }
  }

  async getModelInfo(): Promise<{ size: number; path: string } | null> {
    try {
      const response = await axios.get(`${this.baseURL}/api/model/info`)
      return response.data
    } catch (error) {
      console.error('Error getting model info:', error)
      return null
    }
  }
}

export const modelDownloadService = new ModelDownloadService()
export default modelDownloadService

