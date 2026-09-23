import {Preferences} from "@capacitor/preferences";
import {createEmptyAccount, type HydraAccount} from "../lib/hydra-types";
import {activateLocalHydraCodeAccount, loadLocalHydraCodeAccount, saveLocalHydraCodeAccount} from "./code-auth-service";

const FALLBACK_NIVO_CHAT="https://nivostudy.danqxy7.workers.dev/api/hydra/chat";
const TOKEN_PREFIX="hydra.nivo.integration.";

export type NivoIssuedCodes={
  accessCode:string;
  recoveryCode:string;
};

export type HydraNivoAuthResult={
  account:HydraAccount;
  issued?:NivoIssuedCodes;
};

function accountEndpoint(){
  const raw=import.meta.env.VITE_NIVO_AGRO_API?.trim()||FALLBACK_NIVO_CHAT;
  const url=new URL(raw);
  url.pathname="/api/hydra/account";
  url.search="";
  url.hash="";
  return url.toString();
}

async function request(body:Record<string,unknown>, token?:string){
  const response=await fetch(accountEndpoint(),{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      ...(token?{Authorization:"Bearer "+token}:{})
    },
    body:JSON.stringify(body)
  });
  const data=await response.json().catch(()=>null) as null|Record<string,unknown>;
  if(!response.ok)throw new Error(typeof data?.error==="string"?data.error:"Não foi possível conectar ao Nivo agora.");
  return data??{};
}

async function ensureLocalLinkedAccount(userId:string, integrationToken?:string, activate=true){
  const id="nivo-"+userId;
  let account=await loadLocalHydraCodeAccount(id);
  if(!account){
    account=createEmptyAccount({
      id,
      email:"",
      name:"Produtor"
    });
    account={...account,role:"user"};
    await saveLocalHydraCodeAccount(account);
  }
  if(account.role!=="user"){
    account={...account,role:"user"};
    await saveLocalHydraCodeAccount(account);
  }
  if(integrationToken){
    await Preferences.set({key:TOKEN_PREFIX+id,value:integrationToken});
  }
  return activate?await activateLocalHydraCodeAccount(id):account;
}

export async function loginHydraWithNivo(code:string):Promise<HydraNivoAuthResult>{
  const data=await request({action:"nivo-login",code});
  const userId=typeof data.userId==="string"?data.userId:"";
  const integrationToken=typeof data.integrationToken==="string"?data.integrationToken:"";
  if(!userId||!integrationToken)throw new Error("O Nivo não retornou um vínculo válido.");
  const account=await ensureLocalLinkedAccount(userId,integrationToken);
  await syncHydraFarmToNivo(account).catch(()=>undefined);
  return {account};
}

export async function createHydraWithNivo():Promise<HydraNivoAuthResult>{
  const data=await request({action:"nivo-create"});
  const userId=typeof data.userId==="string"?data.userId:"";
  const accessCode=typeof data.accessCode==="string"?data.accessCode:"";
  const recoveryCode=typeof data.recoveryCode==="string"?data.recoveryCode:"";
  const integrationToken=typeof data.integrationToken==="string"?data.integrationToken:"";
  if(!userId||!accessCode||!recoveryCode||!integrationToken)throw new Error("Não foi possível criar a conta Nivo.");
  const account=await ensureLocalLinkedAccount(userId,integrationToken,false);
  await syncHydraFarmToNivo(account).catch(()=>undefined);
  return {account,issued:{accessCode,recoveryCode}};
}

export async function syncHydraFarmToNivo(account:HydraAccount){
  if(!account.id.startsWith("nivo-"))return false;
  const {value:token}=await Preferences.get({key:TOKEN_PREFIX+account.id});
  if(!token)return false;
  const farm={
    hydraUserId:account.id,
    propertyName:account.property.name,
    municipality:account.property.municipality,
    state:account.property.state,
    area:account.property.area,
    areaUnit:account.property.areaUnit,
    mainActivity:account.property.mainActivity,
    animalCount:account.animals.length,
    waterSourceCount:account.waterSources.length,
    pendingTaskCount:account.activities.filter(activity=>!activity.done).length,
    sectorCount:account.sectors.length
  };
  await request({action:"sync",farm},token);
  return true;
}
