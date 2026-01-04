
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import JSZip from 'jszip';
import { 
  Upload, 
  Download, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Loader2, 
  Github, 
  MessageSquare, 
  Mail, 
  Sun,
  Moon,
  ChevronUp,
  ChevronDown,
  Terminal,
  Clock
} from 'lucide-react';
import { ModrinthIndex, ModDetail, FabricVersion, FabricLoader, ModpackFile } from './types';

const AKAI_RED = '#E63946';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const EXPORT_HINTS = [
  "Injecting updated manifest...",
  "Processing 'overrides' folder (Configs, Scripts, Local Assets)...",
  "Transferring local content not available on Modrinth...",
  "Large local overrides (Configs/Scripts) increase processing time.",
  "Compressing and finalizing your .mrpack export..."
];

const StepIndicator = ({ currentStep }: { currentStep: number }) => {
  const steps = [
    { id: 1, label: 'Upload' },
    { id: 2, label: 'Configure' },
    { id: 3, label: 'Customize' },
    { id: 4, label: 'Export' }
  ];

  return (
    <div className="flex items-center justify-center space-x-6 md:space-x-10 mb-16">
      {steps.map((step) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center space-y-3">
            <motion.div 
              animate={{ 
                backgroundColor: currentStep >= step.id ? AKAI_RED : 'transparent',
                borderColor: currentStep >= step.id ? AKAI_RED : 'var(--text-muted)',
                boxShadow: currentStep >= step.id ? `0 0 15px ${AKAI_RED}44` : 'none',
                color: currentStep >= step.id ? '#fff' : 'var(--text-muted)'
              }}
              className={`w-12 h-12 rounded-lg flex items-center justify-center border-2 text-base font-bold transition-all duration-500`}
            >
              {currentStep > step.id ? <CheckCircle2 size={24} /> : step.id}
            </motion.div>
            <span className={`text-[10px] uppercase tracking-[0.2em] font-bold ${currentStep >= step.id ? 'opacity-100' : 'opacity-40'}`}>
              {step.label}
            </span>
          </div>
          {step.id < 4 && (
            <div className={`h-[1px] w-12 md:w-24 mb-8 ${currentStep > step.id ? 'bg-[#E63946]' : 'bg-zinc-800/20'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

const Logo = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="46 241 300 300"
    className="w-10 h-10 transform transition-transform group-hover:scale-105"
  >
    <g fill="none" strokeMiterlimit="10">
      <path d="M251.45 386.12c2.819-.074 5.825.029 8.662.041l15.154-.005c3.448.016 6.973.124 10.408.057-2.6 4.42-6.472 8.977-9.61 13.2l-23.836 31.603c-2.163 2.915-4.542 5.754-6.672 8.694-.265.366-.221.343-.212.703.68.482 14.852.274 16.913.277h45.28c5.906.026 12.33-.113 18.162.083-.942 2.133-3.04 5.028-4.333 7.099l-8.262 13.293c-.823 1.297-3.309 5.04-3.792 6.32-1.42-.013-2.865.007-4.286.011l-75.188.012-24.41-.014c-1.901 0-14.616.32-15.35-.462.067-.498 1.835-2.462 2.278-3.042 2.303-3.015 4.59-6.043 6.879-9.068l44.112-57.855c2.755-3.579 5.397-7.468 8.102-10.948m-99.679-51.483c.609.602 2.179 3.491 2.736 4.352 7.178 11.084 14.1 22.335 20.882 33.665 1.634 2.729 3.544 5.41 5.06 8.107 6.057 10.771 13.24 20.956 19.437 31.607-1.219 2.56-6.104 8.147-7.986 10.65-3.085 4.101-6.276 8.413-9.548 12.352-.758-1.579-2.191-3.785-3.141-5.329l-5.345-8.673-14.984-24.21c-2.422-3.944-4.976-7.876-7.252-11.91l-.906 1.373c-.441.836-1.898 2.903-2.516 3.875l-6.982 10.843c-1.867 2.915-3.568 6.051-5.423 9.008-3.459 5.51-6.812 10.913-10.099 16.529-3.675.181-8.059.038-11.81.022q-10.234-.03-20.467.1c2.694-4.82 5.762-9.46 8.69-14.151l18.875-30.012 19.857-31.606c3.286-5.118 7.298-11.739 10.922-16.592" fill="#fefefe"/>
      <path d="M319.39 334.623c1.63-.069 3.196-.062 4.825-.06-.507 1.997-2.93 4.664-4.185 6.366l-8.325 11.12c-2.122 2.824-5.274 7.575-7.57 10.003-3.614.118-7.869.012-11.541.016l-24.229.015-33.148.026q-9.368.086-18.737-.037c-.152 6.051.006 12.196-.069 18.248-.035 2.904.236 6.907-.218 9.672-1.257-1.442-2.56-4.09-3.674-5.786a287 287 0 0 1-5.207-8.272c-2.1-3.477-4.361-6.806-6.536-10.223l-7.562-12.142c-.87-1.393-4.007-5.816-4.171-6.98-.508-3.6-.042-8.109-.243-11.908l85.353-.012 27.04-.003q9.1.083 18.197-.043M84.335 440.766l43.855.001q7.291-.032 14.584.025c2.783-.003 5.912-.132 8.645.018-.826 1.679-2.064 3.15-3.16 4.668a1912 1912 0 0 0-15.087 21.16l-.57.913c-6.54-.147-13.303.029-19.847.06l-30.55-.057c-1.834-.01-13.869.252-14.747-.252-.033-.742 3.32-5.353 4.011-6.405l9.12-13.992c1.02-1.57 3.138-4.519 3.746-6.139" fill="#f11a1f"/>
    </g>
  </svg>
);

export default function App() {
  const [view, setView] = useState<'updater' | 'howto'>('updater');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const [exportHintIdx, setExportHintIdx] = useState(0);
  const [coolingDown, setCoolingDown] = useState(false);
  const [processingStatus, setProcessingStatus] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [modpackZip, setModpackZip] = useState<JSZip | null>(null);
  const [indexJson, setIndexJson] = useState<ModrinthIndex | null>(null);
  const [mcVersions, setMcVersions] = useState<FabricVersion[]>([]);
  const [loaderVersions, setLoaderVersions] = useState<string[]>([]);
  const [targetMcVersion, setTargetMcVersion] = useState('');
  const [targetLoaderVersion, setTargetLoaderVersion] = useState('');
  const [modDetails, setModDetails] = useState<(ModDetail & { overrideAction?: string })[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDisabledMods, setShowDisabledMods] = useState(true);
  const [incompatibleAction, setIncompatibleAction] = useState<'disable' | 'remove'>('disable');
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  const [sortField, setSortField] = useState<'name' | 'status' | 'version'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const exportStartTime = useRef<number | null>(null);
  const [estRemainingTime, setEstRemainingTime] = useState<number | null>(null);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        const res = await fetch('https://meta.fabricmc.net/v2/versions/game');
        const data: FabricVersion[] = await res.json();
        setMcVersions(data.filter(v => v.stable).slice(0, 50));
      } catch (err) {
        console.error('Failed to fetch MC versions');
      }
    };
    fetchVersions();
  }, []);

  useEffect(() => {
    let interval: any;
    if (exportLoading) {
      interval = setInterval(() => {
        setExportHintIdx((prev) => (prev + 1) % EXPORT_HINTS.length);
      }, 4000);
    } else {
      setExportHintIdx(0);
      exportStartTime.current = null;
      setEstRemainingTime(null);
    }
    return () => clearInterval(interval);
  }, [exportLoading]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('light');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const zip = await JSZip.loadAsync(file);
      const indexFile = zip.file('modrinth.index.json');
      if (!indexFile) throw new Error('Invalid .mrpack: missing index.json');
      const content = await indexFile.async('string');
      const json: ModrinthIndex = JSON.parse(content);
      setModpackZip(zip);
      setIndexJson(json);
      setTargetMcVersion(json.dependencies.minecraft);
      await fetchLoaders(json.dependencies.minecraft);
      setTargetLoaderVersion(json.dependencies['fabric-loader']);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Error processing file');
    } finally {
      setLoading(false);
    }
  };

  const fetchLoaders = async (mcVer: string) => {
    try {
      const res = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${mcVer}`);
      const data: FabricLoader[] = await res.json();
      const versions = data.map(d => d.loader.version);
      setLoaderVersions(versions);
      if (versions.length > 0) setTargetLoaderVersion(versions[0]);
    } catch (err) { console.error(err); }
  };

  const getModUpdateInfo = async (file: ModpackFile, mcVersion: string, loader: string): Promise<ModDetail> => {
    const isInitiallyDisabled = file.path.endsWith('.disabled');
    const cleanPath = file.path.replace('.disabled', '');
    const modFileName = cleanPath.split('/').pop() || 'unknown';
    
    const baseInfo: ModDetail = { 
      originalFile: file, 
      modFileName, 
      projectId: null, 
      status: 'Unknown', 
      updateData: null, 
      displayName: modFileName.replace(/\.jar$/g, '').replace(/[-_.]?(fabric|forge|quilt)[-_.]?/g, ' ').replace(/[-_.]?(\d+\.\d+.*)/, '').replace(/[-_]/g, ' ').trim(), 
      currentVersionNumber: 'N/A',
      isInitiallyDisabled
    };

    const fetchWithRetry = async (url: string) => {
      const res = await fetch(url);
      if (res.status === 429) {
        setCoolingDown(true);
        await sleep(5000);
        setCoolingDown(false);
        return fetchWithRetry(url);
      }
      return res;
    };

    try {
      const vfr = await fetchWithRetry(`https://api.modrinth.com/v2/version_file/${file.hashes.sha1}`);
      if (!vfr.ok) throw new Error('NOT_FOUND');
      const vfd = await vfr.json();
      baseInfo.projectId = vfd.project_id;
      baseInfo.currentVersionNumber = vfd.version_number;

      const pvr = await fetchWithRetry(`https://api.modrinth.com/v2/project/${vfd.project_id}/version?game_versions=["${mcVersion}"]&loaders=["${loader}"]`);
      if (!pvr.ok) throw new Error('API_ERR');
      const pvd = await pvr.json();

      if (pvd.length > 0) {
        const latestVersion = pvd[0];
        const latestFile = latestVersion.files.find((f: any) => f.primary) || latestVersion.files[0];
        baseInfo.status = (latestFile.hashes.sha1 === file.hashes.sha1) ? 'Compatible' : 'Update';
        
        if (baseInfo.status === 'Update') {
          baseInfo.updateData = { 
            path: `mods/${latestFile.filename}`, 
            hashes: latestFile.hashes, 
            downloads: [latestFile.url], 
            fileSize: latestFile.size, 
            env: file.env, 
            version_number: latestVersion.version_number 
          };
        }
      } else {
        baseInfo.status = 'Incompatible';
      }
    } catch (e: any) { 
      baseInfo.status = 'Error'; 
    }
    return baseInfo;
  };

  const handleCheckUpdates = async () => {
    if (!indexJson) return;
    setLoading(true);
    setError(null);
    const modFiles = indexJson.files.filter(f => f.path.includes('mods/'));
    setProcessingStatus({ current: 0, total: modFiles.length });

    const promises = modFiles.map(async (file) => {
      const detail = await getModUpdateInfo(file, targetMcVersion, 'fabric');
      setProcessingStatus(prev => ({ ...prev, current: prev.current + 1 }));
      return detail;
    });

    try {
      const results = await Promise.all(promises);
      setModDetails(results);
      setStep(3);
    } catch (err) {
      setError('Scanning failed.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSort = (field: 'name' | 'status' | 'version') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleOverrideAction = (id: string, action: string) => {
    setModDetails(prev => prev.map(m => (m.projectId || m.modFileName) === id ? { ...m, overrideAction: action } : m));
  };

  const handleGeneratePack = async () => {
    if (!indexJson || !modpackZip) return;
    setExportLoading(true);
    setError(null);
    exportStartTime.current = Date.now();
    try {
      const newIndex: ModrinthIndex = {
        ...indexJson,
        dependencies: { ...indexJson.dependencies, minecraft: targetMcVersion, 'fabric-loader': targetLoaderVersion },
        files: []
      };

      const newZip = new JSZip();
      const zipEntries = Object.keys(modpackZip.files);
      const totalEntries = zipEntries.length + modDetails.length;
      let completed = 0;

      for (const path of zipEntries) {
        if (path === 'modrinth.index.json') continue;
        const file = modpackZip.file(path);
        if (file && !file.dir) {
          const content = await file.async('uint8array');
          newZip.file(path, content);
        }
        completed++;
        
        if (completed % 15 === 0) {
          setExportProgress({ current: completed, total: totalEntries });
          
          if (exportStartTime.current) {
            const elapsed = (Date.now() - exportStartTime.current) / 1000;
            const itemsPerSec = completed / elapsed;
            const remaining = (totalEntries - completed) / itemsPerSec;
            setEstRemainingTime(Math.ceil(remaining));
          }
        }
      }

      const nonModFiles = indexJson.files.filter(f => !f.path.includes('mods/'));
      newIndex.files.push(...nonModFiles);

      modDetails.forEach(mod => {
        const action = mod.overrideAction || (mod.status === 'Update' ? 'update' : mod.status === 'Compatible' ? 'keep' : incompatibleAction);
        if (action === 'update' && mod.updateData) {
          newIndex.files.push(mod.updateData);
        } else if (action === 'keep') {
          newIndex.files.push(mod.originalFile);
        } else if (action === 'disable') {
          const disabledPath = mod.originalFile.path.endsWith('.disabled') ? mod.originalFile.path : mod.originalFile.path + '.disabled';
          newIndex.files.push({ ...mod.originalFile, path: disabledPath });
        }
        completed++;
        setExportProgress({ current: completed, total: totalEntries });
      });

      newZip.file('modrinth.index.json', JSON.stringify(newIndex, null, 2));

      const blob = await newZip.generateAsync({ 
        type: 'blob', 
        compression: "DEFLATE",
        compressionOptions: { level: 6 } 
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `updated-${indexJson.name.replace(/\s+/g, '_') || 'modpack'}.mrpack`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setStep(4);
    } catch (err: any) { 
      console.error(err);
      setError('Export failed: ' + (err.message || 'Unknown error')); 
    } finally { 
      setExportLoading(false); 
      setEstRemainingTime(null);
    }
  };

  const sortedAndFilteredMods = useMemo(() => {
    let list = modDetails.filter(mod => {
      const matchesSearch = mod.displayName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || mod.status.toLowerCase() === statusFilter;
      const matchesDisabled = showDisabledMods || !mod.isInitiallyDisabled;
      return matchesSearch && matchesStatus && matchesDisabled;
    });

    list.sort((a, b) => {
      let valA: any, valB: any;
      if (sortField === 'name') {
        valA = a.displayName.toLowerCase();
        valB = b.displayName.toLowerCase();
      } else if (sortField === 'status') {
        valA = a.status;
        valB = b.status;
      } else {
        valA = a.currentVersionNumber;
        valB = b.currentVersionNumber;
      }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [modDetails, search, statusFilter, showDisabledMods, sortField, sortOrder]);

  const stats = useMemo(() => {
    return modDetails.reduce((acc, mod) => {
      acc.total++;
      if (mod.isInitiallyDisabled) acc.disabledCount++;
      acc[mod.status.toLowerCase() as keyof typeof acc]++;
      return acc;
    }, { total: 0, update: 0, compatible: 0, incompatible: 0, error: 0, unknown: 0, disabledCount: 0 });
  }, [modDetails]);

  const NavItem = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
    <button 
      onClick={onClick}
      className={`nav-item-box flex items-center gap-1.5 group ${active ? 'nav-item-active text-[#E63946]' : 'text-[var(--text-muted)] hover:text-[var(--text-color)]'}`}
    >
      <span className="opacity-60 transition-colors group-hover:text-[#E63946]">&lt;</span>
      <span className="font-bold text-sm uppercase tracking-tight">{label}</span>
      <span className="opacity-60 transition-colors group-hover:text-[#E63946]">/&gt;</span>
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col selection:bg-[#E63946] selection:text-white text-base overflow-x-hidden">
      
      <AnimatePresence>
        {(loading || exportLoading) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-8">
            <div className="w-full max-w-sm space-y-10 text-center">
              <Loader2 className="mx-auto text-[#E63946] animate-spin" size={64} />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold uppercase tracking-widest text-white">
                  {exportLoading ? 'Packing Modpack' : step === 1 ? 'Reading Modpack' : coolingDown ? 'Cooling Down API...' : 'Synchronizing Mods'}
                </h2>
                <div className="h-12 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    <motion.p 
                      key={exportLoading ? EXPORT_HINTS[exportHintIdx] : 'scanning'}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-sm text-zinc-500 font-bold uppercase tracking-[0.2em] leading-relaxed"
                    >
                      {exportLoading ? EXPORT_HINTS[exportHintIdx] : 'Scanning Modrinth database.'}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                     <span>{exportLoading ? 'Building ZIP' : 'Processing'}</span>
                     {exportLoading && estRemainingTime !== null && (
                       <span className="text-[#E63946] flex items-center gap-1 animate-pulse">
                         <Clock size={10} /> Est. {estRemainingTime}s
                       </span>
                     )}
                  </div>
                  <span>{exportLoading ? exportProgress.current : processingStatus.current} / {exportLoading ? exportProgress.total : processingStatus.total}</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-900 overflow-hidden rounded-full">
                  <motion.div 
                    className="h-full bg-[#E63946] shadow-[0_0_15px_rgba(230,57,70,0.5)]" 
                    animate={{ width: `${((exportLoading ? exportProgress.current : processingStatus.current) / (exportLoading ? exportProgress.total : processingStatus.total)) * 100}%` }} 
                    transition={{ duration: 0.2 }} 
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-50 w-full border-b border-[var(--border-color)] bg-[var(--header-bg)] backdrop-blur-xl h-20 flex items-center">
        <div className="mx-auto w-full max-w-7xl px-6 flex items-center justify-between">
          <div className="flex items-center space-x-4 cursor-pointer group" onClick={() => {setView('updater'); setStep(1);}}>
             <Logo />
             <span className="font-bold text-xl tracking-tight leading-none text-[var(--text-color)]">
               Akai<span className="text-[#E63946]">Zery.dev</span>
             </span>
          </div>
          
          <div className="flex items-center space-x-6">
            <nav className="flex space-x-2 items-center">
              <NavItem label="Updater" active={view === 'updater'} onClick={() => setView('updater')} />
              <NavItem label="How-To" active={view === 'howto'} onClick={() => setView('howto')} />
            </nav>
            <div className="h-4 w-[1px] bg-[var(--border-color)] mx-2"></div>
            <button onClick={toggleTheme} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#E63946]/5 transition-colors group">
                {isDarkMode ? <Sun size={18} className="text-yellow-400 transition-transform group-hover:rotate-45" /> : <Moon size={18} className="text-indigo-500 transition-transform group-hover:-rotate-12" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow py-16 px-8 flex flex-col items-center">
        <div className="w-full max-w-6xl">
          <AnimatePresence mode="wait">
            {view === 'updater' ? (
              <motion.div key="updater" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full">
                <StepIndicator currentStep={step} />

                {step === 1 && (
                  <div className="flex flex-col items-center space-y-16 py-10">
                    <h1 className="text-7xl font-bold tracking-tighter uppercase leading-none text-center">Modpack <span className="text-[#E63946]">Updater</span></h1>

                    <label className="block w-full max-w-xl group">
                      <div className="border border-[var(--border-color)] bg-[var(--card-bg)] rounded-2xl p-24 transition-all hover:border-[#E63946]/30 hover:bg-[#E63946]/5 cursor-pointer flex flex-col items-center relative group backdrop-blur-sm">
                        <Upload className="text-[#E63946] mb-6 relative z-10 transform group-hover:-translate-y-2 transition-transform" size={48} />
                        <p className="text-xl font-bold uppercase tracking-[0.2em]">Upload <span className="text-[#E63946]">.mrpack</span></p>
                      </div>
                      <input type="file" className="hidden" accept=".mrpack" onChange={handleFileUpload} />
                    </label>
                    {error && <div className="text-red-500 text-xs font-bold uppercase flex items-center gap-2 bg-red-500/10 px-6 py-3 border border-red-500/20 rounded-xl"><AlertCircle size={14}/>{error}</div>}
                  </div>
                )}

                {step === 2 && indexJson && (
                  <div className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] p-10 rounded-2xl space-y-4 shadow-sm backdrop-blur-sm">
                        <p className="text-[10px] font-bold uppercase opacity-50 tracking-[0.3em]">Source Modpack</p>
                        <h3 className="text-3xl font-bold tracking-tight">{indexJson.name}</h3>
                        <div className="flex gap-3 text-[10px] font-bold">
                          <span className="bg-[#E63946]/10 text-[#E63946] px-4 py-1.5 border border-[#E63946]/20 rounded-md">v{indexJson.dependencies.minecraft}</span>
                          <span className="bg-[var(--border-color)] text-[var(--text-muted)] px-4 py-1.5 border border-[var(--border-color)] rounded-md">{indexJson.files.length} Assets</span>
                        </div>
                      </div>
                      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] p-10 rounded-2xl space-y-6 shadow-sm backdrop-blur-sm">
                        <p className="text-[10px] font-bold uppercase opacity-50 tracking-[0.3em]">Migrate To</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[9px] uppercase font-bold opacity-40">Minecraft</label>
                            <select value={targetMcVersion} onChange={(e) => { setTargetMcVersion(e.target.value); fetchLoaders(e.target.value); }} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-sm font-bold focus:border-[#E63946] outline-none text-[var(--text-color)]">
                              {mcVersions.map(v => <option key={v.version} value={v.version}>{v.version}</option>)}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] uppercase font-bold opacity-40">Fabric</label>
                            <select value={targetLoaderVersion} onChange={(e) => setTargetLoaderVersion(e.target.value)} className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-sm font-bold focus:border-[#E63946] outline-none text-[var(--text-color)]">
                              {loaderVersions.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button onClick={handleCheckUpdates} className="w-full py-5 bg-[#E63946] text-white font-bold uppercase tracking-[0.3em] text-xs rounded-xl hover:brightness-110 transition-all shadow-xl">Scan Database</button>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-10">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <h2 className="text-3xl font-bold tracking-tight uppercase">Mod Analysis</h2>
                        <p className="text-[var(--text-muted)] font-bold uppercase text-[9px] tracking-[0.3em]">Check your dependencies</p>
                      </div>
                      <button onClick={() => setShowDisabledMods(!showDisabledMods)} className={`flex items-center gap-2 px-6 py-3 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all ${showDisabledMods ? 'bg-[#E63946] text-white border-[#E63946]' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border-color)]'}`}>
                        {showDisabledMods ? <Eye size={16} /> : <EyeOff size={16} />} {showDisabledMods ? 'View' : 'Hide'} Inactive
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      {[
                        { l: 'Total', v: stats.total, c: 'bg-[var(--card-bg)]' },
                        { l: 'Updates', v: stats.update, c: 'bg-green-500/5 text-green-500 border-green-500/10' },
                        { l: 'Compatible', v: stats.compatible, c: 'bg-blue-500/5 text-blue-500 border-blue-500/10' },
                        { l: 'Incompatible', v: stats.incompatible + stats.error, c: 'bg-red-500/5 text-red-500 border-red-500/10' }
                      ].map((s, i) => (
                        <div key={i} className={`${s.c} p-6 rounded-2xl border border-[var(--border-color)] text-center backdrop-blur-sm`}>
                          <p className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-60 mb-1">{s.l}</p>
                          <p className="text-3xl font-bold tracking-tighter">{s.v}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-grow relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter mod list..." className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl pl-12 pr-4 py-3 text-sm outline-none focus:border-[#E63946] transition-all text-[var(--text-color)]"/>
                      </div>
                      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-6 py-3 text-[10px] font-bold uppercase tracking-widest outline-none text-[var(--text-color)]">
                        <option value="all">Filter: All</option>
                        <option value="update">Filter: Update</option>
                        <option value="compatible">Filter: OK</option>
                        <option value="incompatible">Filter: Broken</option>
                      </select>
                    </div>

                    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl overflow-hidden backdrop-blur-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-[var(--text-color)]/[0.03] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em] border-b border-[var(--border-color)] text-[9px]">
                              <th className="px-6 py-4 cursor-pointer hover:text-[var(--text-color)] transition-colors" onClick={() => toggleSort('name')}>
                                <div className="flex items-center gap-2">Mod {sortField === 'name' && (sortOrder === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}</div>
                              </th>
                              <th className="px-6 py-4 cursor-pointer hover:text-[var(--text-color)] transition-colors" onClick={() => toggleSort('version')}>
                                <div className="flex items-center gap-2">Version {sortField === 'version' && (sortOrder === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}</div>
                              </th>
                              <th className="px-6 py-4 cursor-pointer hover:text-[var(--text-color)] transition-colors" onClick={() => toggleSort('status')}>
                                <div className="flex items-center gap-2">Status {sortField === 'status' && (sortOrder === 'asc' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}</div>
                              </th>
                              <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border-color)]">
                            {sortedAndFilteredMods.map((mod) => (
                              <tr key={mod.projectId || mod.modFileName} className="hover:bg-[var(--text-color)]/[0.02] transition-colors group">
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <a href={`https://modrinth.com/mod/${mod.projectId}`} target="_blank" className={`font-bold text-base hover:text-[#E63946] transition-colors ${mod.isInitiallyDisabled ? 'opacity-40 line-through decoration-[#E63946]' : 'text-[var(--text-color)]'}`}>
                                      {mod.displayName}
                                    </a>
                                    <span className="text-[9px] text-[var(--text-muted)] font-mono mt-0.5 uppercase tracking-tighter">ID: {mod.projectId || 'INTERNAL'}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-[var(--text-muted)] font-mono text-xs">{mod.currentVersionNumber}</td>
                                <td className="px-6 py-4">
                                  <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded-md ${
                                    mod.status === 'Update' ? 'bg-green-500/20 text-green-500 border border-green-500/30' :
                                    mod.status === 'Compatible' ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30' :
                                    mod.status === 'Incompatible' || mod.status === 'Error' ? 'bg-red-500/20 text-red-500 border border-red-500/30' : 'bg-zinc-800'
                                  }`}>
                                    {mod.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <select 
                                    value={mod.overrideAction || (mod.status === 'Update' ? 'update' : mod.status === 'Compatible' ? 'keep' : incompatibleAction)}
                                    onChange={(e) => handleOverrideAction(mod.projectId || mod.modFileName, e.target.value)}
                                    className="bg-[var(--input-bg)] border border-[var(--border-color)] rounded px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest focus:border-[#E63946] outline-none text-[var(--text-color)]"
                                  >
                                    {mod.status === 'Update' && <option value="update">Update</option>}
                                    <option value="keep">Keep</option>
                                    <option value="disable">Disable</option>
                                    <option value="remove">Remove</option>
                                  </select>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="bg-[#E63946]/5 p-10 rounded-2xl border border-[#E63946]/20 flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl overflow-hidden relative group">
                       <Terminal className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-[#E63946]" size={140} />
                      <div className="text-center md:text-left space-y-4 relative z-10 w-full md:w-auto">
                        <p className="text-[10px] font-bold uppercase text-[#E63946] tracking-[0.3em]">Fallback Action for Incompatibilities</p>
                        <div className="flex bg-[var(--bg-color)]/60 p-1 rounded-lg border border-[var(--border-color)] text-[10px] font-bold uppercase tracking-widest w-full">
                          <button onClick={() => setIncompatibleAction('disable')} className={`flex-1 px-8 py-3 rounded transition-all ${incompatibleAction === 'disable' ? 'bg-[#E63946] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-color)]'}`}>Disable</button>
                          <button onClick={() => setIncompatibleAction('remove')} className={`flex-1 px-8 py-3 rounded transition-all ${incompatibleAction === 'remove' ? 'bg-[#E63946] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-color)]'}`}>Remove</button>
                        </div>
                      </div>
                      <button onClick={handleGeneratePack} className="px-12 py-5 bg-[var(--text-color)] text-[var(--bg-color)] rounded-xl font-bold uppercase text-xs tracking-[0.3em] hover:bg-[#E63946] hover:text-white transition-all shadow-2xl flex items-center gap-3 relative z-10">
                        <Download size={20} /> Export .mrpack
                      </button>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="text-center py-32 space-y-12">
                    <div className="w-40 h-40 bg-[#E63946] rounded-3xl flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(230,57,70,0.3)] transform rotate-2">
                      <CheckCircle2 size={80} className="text-white transform -rotate-2" />
                    </div>
                    <div className="space-y-4">
                      <h2 className="text-6xl font-black tracking-tighter uppercase leading-none">Complete</h2>
                      <p className="text-[var(--text-muted)] font-bold uppercase text-[10px] tracking-[0.4em]">Successfully rebuilt for {targetMcVersion}</p>
                    </div>
                    <button onClick={() => setStep(1)} className="px-12 py-4 border border-[var(--border-color)] rounded-xl font-bold uppercase text-xs tracking-[0.3em] hover:border-[#E63946] transition-all">New Rebuild</button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="howto" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full space-y-16 py-10">
                <div className="text-center space-y-4">
                  <h1 className="text-6xl font-bold tracking-tighter uppercase leading-none">How it <span className="text-[#E63946]">Works</span></h1>
                  <p className="text-[var(--text-muted)] font-bold uppercase tracking-[0.3em] text-[10px]">Synchronization workflow overview</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { num: 1, title: 'Export', text: 'Export your modpack as a .mrpack from Prism or Modrinth app.' },
                    { num: 2, title: 'Upload', text: 'Drag and drop your file into the tool to begin indexing.' },
                    { num: 3, title: 'Migrate', text: 'Choose your target Minecraft and Fabric Loader versions.' },
                    { num: 4, title: 'Analyze', text: 'Our tool scans Modrinth API for every mod version available.' },
                    { num: 5, title: 'Review', text: 'Manually override actions for mods that may have issues.' },
                    { num: 6, title: 'Build', text: 'One-click export creates a fully valid updated .mrpack file.' }
                  ].map((item) => (
                    <div key={item.num} className="bg-[var(--card-bg)] border border-[var(--border-color)] p-10 rounded-3xl space-y-4 relative overflow-hidden group hover:border-[#E63946]/30 transition-all backdrop-blur-sm">
                      <div className="absolute top-0 right-0 text-7xl font-black text-[var(--text-color)]/5 p-4 select-none">{item.num}</div>
                      <div className="text-[#E63946] font-bold text-xl uppercase tracking-tighter">{item.num}. {item.title}</div>
                      <p className="text-sm opacity-60 leading-relaxed text-[var(--text-color)]">{item.text}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="border-t border-[var(--border-color)] py-12 bg-[var(--header-bg)]">
        <div className="max-w-7xl mx-auto px-10 flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
          <div className="flex items-center space-x-6">
            <span>2026 Created by <a href="https://akaizery.dev/" target="_blank" className="text-[#E63946] hover:brightness-110 transition-all">AkaiZery</a></span>
            <span className="opacity-10">|</span>
            <a href="https://github.com/akaizery/mrpack-updater" target="_blank" className="hover:text-[var(--text-color)] transition-colors">Source Code</a>
            <span className="opacity-10">|</span>
            <span className="text-[#E63946]/30">MIT-License</span>
          </div>
          <div className="flex space-x-8">
            <a href="mailto:contact@akaizery.dev" className="hover:text-[#E63946] transition-all"><Mail size={20}/></a>
            <a href="https://github.com/akaizery" target="_blank" className="hover:text-[#E63946] transition-all"><Github size={20}/></a>
            <a href="https://akaizery.dev/#/contact" target="_blank" className="hover:text-[#E63946] transition-all"><MessageSquare size={20}/></a>
          </div>
        </div>
      </footer>
    </div>
  );
}
