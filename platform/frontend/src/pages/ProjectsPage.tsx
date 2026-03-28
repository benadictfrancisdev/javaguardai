import { useEffect, useState, useCallback } from 'react';
import { FolderOpen, Plus, Archive, Code2, Bug, Loader2 } from 'lucide-react';
import { projectAPI } from '../services/api';
import type { Project } from '../types';
import toast from 'react-hot-toast';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const { data } = await projectAPI.list();
      setProjects(data.projects);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsCreating(true);
    try {
      await projectAPI.create({ name: newName, description: newDesc || undefined });
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      fetchProjects();
      toast.success('Project created!');
    } catch {
      toast.error('Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await projectAPI.delete(id);
      fetchProjects();
      toast.success('Project archived');
    } catch {
      toast.error('Failed to archive project');
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 bg-[#1e1e1e] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-[#1e1e1e] overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Projects</h1>
            <p className="text-sm text-[#999]">Organize your code snippets</p>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
          >
            <Plus size={14} />
            New Project
          </button>
        </div>

        {/* Create form */}
        {showCreate && (
          <form onSubmit={handleCreate} className="bg-[#252526] rounded-lg p-4 border border-[#333] space-y-3">
            <div>
              <label className="block text-xs text-[#999] mb-1">Project Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-[#444] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="My Java Project"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-[#999] mb-1">Description (optional)</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full bg-[#1e1e1e] border border-[#444] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
                rows={2}
                placeholder="Brief description..."
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isCreating}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50"
              >
                {isCreating && <Loader2 size={12} className="animate-spin" />}
                Create
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-3 py-1.5 text-xs bg-[#333] hover:bg-[#444] text-white rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Project list */}
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen size={48} className="text-[#555] mx-auto mb-4" />
            <p className="text-sm text-[#999]">No projects yet</p>
            <p className="text-xs text-[#666] mt-1">Create a project to organize your code</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {projects.map((project) => (
              <div key={project.id} className="bg-[#252526] rounded-lg p-4 border border-[#333] hover:border-[#555] transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
                      <FolderOpen size={16} className="text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white">{project.name}</h3>
                      {project.description && (
                        <p className="text-[11px] text-[#999] mt-0.5">{project.description}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleArchive(project.id)}
                    className="p-1 text-[#666] hover:text-red-400 transition-colors"
                    title="Archive project"
                  >
                    <Archive size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-[#999]">
                  <span className="flex items-center gap-1">
                    <Code2 size={12} />
                    {project.snippet_count} snippets
                  </span>
                  <span className="flex items-center gap-1">
                    <Bug size={12} />
                    {project.error_count} errors
                  </span>
                  <span>{new Date(project.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
