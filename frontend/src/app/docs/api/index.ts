import { ApiEndpoint } from './types';
import { uploadEndpoints } from './upload';
import { downloadEndpoints } from './download';
import { deleteEndpoints } from './delete';
import { metadataEndpoints } from './metadata';

export type { ApiEndpoint, CodeExample, StatusCode, Parameter } from './types';

export const apiEndpoints: Record<string, ApiEndpoint[]> = {
  'upload': uploadEndpoints,
  'download': downloadEndpoints,
  'delete': deleteEndpoints,
  'metadata': metadataEndpoints,
  // Legacy support for existing API reference
  'api-reference': [
    ...uploadEndpoints,
    ...downloadEndpoints,
    ...metadataEndpoints,
    ...deleteEndpoints
  ]
};

export {
  uploadEndpoints,
  downloadEndpoints,
  deleteEndpoints,
  metadataEndpoints
};