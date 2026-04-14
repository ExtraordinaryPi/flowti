import { EntityReduced } from './common';

export interface PortfolioConfig {
  // Generierung
  grouping?: 'NONE' | 'EXAM' | 'EXAMINEE';
  sortingPrimary?: 'IDENTIFIER' | 'FIRST_NAME' | 'LAST_NAME' | 'VARIANT' | 'VARIANT_ALTERNATING' | 'EXAM_ID' | 'EXAM_TIME';
  sortingSecondary?: 'IDENTIFIER' | 'FIRST_NAME' | 'LAST_NAME' | 'VARIANT' | 'VARIANT_ALTERNATING' | 'EXAM_ID' | 'EXAM_TIME';
  sortingTertiary?: 'IDENTIFIER' | 'FIRST_NAME' | 'LAST_NAME' | 'VARIANT' | 'VARIANT_ALTERNATING' | 'EXAM_ID' | 'EXAM_TIME';
  withQuestionSheets?: boolean;
  coverPage?: boolean;
  modelSolution?: boolean;
  intersperseQuestionAnswerSheets?: boolean;
  splitQuestionAnswerSheet?: boolean;
  questionSheetAfterAnswerSheet?: boolean;
  duplex?: boolean;
  questionAnswerSheetSeparatePageNumber?: boolean;
  examsSeparatePageNumber?: boolean;
  questionSheetNamingScheme?: string;
  answerSheetNamingScheme?: string;
  generationMode?: string;
  // Antwortbogen-Layout
  language?: 'de' | 'fr' | 'en';
  scale?: number;
  answerSheetLogo?: string | null;
  titleSize?: number;
  headingSize?: number;
  textSize?: number;
  checkboxSpacing?: string;
  columnCount?: number;
  singleColumnHeader?: boolean;
  leftTextTemplate?: string;
  rightTextTemplate?: string;
  freeTextHeight?: 'NONE' | 'DEFAULT' | 'SMALL' | 'QUARTER_PAGE' | 'HALF_PAGE' | 'SEVENTY_FIVE_PAGE' | 'FULL_PAGE';
  questionSpacerInterval?: number;
  markerOffset?: number;
  variantLarge?: boolean;
  variantColour?: boolean;
  crossExample?: boolean;
  matriculationTextOverride?: string;
  identificationScale?: string;
  infoText?: string;
  infoTextText?: string;
  agreementConfirmationText?: string;
  // Titelblatt
  coverPageLogo?: string | null;
  [key: string]: unknown;
}

export interface Portfolio {
  id: number;
  name: string;
  state: string;
  config: string[];
  folder?: EntityReduced;
  description?: string;
  lastUpdate?: string;
  portfolioConfig?: PortfolioConfig;
  totalQuestionSheets?: number;
  rawdataCount?: number;
}

export interface PortfolioRequest {
  id?: number;
  name: string;
  state?: string;
  config?: string[];
  folderId?: number;
  description?: string;
  portfolioConfig?: PortfolioConfig;
}

export interface PortfolioState {
  id: number;
  name: string;
  state: string;
}
