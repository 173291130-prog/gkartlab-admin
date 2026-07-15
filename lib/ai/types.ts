export type AiGenerateInput = {
  imageUrl: string;
  prompt: string;
  negativePrompt?: string | null;
  revisionPrompt?: string | null;
  requestedSize?: {
    width?: number | null;
    height?: number | null;
  };
  size: {
    width?: number | null;
    height?: number | null;
    preset?: string | null;
  };
  sourceImage?: {
    width?: number | null;
    height?: number | null;
  };
  metadata: {
    taskId: string;
    generationId: string;
  };
};

export type AiSubmitResult = {
  externalJobId?: string;
  status: "SUBMITTED" | "PROCESSING" | "SUCCEEDED" | "FAILED";
  imageUrl?: string;
  raw?: unknown;
  requestPayload?: unknown;
  errorMessage?: string;
};

export type AiStatusResult = {
  status: "PROCESSING" | "SUCCEEDED" | "FAILED";
  imageUrl?: string;
  errorMessage?: string;
  raw?: unknown;
};
