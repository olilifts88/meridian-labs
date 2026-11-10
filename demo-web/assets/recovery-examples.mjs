import {blankRecovery,runRecovery,resolveException,reopenRecovery,validateRecovery} from './recovery-engine.mjs';
export const RECOVERY_EXAMPLES=[
 ['routine','Routine recovery'],['exception','Unresolved technical exception'],['reuse','Reuse a checked fix'],
 ['stale','Stale account evidence'],['confirmation','Missing customer confirmation'],['account','Wrong-account evidence'],['reopened','Reopened case · guidance withdrawn']
];
export function preparedRecoveryExample(kind){
 let state=blankRecovery(),selected='session';
 if(kind==='routine')state=runRecovery(state,'session');
 else if(kind==='exception'){selected='investigate';state=runRecovery(state,selected);}
 else if(kind==='reuse'||kind==='reopened'){state=resolveException(runRecovery(state,'investigate'),'investigate');selected='repeat';state=runRecovery(state,selected);if(kind==='reopened')state=reopenRecovery(state,selected);}
 else if(['stale','confirmation','account'].includes(kind))state=runRecovery(state,'session',{fault:{stale:'stale_source',confirmation:'missing_confirmation',account:'wrong_account'}[kind]});
 else throw Error('Unknown worked example.');
 return {state:validateRecovery(state),selected};
}
export function compareRecoveryEvidence(caseId){
 // Prepared versions of the same fictional case, not LLM generations or a benchmark.
 if(caseId==='investigate'){
  const base=runRecovery(blankRecovery(),'investigate');
  return [{label:'Technical fix without confirmation',result:resolveException(base,'investigate',{customerConfirmed:false}).cases.investigate},{label:'Technical fix with confirmation',result:resolveException(base,'investigate').cases.investigate}];
 }
 const base=caseId==='session'?blankRecovery():resolveException(runRecovery(blankRecovery(),'investigate'),'investigate');
 const missing=runRecovery(base,caseId,{fault:'missing_confirmation'});
 const complete=runRecovery(base,caseId);
 const id=caseId;
 return [{label:'Missing confirmation',result:missing.cases[id]},{label:'Expected evidence present',result:complete.cases[id]}];
}
