export interface CodeExample {
  language: string;
  code: string;
}

export interface StatusCode {
  code: number;
  description: string;
}

export interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  statusCodes?: StatusCode[];
  parameters?: Parameter[];
  examples: CodeExample[];
  response: string;
}