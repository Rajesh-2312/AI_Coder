import { projectStorage, Project } from './projectStorage'
import { modelDownloadService } from './modelDownloadService'

export interface ProjectCreationResult {
  success: boolean
  projectId?: string
  url?: string
  port?: number
  error?: string
}

export class AIProjectManager {
  async createAndSaveProject(
    userId: string,
    projectName: string,
    description: string,
    files: Record<string, string>,
    port?: number,
    url?: string
  ): Promise<ProjectCreationResult> {
    try {
      // Save project to Supabase
      const project: Project = {
        user_id: userId,
        name: projectName,
        description,
        files,
        status: 'active',
        port,
        url,
        metadata: {
          created_by: 'ai-agent',
          created_at: new Date().toISOString()
        }
      }

      const result = await projectStorage.saveProject(project)

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to save project'
        }
      }

      return {
        success: true,
        projectId: result.data?.id,
        url: url,
        port: port
      }
    } catch (error) {
      console.error('Error creating and saving project:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async loadUserProjects(userId: string): Promise<{ success: boolean; projects?: Project[]; error?: string }> {
    return await projectStorage.getProjects(userId)
  }

  async updateProjectStatus(projectId: string, status: Project['status']): Promise<{ success: boolean; error?: string }> {
    return await projectStorage.updateProject(projectId, { status })
  }

  async recordModelDownload(userId: string, modelName: string, modelPath: string, fileSize: number): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('model_downloads')
        .insert([{
          user_id: userId,
          model_name: modelName,
          model_path: modelPath,
          file_size: fileSize,
          download_status: 'completed',
          downloaded_at: new Date().toISOString()
        }])

      if (error) {
        console.error('Error recording model download:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Error recording model download:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async getModelDownloadStatus(userId: string): Promise<{ success: boolean; downloaded: boolean; model?: any }> {
    try {
      const { data, error } = await supabase
        .from('model_downloads')
        .select('*')
        .eq('user_id', userId)
        .eq('download_status', 'completed')
        .order('downloaded_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error getting model download status:', error)
        return { success: false, downloaded: false }
      }

      return {
        success: true,
        downloaded: !!data,
        model: data
      }
    } catch (error) {
      console.error('Error getting model download status:', error)
      return { success: false, downloaded: false }
    }
  }
}

import { supabase } from './supabase'

export const aiProjectManager = new AIProjectManager()

