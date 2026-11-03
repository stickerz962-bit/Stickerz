import { useMemo, useState } from 'react';

type Referral = { id:string; date:string; order:string; status:'Delivered'|'Pending'|'Cancelled'; commission:number };
const sample: Referral[] = [
 {id:'1',date:'2026/10/28',order:'AP-1042',status:'Delivered',commission:20},
 {id:'2',date:'2026/10/30',order:'AP-1051',status:'Pending',commission:0},
 {id:'3',date:'2026/11/01',order:'AP-1059',status:'Delivered',commission:20},
];
export default function PartnerDashboardApp(){
 const [tab,setTab]=useState<'overview'|'orders'|'payouts'>('overview');
 const [copy,setCopy]=useState(false);
 const rows=useMemo(()=>sample,[ ]);
 const link='https://stickerz962-bit.github.io/Stickerz/?ref=DEMO-PARTNER';
 const delivered=rows.filter(r=>r.status==='Delivered').length;
 return <div className="anti-shell" dir="rtl">
 <div className="top-note">لوحة الشريك — واجهة تجريبية ببيانات توضيحية فقط</div>
 <header className="site-header"><a className="brand" href="./"><span className="brand-spark">✳</span><span className="brand-word">ANTI<br/>PRESSURE</span><span className="brand-arabic">فُكّي الضغط</span></a><a className="header-cta" href="./partner.html">التسجيل كشريك</a></header>
 <main className="section-wrap">
 <div className="section-heading"><span className="eyebrow">مساحتك الخاصة ♡</span><h1>أهلاً يا شريكة النجاح</h1><p>تابعي إحالاتك وطلباتك ومستحقاتك من مكان واحد.</p></div>
 <div className="promise-strip" style={{gridTemplateColumns:'repeat(3,1fr)'}}><div><span>↗</span><p><b>{rows.length}</b><small>إجمالي الإحالات (مثال)</small></p></div><div><span>♡</span><p><b>{delivered*20} جنيه</b><small>عمولة مستحقة مبدئيًا (مثال)</small></p></div><div><span>✓</span><p><b>{delivered}</b><small>طلبات تم تسليمها (مثال)</small></p></div></div>
 <div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'22px 0'}}>{(['overview','orders','payouts'] as const).map(t=><button className="header-cta" key={t} onClick={()=>setTab(t)}>{t==='overview'?'نظرة عامة':t==='orders'?'الطلبات':'المستحقات'}</button>)}</div>
 {tab==='overview'&&<section className="ap-admin-form"><h2>لينك الإحالة الخاص بك</h2><p style={{direction:'ltr',overflowWrap:'anywhere'}}>{link}</p><button className="primary-button" onClick={()=>{void navigator.clipboard?.writeText(link);setCopy(true)}}>{copy?'تم النسخ':'نسخ لينك الإحالة'}</button><p>العمولة: 20 جنيه عن كل طلب يتم تسليمه بنجاح، وتُراجع قبل الصرف.</p></section>}
 {tab==='orders'&&<section className="ap-admin-form"><h2>طلبات الإحالة</h2><div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'right'}}><thead><tr><th>رقم الطلب</th><th>التاريخ</th><th>الحالة</th><th>العمولة</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.order}</td><td>{r.date}</td><td>{r.status==='Delivered'?'تم التسليم':r.status==='Pending'?'قيد التنفيذ':'ملغي'}</td><td>{r.commission} ج</td></tr>)}</tbody></table></div></section>}
 {tab==='payouts'&&<section className="ap-admin-form"><h2>المستحقات</h2><p>المستحق التوضيحي: {delivered*20} جنيه</p><p>حالة الصرف: لا توجد بيانات صرف فعلية في هذه النسخة.</p><p>تتم مراجعة المستحقات واعتمادها من الإدارة قبل التحويل.</p></section>}
 <p style={{textAlign:'center',fontSize:12,color:'#777'}}>هذه لوحة تجريبية. الأرقام والطلبات واللينك ليست بيانات حقيقية ولا تسجل أو تصرف عمولات.</p>
 </main></div>;
}