export const INSTRUCTION_LABELS={basic:'What to produce',guided:'What to produce + how to do it'};
export const instructionLabel=value=>INSTRUCTION_LABELS[String(value).endsWith('guided')?'guided':'basic'];
export const INSTRUCTION_CONTEXT='Same task. Same source evidence.';
