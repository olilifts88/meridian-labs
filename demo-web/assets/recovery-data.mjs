// Authored fictional examples. No interview material or live customer records.
export const REVISION = 'customer-recovery-v1';
export const CASES = [
  {id:'session',ticket:'REC-101',title:'An expired browser session',account:'Cedar Studio',accountId:'cedar',symptom:'expired_session',
    goal:'Open the design workspace and continue editing.',
    customer:'I was signed out while editing. When I sign in again, I get sent back to the login screen.',
    context:'The service is healthy and the account has an active workspace membership. The browser session has expired.',
    reply:'Please sign out of this browser session, then sign in again using your usual company sign-in. Your workspace membership will stay unchanged.',
    evidence:{account:'cedar',membership:true,serviceHealthy:true,current:true},
    recovery:{account:'cedar',authentication:true,workspace:true,task:true,customerConfirmed:true}},
  {id:'investigate',ticket:'REC-102',title:'Signed in, but in the wrong workspace',account:'Cedar Studio',accountId:'cedar',symptom:'workspace_redirect',
    goal:'Return to the existing Cedar workspace without changing permissions.',
    customer:'Sign-in works, but I land in an empty personal workspace. I need to get back to our team’s design files.',
    context:'Authentication succeeds and membership is active. The landing workspace does not match the account. There is no approved guide for this symptom yet.',
    reply:'Your sign-in is working, but the workspace shown does not match your team. I’m keeping the evidence and the steps already checked with this case so technical support can investigate.',
    evidence:{account:'cedar',membership:true,serviceHealthy:true,current:true},
    recovery:{account:'cedar',authentication:true,workspace:false,task:false,customerConfirmed:false}},
  {id:'repeat',ticket:'REC-103',title:'Another customer reports the same problem',account:'Cedar Studio',accountId:'cedar',symptom:'workspace_redirect',
    goal:'Use the checked fix from REC-102 to open the correct workspace.',
    customer:'I can sign in, but I only see my personal workspace. Where have our team’s files gone?',
    context:'A second fictional support case with the same account, symptom and membership checks. Run REC-102 first to create reusable guidance.',
    reply:'Open the workspace switcher and choose Cedar Studio. This selects a workspace you already belong to; it does not grant or change access.',
    evidence:{account:'cedar',membership:true,serviceHealthy:true,current:true},
    recovery:{account:'cedar',authentication:true,workspace:true,task:true,customerConfirmed:true}}
];
export const BASE_GUIDANCE = {id:'GUIDE-SESSION-1',version:1,accountId:'cedar',symptom:'expired_session',approved:true,current:true,
  action:'refresh_session',steps:'Sign out of the expired browser session and sign in again using the existing company sign-in.'};
export const TECHNICAL_FIX = {caseId:'investigate',accountId:'cedar',symptom:'workspace_redirect',approved:true,
  action:'choose_existing_workspace',steps:'Open the workspace switcher and select the existing team workspace. Do not change membership or permissions.',
  diagnosis:'The customer had landed in a personal workspace. The technical responder confirmed the existing membership and tested the workspace switcher.',
  recovery:{account:'cedar',authentication:true,workspace:true,task:true,customerConfirmed:true}};
export const ALLOWED_ACTIONS = ['refresh_session','choose_existing_workspace'];
export function caseFor(id){const value=CASES.find(c=>c.id===id);if(!value)throw Error('Unknown recovery case.');return structuredClone(value);}
