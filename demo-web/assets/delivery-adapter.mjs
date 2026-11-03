import {draftFor} from './business-engine.mjs';

// Explicit execution boundary. The adapter returns authored fixtures, never generated text.
// A live provider would need its own credentials, request budget, timeout and usage receipt.
export const ADAPTER={id:'prepared-business-fixture-v1',mode:'prepared_response',liveCalls:false,provider:null};
export function prepareDelivery(caseId){
 return {draft:draftFor('call-crm',caseId),execution:{adapter:ADAPTER.id,mode:ADAPTER.mode,provider:null,actualModel:null,modelCalls:0,modelUsage:null}};
}
