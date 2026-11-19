import {create} from 'zustand';
import {persist} from 'zustand/middleware';
export type CloudBase={userId:string;revision:number;snapshot:string;org:string};
export const useCloudState=create<{
 bases:Record<string,CloudBase>; statuses:Record<string,string>; email:string|null; message:string;
 remember:(id:string,base:CloudBase)=>void; status:(id:string,text:string)=>void;
}>()(persist((set)=>({bases:{},statuses:{},email:null,message:'Проверяем облако…',
 remember:(id,base)=>set(s=>({bases:{...s.bases,[id]:base}})),
 status:(id,text)=>set(s=>({statuses:{...s.statuses,[id]:text}}))
}),{name:'development-modeler-v3-cloud',partialize:s=>({bases:s.bases})}));
/** Only upload edits based on the same cloud revision. Unknown differences need a choice. */
export function reconcileCloud(local:string|undefined,remote:string,base?:string){
 if(local===undefined)return 'download';
 if(local===remote)return 'equal';
 if(base!==undefined&&local===base)return 'download';
 if(base!==undefined&&remote===base)return 'upload';
 return 'conflict';
}
