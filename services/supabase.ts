
import { createClient } from '@supabase/supabase-js';
import { ProcessingResult, Folder } from '../types';

const SUPABASE_URL = 'https://cggkozetzwpjpdcrrdbf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnZ2tvemV0endwanBkY3JyZGJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NDAyMDksImV4cCI6MjA4MzExNjIwOX0.55I6oGJqkwjZSWCZ_qJq9KSCbad8PET8HpuOWPxad58';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const MASTER_EMAIL = "emerson.cordeiro00894687@sesisenaipr.org.br";

/**
 * VISIONOS CLOUD PERSISTENCE v16.0
 * Estratégia de salvamento robusta para o banco Master.
 */
export const syncProjectToCloud = async (project: ProcessingResult) => {
  try {
    // 1. Prepara um pacote de dados ultra-limpo para evitar erros de limite do banco
    const strippedVersions = project.versions.map(v => ({
      id: v.id,
      imageUrl: v.imageUrl.length > 500000 ? "L" : v.imageUrl, // Se for gigante, marcamos como Local (L)
      res: v.resolution,
      desc: v.description?.substring(0, 100)
    }));

    const payload = {
      id: project.id, 
      folder_id: project.folderId || null,
      operator_email: MASTER_EMAIL,
      data: {
        ...project,
        // Mantemos a imagem original apenas se couber, senão o LocalStorage cuida disso
        versions: project.versions.map(v => ({
          ...v,
          imageUrl: v.imageUrl.length > 2000000 ? v.imageUrl.substring(0, 100) + "...[LARGE]" : v.imageUrl
        }))
      },
      timestamp: Date.now()
    };

    // 2. Upsert no banco Master
    const { error, status } = await supabase
      .from('projects')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error(`[VisionOS Cloud] Erro Crítico (${status}):`, error.message);
      return false;
    }
    
    return true;
  } catch (e: any) {
    console.error("[VisionOS Cloud] Falha de conexão com o banco master:", e.message);
    return false;
  }
};

export const fetchCloudData = async () => {
  try {
    const { data: projects, error: pError } = await supabase
      .from('projects')
      .select('*')
      .eq('operator_email', MASTER_EMAIL)
      .order('timestamp', { ascending: false });

    const { data: folders, error: fError } = await supabase
      .from('folders')
      .select('*')
      .eq('operator_email', MASTER_EMAIL);
    
    if (pError) throw pError;

    return {
      projects: (projects || []).map(p => ({
        ...(p.data || {}),
        id: p.id,
        folderId: p.folder_id,
        timestamp: p.timestamp,
        isSynced: true
      } as ProcessingResult & { isSynced: boolean })),
      folders: (folders || []) as Folder[]
    };
  } catch (e) {
    return { projects: [], folders: [] };
  }
};

export const deleteProjectFromCloud = async (id: string) => {
  try {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    return !error;
  } catch (e) { return false; }
};

export const syncFolderToCloud = async (folder: Folder) => {
  try {
    await supabase.from('folders').upsert({
      id: folder.id,
      name: folder.name,
      timestamp: folder.timestamp,
      operator_email: MASTER_EMAIL
    });
  } catch (e) {}
};

export const deleteFolderFromCloud = async (id: string) => {
  try {
    await supabase.from('folders').delete().eq('id', id);
  } catch (e) {}
};
