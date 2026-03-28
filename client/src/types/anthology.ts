export interface CaseData {
  case_number: string;
  case_title: string;
  detective_name: string;
  suspect_name: string;
  setting: string;
  story: string;
  question: string;
  the_flaw: string;
  answer: string;
  image_base64: string;
  clues_in_story: string[];
  correct_keywords: string[];
  image_prompt?: string;
  genre?: string;
}

export type AnthologyPhase = 'idle' | 'generating' | 'case_file' | 'grading' | 'reveal';
