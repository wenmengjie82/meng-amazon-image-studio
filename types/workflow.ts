export type SourceType = 'own_product' | 'competitor' | 'brand_style' | 'risk_example';

export type ReferenceRole =
  | 'product_truth_reference'
  | 'layout_reference'
  | 'action_reference'
  | 'detail_callout_reference'
  | 'style_reference'
  | 'claim_boundary_reference';

export type ClaimRiskLevel = 'low' | 'medium' | 'high' | 'unknown';
export type QAResult = 'structure_test_pass' | 'structure_test_fail' | 'not_generated';

export interface UploadChecklistItem {
  role: ReferenceRole;
  label: string;
  required: boolean;
  allowedUse: string;
  forbiddenUse: string;
}

export interface Direction {
  directionId: string;
  directionName: string;
  buyerQuestion: string;
  testState: string;
  targetPlacement: string;
  outputName: string;
  finalGenerationPrompt: string;
  negativePrompt: string;
  forbiddenClaims: string[];
  uploadChecklist: UploadChecklistItem[];
  canvasAssumption: string;
  outputNamingRule: string;
  qaChecklist: string[];
  passCriteria: string[];
  failCriteria: string[];
}

export interface StrategyPack {
  projectName: string;
  packVersion: string;
  workflowMode: 'strategy_pack_driven';
  directions: Direction[];
}

export interface AssetRecord {
  id: string;
  fileName: string;
  sourceType: SourceType;
  referenceRole: ReferenceRole;
  claimRiskLevel: ClaimRiskLevel;
  directionScope: string;
  previewUrl?: string;
  blocked?: boolean;
  blockReason?: string;
}

export interface QARecord {
  directionId: string;
  generationStatus: 'not_generated' | 'mock_generated';
  result: QAResult;
  checks: Record<string, boolean>;
  mainProblem: string;
  nextAction: string;
}
