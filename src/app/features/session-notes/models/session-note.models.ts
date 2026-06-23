export interface SessionNote {
  id: string;
  caseFileId: string;
  authorId: string;
  title?: string | null;
  content: string;
  sessionDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionNoteRequest {
  caseFileId: string;
  authorId?: string;
  title?: string | null;
  content: string;
  sessionDate: string;
}

export interface UpdateSessionNoteRequest {
  title?: string | null;
  content?: string;
  sessionDate?: string;
}
