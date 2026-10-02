
const data = () => global.__MOCK__;
function b(t){ const q={select:()=>q,eq:()=>q,not:()=>q,order:()=>q,limit:()=>q,
  maybeSingle: async()=>({data:data()[t+":one"]??null,error:null}),
  then:(r)=>r({data:data()[t+":many"]??[],count:data()[t+":count"]??null,error:null})}; return q; }
const c = { from:(t)=>b(t), rpc: async(n)=>({data:data()["rpc:"+n]??[],error:null}) };
exports.supabasePublic = c; exports.supabaseAdmin = c;