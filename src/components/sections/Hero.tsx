"use client";
import Link from "next/link";
import { ShoppingBag, Users, ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section style={{position:"relative",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"transparent"}}>
      <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"600px",height:"400px",background:"radial-gradient(ellipse,rgba(18,100,160,0.2) 0%,transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"relative",zIndex:10,maxWidth:"860px",margin:"0 auto",padding:"120px 24px 60px",textAlign:"center"}}>
        <h1 style={{fontFamily:"'Cinzel Decorative',Georgia,serif",fontSize:"clamp(2.2rem,6vw,5rem)",color:"#ffffff",lineHeight:1.1,marginBottom:"24px",textShadow:"0 0 80px rgba(58,163,232,0.5)"}}>
          Dive Into the{" "}<span style={{color:"#7dc4f0"}}>Underground</span>
        </h1>
        <p style={{fontFamily:"Georgia,serif",fontSize:"1.2rem",color:"rgba(194,228,250,0.85)",maxWidth:"580px",margin:"0 auto 40px",lineHeight:1.75}}>
          Buy, sell, and connect with aquarium enthusiasts. Live fish, rare plants, 3D-printed gear — everything the hobby needs, in one place.
        </p>
        <div style={{display:"flex",flexWrap:"wrap",gap:"16px",justifyContent:"center",marginBottom:"60px"}}>
          <Link href="/marketplace" style={{display:"inline-flex",alignItems:"center",gap:"10px",padding:"14px 28px",background:"#0e4a76",color:"#fff",borderRadius:"14px",fontSize:"1.05rem",fontWeight:600,textDecoration:"none",boxShadow:"0 0 30px rgba(14,74,118,0.6)"}}>
            <ShoppingBag size={18}/> Browse Marketplace <ArrowRight size={15}/>
          </Link>
          <Link href="/sell" style={{display:"inline-flex",alignItems:"center",gap:"10px",padding:"14px 28px",background:"rgba(7,34,54,0.8)",color:"#c2e4fa",border:"1px solid rgba(26,130,204,0.4)",borderRadius:"14px",fontSize:"1.05rem",fontWeight:600,textDecoration:"none"}}>
            <Users size={18}/> Open Your Shop
          </Link>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"20px",maxWidth:"400px",margin:"0 auto"}}>
          {[["Free","To Join"],["10%","Commission"],["∞","Species"]].map(([v,l])=>(
            <div key={l} style={{textAlign:"center"}}>
              <div style={{fontFamily:"Georgia,serif",fontSize:"1.9rem",color:"#c2e4fa",textShadow:"0 0 20px rgba(58,163,232,0.5)"}}>{v}</div>
              <div style={{fontFamily:"monospace",fontSize:"9px",letterSpacing:"0.1em",color:"#1a82cc",textTransform:"uppercase",marginTop:"4px"}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:"100px",background:"linear-gradient(to top,#020b18,transparent)",pointerEvents:"none"}}/>
    </section>
  );
}
