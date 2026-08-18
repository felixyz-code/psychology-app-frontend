export type OrganizationLogoMimeType = 'image/png' | 'image/jpeg';

export interface AbsentOrganizationLogoResponse {
  readonly rowState: 'ABSENT';
  readonly updatedAt: null;
  readonly mimeType: null;
  readonly byteSize: null;
  readonly width: null;
  readonly height: null;
}

export interface PresentOrganizationLogoResponse {
  readonly rowState: 'PRESENT';
  readonly updatedAt: string;
  readonly mimeType: OrganizationLogoMimeType;
  readonly byteSize: number;
  readonly width: number;
  readonly height: number;
}

export type OrganizationLogoResponse =
  | AbsentOrganizationLogoResponse
  | PresentOrganizationLogoResponse;

export type OrganizationLogoUploadPrecondition =
  | { readonly expectedRowState: 'ABSENT' }
  | { readonly expectedUpdatedAt: string };
