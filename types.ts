
export interface ModrinthIndex {
  formatVersion: number;
  game: string;
  versionId: string;
  name: string;
  summary?: string;
  files: ModpackFile[];
  dependencies: {
    minecraft: string;
    [key: string]: string;
  };
}

export interface ModpackFile {
  path: string;
  hashes: {
    sha1: string;
    sha512: string;
  };
  env?: {
    client: string;
    server: string;
  };
  downloads: string[];
  fileSize: number;
}

export interface ModDetail {
  originalFile: ModpackFile;
  modFileName: string;
  projectId: string | null;
  status: 'Compatible' | 'Update' | 'Incompatible' | 'Error' | 'Unknown';
  updateData: (ModpackFile & { version_number: string }) | null;
  displayName: string;
  currentVersionNumber: string;
  isInitiallyDisabled: boolean;
}

export interface FabricVersion {
  version: string;
  stable: boolean;
}

export interface FabricLoader {
  loader: {
    version: string;
  };
}
