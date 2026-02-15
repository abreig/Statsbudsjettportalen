export interface AssignedDepartment {
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  isPrimary: boolean;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  role: string;
  division: string | null;
  section: string | null;
  jobTitle: string | null;
  leaderLevel: string | null;
  assignedDepartments: AssignedDepartment[] | null;
}

export interface BudgetRound {
  id: string;
  name: string;
  type: string;
  year: number;
  status: string;
  deadline: string | null;
  closedAt: string | null;
  caseCount: number;
}

export interface BudgetCase {
  id: string;
  budgetRoundId: string;
  departmentId: string;
  departmentCode: string;
  caseName: string;
  chapter: string | null;
  post: string | null;
  amount: number | null;
  caseType: string;
  status: string;
  assignedTo: string | null;
  assignedToName: string | null;
  finAssignedTo: string | null;
  finAssignedToName: string | null;
  createdBy: string;
  createdByName: string;
  origin: string;
  responsibleDivision: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  currentContent: CaseContent | null;
  opinions: CaseOpinion[] | null;
}

export interface CaseOpinion {
  id: string;
  caseId: string;
  type: 'uttalelse' | 'godkjenning';
  requestedBy: string;
  requestedByName: string;
  assignedTo: string;
  assignedToName: string;
  status: string;
  opinionText: string | null;
  requestComment: string | null;
  forwardedFromId: string | null;
  originalOpinionId: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface CaseContent {
  id: string;
  version: number;
  caseName: string | null;
  chapter: string | null;
  post: string | null;
  amount: number | null;
  status: string | null;
  proposalText: string | null;
  justification: string | null;
  verbalConclusion: string | null;
  socioeconomicAnalysis: string | null;
  goalIndicator: string | null;
  benefitPlan: string | null;
  comment: string | null;
  finAssessment: string | null;
  finVerbal: string | null;
  finRConclusion: string | null;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface CaseEvent {
  id: string;
  eventType: string;
  eventData: string | null;
  userId: string;
  userName: string;
  createdAt: string;
}

export interface Question {
  id: string;
  caseId: string;
  askedBy: string;
  askedByName: string;
  questionText: string;
  answerText: string | null;
  answeredBy: string | null;
  answeredByName: string | null;
  createdAt: string;
  answeredAt: string | null;
}

export interface Submission {
  id: string;
  budgetRoundId: string;
  budgetRoundName: string;
  departmentId: string;
  departmentCode: string;
  submittedBy: string;
  submittedByName: string;
  isSupplement: boolean;
  submittedAt: string;
  cases: SubmissionCase[];
}

export interface SubmissionCase {
  caseId: string;
  caseName: string;
  caseType: string;
  status: string;
  amount: number | null;
}

export interface CaseTypeDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  fields: { key: string; label: string; required: boolean }[];
}
