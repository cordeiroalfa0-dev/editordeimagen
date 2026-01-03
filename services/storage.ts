
import { ProcessingResult, Folder } from "../types";

const DB_NAME = "VisionEditDB_v3";
const PROJECTS_STORE = "projects";
const FOLDERS_STORE = "folders";
const DB_VERSION = 3;

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject("Erro ao abrir banco de dados");
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
        db.createObjectStore(PROJECTS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(FOLDERS_STORE)) {
        db.createObjectStore(FOLDERS_STORE, { keyPath: "id" });
      }
    };
  });
};

export const getStorageUsage = async (): Promise<string> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const transaction = db.transaction(PROJECTS_STORE, "readonly");
    const store = transaction.objectStore(PROJECTS_STORE);
    const request = store.getAll();
    request.onsuccess = () => {
      const all = request.result as ProcessingResult[];
      let size = 0;
      all.forEach(p => {
        size += JSON.stringify(p).length;
      });
      const mb = (size / (1024 * 1024)).toFixed(2);
      resolve(`${mb} MB`);
    };
  });
};

export const saveFolder = async (folder: Folder): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FOLDERS_STORE, "readwrite");
    transaction.objectStore(FOLDERS_STORE).put(folder);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject("Erro ao salvar pasta");
  });
};

export const getAllFolders = async (): Promise<Folder[]> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const transaction = db.transaction(FOLDERS_STORE, "readonly");
    const request = transaction.objectStore(FOLDERS_STORE).getAll();
    request.onsuccess = () => resolve(request.result || []);
  });
};

export const deleteFolder = async (id: string): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction([FOLDERS_STORE, PROJECTS_STORE], "readwrite");
  tx.objectStore(FOLDERS_STORE).delete(id);
  const projectStore = tx.objectStore(PROJECTS_STORE);
  const request = projectStore.getAll();
  request.onsuccess = () => {
    const projects = request.result as ProcessingResult[];
    projects.forEach(p => {
      if (p.folderId === id) {
        delete p.folderId;
        projectStore.put(p);
      }
    });
  };
  return new Promise((resolve) => tx.oncomplete = () => resolve());
};

export const updateProjectFolder = async (projectId: string, folderId?: string): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(PROJECTS_STORE, "readwrite");
  const store = tx.objectStore(PROJECTS_STORE);
  const request = store.get(projectId);
  request.onsuccess = () => {
    const project = request.result;
    if (project) {
      project.folderId = folderId;
      store.put(project);
    }
  };
  return new Promise((resolve) => tx.oncomplete = () => resolve());
};

export const saveProject = async (project: ProcessingResult): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PROJECTS_STORE, "readwrite");
    transaction.objectStore(PROJECTS_STORE).put(project);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject("Erro ao salvar projeto");
  });
};

export const getAllProjects = async (): Promise<ProcessingResult[]> => {
  const db = await initDB();
  return new Promise((resolve) => {
    const transaction = db.transaction(PROJECTS_STORE, "readonly");
    const request = transaction.objectStore(PROJECTS_STORE).getAll();
    request.onsuccess = () => {
      const results = request.result as ProcessingResult[];
      resolve(results.sort((a, b) => b.timestamp - a.timestamp));
    };
  });
};

export const deleteProject = async (id: string): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction(PROJECTS_STORE, "readwrite");
  transaction.objectStore(PROJECTS_STORE).delete(id);
  return new Promise((resolve) => transaction.oncomplete = () => resolve());
};

export const clearAllProjects = async (): Promise<void> => {
  const db = await initDB();
  const transaction = db.transaction(PROJECTS_STORE, "readwrite");
  transaction.objectStore(PROJECTS_STORE).clear();
  return new Promise((resolve) => transaction.oncomplete = () => resolve());
};
