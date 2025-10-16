// Core data models
export interface Knowledge {
  id: string;
  title: string;
  content: string;
  tags: string[];
  project_id?: string;
  user_id: string;
  workspace_id?: string;
  created_at: Date;
  updated_at: Date;
  metadata?: Record<string, any>;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  workspace_id?: string;
  config: ProjectConfig;
  created_at: Date;
  updated_at: Date;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  members: WorkspaceMember[];
  settings: WorkspaceSettings;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: Date;
  updated_at: Date;
}

// Configuration types
export interface KnowledgerConfig {
  api_endpoint?: string;
  user_token?: string;
  default_project?: string;
  default_tags?: string[];
  workspace?: string;
}

export interface ProjectConfig {
  auto_tag?: boolean;
  default_tags?: string[];
  visibility?: 'private' | 'workspace' | 'public';
  ai_processing?: boolean;
}

export interface WorkspaceSettings {
  visibility: 'private' | 'public';
  allow_external_sharing: boolean;
  retention_days?: number;
}

export interface WorkspaceMember {
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'readonly';
  joined_at: Date;
}

// API request/response types
export interface CreateKnowledgeRequest {
  title: string;
  content: string;
  tags?: string[];
  project_id?: string;
  metadata?: Record<string, any>;
}

export interface UpdateKnowledgeRequest {
  title?: string;
  content?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface SearchKnowledgeRequest {
  query?: string;
  tags?: string[];
  project_id?: string;
  workspace_id?: string;
  limit?: number;
  offset?: number;
}

export interface SearchKnowledgeResponse {
  entries: Knowledge[];
  total: number;
  has_more: boolean;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  config?: Partial<ProjectConfig>;
}

// MCP function types
export interface McpSaveKnowledgeParams {
  title: string;
  content: string;
  tags?: string[];
  project?: string;
  metadata?: Record<string, any>;
}

export interface McpSearchKnowledgeParams {
  query: string;
  tags?: string[];
  project?: string;
  limit?: number;
}

export interface McpLinkKnowledgeParams {
  knowledge_id: string;
  related_id: string;
  relationship: 'relates_to' | 'extends' | 'contradicts' | 'builds_on';
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface ValidationError extends ApiError {
  field_errors: Record<string, string[]>;
}

// Utility types
export type CreateKnowledgeData = Omit<Knowledge, 'id' | 'created_at' | 'updated_at' | 'user_id'>;
export type UpdateKnowledgeData = Partial<CreateKnowledgeData>;
export type KnowledgeWithoutSensitive = Omit<Knowledge, 'user_id'>;