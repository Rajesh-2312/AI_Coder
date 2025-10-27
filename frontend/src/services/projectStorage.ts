import { supabase } from './supabase'

export interface Project {
  id?: string
  user_id: string
  name: string
  description: string | null
  files: any
  created_at?: string
  updated_at?: string
  status: 'active' | 'archived' | 'deleted'
  port?: number
  url?: string
}

export class ProjectStorage {
  async saveProject(project: Project): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([project])
        .select()
        .single()

      if (error) {
        console.error('Error saving project:', error)
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error saving project:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async updateProject(projectId: string, updates: Partial<Project>): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', projectId)

      if (error) {
        console.error('Error updating project:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Error updating project:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async getProjects(userId: string): Promise<{ success: boolean; projects?: Project[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error getting projects:', error)
        return { success: false, error: error.message }
      }

      return { success: true, projects: data || [] }
    } catch (error) {
      console.error('Error getting projects:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async deleteProject(projectId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'deleted', updated_at: new Date().toISOString() })
        .eq('id', projectId)

      if (error) {
        console.error('Error deleting project:', error)
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Error deleting project:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async getProject(projectId: string): Promise<{ success: boolean; project?: Project; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) {
        console.error('Error getting project:', error)
        return { success: false, error: error.message }
      }

      return { success: true, project: data }
    } catch (error) {
      console.error('Error getting project:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

export const projectStorage = new ProjectStorage()

