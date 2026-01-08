
import { ProcessingResult, Folder } from "../types";
import { 
  syncProjectToCloud, 
  syncFolderToCloud, 
  deleteProjectFromCloud, 
  deleteFolderFromCloud,
  fetchCloudData,
  supabase
} from "./supabase";

const LOCAL_KEY = 'visionos_master_v15_db';

export const saveProject = async (project: ProcessingResult): Promise<boolean> => {
  // 1. Salva Local Primeiro (Sempre funciona)
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    const filtered = existing.filter((p: any) => p.id !== project.id);
    localStorage.setItem(LOCAL_KEY, JSON.stringify([project, ...filtered].slice(0, 100)));
  } catch (e) {}

  // 2. Tenta Nuvem
  const success = await syncProjectToCloud(project);
  return success;
};

export const getAllProjects = async (): Promise<ProcessingResult[]> => {
  const cloudData = await fetchCloudData();
  
  if (cloudData.projects.length === 0) {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    } catch (e) { return []; }
  }

  // Atualiza cache local
  localStorage.setItem(LOCAL_KEY, JSON.stringify(cloudData.projects));
  return cloudData.projects;
};

export const deleteProject = async (id: string): Promise<boolean> => {
  const cloudSuccess = await deleteProjectFromCloud(id);
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
    localStorage.setItem(LOCAL_KEY, JSON.stringify(existing.filter((p: any) => p.id !== id)));
  } catch (e) {}
  return cloudSuccess;
};

export const clearAllProjects = async (): Promise<void> => {
  localStorage.removeItem(LOCAL_KEY);
  await supabase.from('projects').delete().eq('operator_email', "emerson.cordeiro00894687@sesisenaipr.org.br");
};

export const saveFolder = async (folder: Folder): Promise<void> => {
  await syncFolderToCloud(folder);
};

export const getAllFolders = async (): Promise<Folder[]> => {
  const cloudData = await fetchCloudData();
  return cloudData.folders;
};

export const deleteFolder = async (id: string): Promise<void> => {
  await deleteFolderFromCloud(id);
};

export const updateProjectFolder = async (projectId: string, folderId?: string): Promise<void> => {
  const projects = await getAllProjects();
  const project = projects.find(p => p.id === projectId);
  if (project) {
    project.folderId = folderId;
    await saveProject(project);
  }
};
