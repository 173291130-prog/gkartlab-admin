import { z } from "zod";

const imagePlanSchema=z.object({page:z.number().int().min(1).max(5),type:z.enum(["cover","product","knowledge","scene","purchase"]),headline:z.string().max(40),description:z.string().min(1).max(500)});
export const petContentSchema=z.object({topic:z.string().min(1).max(80),titles:z.array(z.string().min(1).max(60)).length(3),content:z.string().min(80).max(4000),hashtags:z.array(z.string().min(2).max(30)).min(2).max(12),imagePlans:z.array(imagePlanSchema).length(5)});
const truthCheckSchema=z.object({passed:z.boolean(),issues:z.array(z.string().min(1)).max(20)});
export type PetContentResult=z.infer<typeof petContentSchema>;
export type ProductFacts=Record<string,string|null|undefined>;

export class AiTextError extends Error { constructor(public code:"AI_NOT_CONFIGURED"|"AI_AUTH_ERROR"|"AI_BALANCE_ERROR"|"AI_MODEL_NOT_FOUND"|"AI_TIMEOUT"|"AI_PROVIDER_UNAVAILABLE"|"AI_FORMAT_ERROR"|"AI_REVIEW_FAILED",message:string){super(message);this.name="AiTextError";} }

const contentJsonSchema={type:"object",additionalProperties:false,required:["topic","titles","content","hashtags","imagePlans"],properties:{topic:{type:"string"},titles:{type:"array",minItems:3,maxItems:3,items:{type:"string"}},content:{type:"string"},hashtags:{type:"array",minItems:2,maxItems:12,items:{type:"string"}},imagePlans:{type:"array",minItems:5,maxItems:5,items:{type:"object",additionalProperties:false,required:["page","type","headline","description"],properties:{page:{type:"integer",minimum:1,maximum:5},type:{type:"string",enum:["cover","product","knowledge","scene","purchase"]},headline:{type:"string"},description:{type:"string"}}}}}};
const truthJsonSchema={type:"object",additionalProperties:false,required:["passed","issues"],properties:{passed:{type:"boolean"},issues:{type:"array",items:{type:"string"}}}};

export async function generateVerifiedPetContent(facts:ProductFacts,historyTopics:string[],publishedContents:string[]){
  let lastIssues:string[]=[];
  for(let attempt=0;attempt<2;attempt+=1){
    let content:PetContentResult;
    try{content=petContentSchema.parse(await requestStructured("pet_xiaohongshu_content",contentJsonSchema,buildGenerationPrompt(facts,historyTopics,publishedContents,lastIssues)));}
    catch(error){if(attempt===0&&error instanceof AiTextError&&error.code==="AI_FORMAT_ERROR")continue;throw error;}
    const review=truthCheckSchema.parse(await requestStructured("pet_content_truth_check",truthJsonSchema,buildTruthCheckPrompt(facts,historyTopics,publishedContents,content)));
    if(review.passed&&review.issues.length===0)return{content,truthCheck:review};
    lastIssues=review.issues.length?review.issues:["内容审核未通过"];
  }
  throw new AiTextError("AI_REVIEW_FAILED",`内容审核失败：${lastIssues.join("；")}`);
}

async function requestStructured(name:string,schema:object,prompt:string){
  const apiKey=process.env.TEXT_API_KEY||process.env.AI_API_KEY; const base=(process.env.TEXT_API_BASE_URL||process.env.AI_API_BASE_URL||"").replace(/\/+$/,""); const model=process.env.TEXT_MODEL;
  if(!base||!apiKey||!model)throw new AiTextError("AI_NOT_CONFIGURED","文字 AI 未配置：请检查 TEXT_API_BASE_URL、TEXT_API_KEY 和 TEXT_MODEL");
  const attempts=[()=>callResponses(base,apiKey,model,name,schema,prompt),()=>callChatCompletions(base,apiKey,model,name,schema,prompt,true),()=>callChatCompletions(base,apiKey,model,name,schema,prompt,false)];
  let compatibilityError:unknown;
  for(const call of attempts){try{return await call();}catch(error){if(error instanceof AiTextError&&["AI_AUTH_ERROR","AI_BALANCE_ERROR","AI_MODEL_NOT_FOUND","AI_TIMEOUT"].includes(error.code))throw error;compatibilityError=error;}}
  if(compatibilityError instanceof AiTextError)throw compatibilityError;
  throw new AiTextError("AI_PROVIDER_UNAVAILABLE","聚合平台不可用或不兼容支持的文字接口格式");
}

async function callResponses(base:string,key:string,model:string,name:string,schema:object,prompt:string){
  const data=await postJson(endpoint(base,"responses"),key,{model,input:[{role:"user",content:[{type:"input_text",text:prompt}]}],text:{format:{type:"json_schema",name,strict:true,schema}}});
  const text=data.output_text||data.output?.flatMap((x:any)=>x.content||[]).find((x:any)=>x.type==="output_text")?.text;
  return parseModelJson(text);
}

async function callChatCompletions(base:string,key:string,model:string,name:string,schema:object,prompt:string,strict:boolean){
  const responseFormat=strict?{type:"json_schema",json_schema:{name,strict:true,schema}}:{type:"json_object"};
  const data=await postJson(endpoint(base,"chat/completions"),key,{model,messages:[{role:"system",content:"只返回符合要求的 JSON，不要使用 Markdown 代码块。"},{role:"user",content:prompt}],response_format:responseFormat});
  return parseModelJson(data.choices?.[0]?.message?.content);
}

async function postJson(url:string,key:string,body:object){
  let response:Response;
  try{response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});}catch(error){if(error instanceof Error&&(error.name==="TimeoutError"||error.name==="AbortError"))throw new AiTextError("AI_TIMEOUT","AI 请求超时");throw new AiTextError("AI_PROVIDER_UNAVAILABLE",`聚合平台连接失败：${error instanceof Error?error.message:String(error)}`);}
  const raw=await response.text(); let data:any; try{data=raw?JSON.parse(raw):{};}catch{data={message:raw};}
  if(!response.ok){const message=String(data?.error?.message||data?.message||data?.msg||`HTTP ${response.status}`);const lower=message.toLowerCase();if(response.status===401||response.status===403)throw new AiTextError("AI_AUTH_ERROR","API Key 错误或无权访问该模型");if(response.status===402||/balance|quota|credit|余额|额度/.test(lower))throw new AiTextError("AI_BALANCE_ERROR","聚合平台余额或额度不足");if(response.status===404||/model.*not|模型不存在/.test(lower))throw new AiTextError("AI_MODEL_NOT_FOUND",`模型不存在或接口地址错误：${message}`);if(response.status>=500)throw new AiTextError("AI_PROVIDER_UNAVAILABLE",`聚合平台暂时不可用：${message}`);throw new AiTextError("AI_PROVIDER_UNAVAILABLE",`聚合平台请求失败：${message}`);}
  return data;
}

function endpoint(base:string,path:string){return `${base.replace(/\/v1$/," ").trim()}/v1/${path}`;}
function parseModelJson(value:unknown){if(typeof value!=="string"||!value.trim())throw new AiTextError("AI_FORMAT_ERROR","AI 返回格式错误：没有文本结果");const cleaned=value.trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"");try{return JSON.parse(cleaned);}catch{throw new AiTextError("AI_FORMAT_ERROR","AI 返回格式错误：JSON 无法解析");}}

function buildGenerationPrompt(facts:ProductFacts,history:string[],published:string[],issues:string[]){const confirmed=Object.entries(facts).filter(([,v])=>v).map(([k,v])=>`${k}：${v}`).join("\n");return `你是宠物医疗耗材B端小红书内容策划。\n【唯一事实来源】\n${confirmed}\n【最高规则】只能使用产品资料库中明确存在的信息。资料库未提供的信息必须省略，不允许推测、补充或编造。禁止编造针长、流速、适用体重、疗效、临床效果、治疗承诺、认证和厂家宣传参数。\n【历史选题，不得重复】\n${history.join("\n")||"暂无"}\n【最近已发布内容，避免高度相似】\n${published.join("\n---\n")||"暂无"}\n生成1个新选题、3个专业真实标题、正文、标签和严格5张图片方案。图片类型依次为cover、product、knowledge、scene、purchase。不得夸大宣传或保证医疗效果。${issues.length?`\n上次审核问题，必须修正：${issues.join("；")}`:""}`;}
function buildTruthCheckPrompt(facts:ProductFacts,history:string[],published:string[],content:PetContentResult){return `你是严格的医疗耗材内容审核员。检查：是否出现资料库不存在的参数；是否夸大宣传或承诺治疗效果；是否虚假医疗表述；是否修改品牌、产品名、规格；是否与历史选题或已发布内容高度重复。\n资料：${JSON.stringify(facts)}\n历史选题：${JSON.stringify(history)}\n已发布内容：${JSON.stringify(published)}\n候选：${JSON.stringify(content)}\n无问题时passed=true且issues=[]。`}
export function getTextModelName(){return process.env.TEXT_MODEL||"";}
export function getTextAiConfig(){const key=process.env.TEXT_API_KEY||process.env.AI_API_KEY||"";const baseUrl=process.env.TEXT_API_BASE_URL||process.env.AI_API_BASE_URL||"";return{configured:Boolean(baseUrl&&key&&process.env.TEXT_MODEL),baseUrl,model:process.env.TEXT_MODEL||"",maskedKey:key?`${key.slice(0,3)}****${key.slice(-4)}`:""};}
