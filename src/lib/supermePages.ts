export type SuperMeSection = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
};

export type SuperMePage = {
  id: string;
  sectionId: string;
  sectionTitle: string;
  title: string;
  kind: 'tracker' | 'learning' | 'project' | 'writing' | 'creative' | 'game' | 'drawing';
  description: string;
  items: string[];
  prompt: string;
  quote?: string;
  qrUrl?: string;
  legacyArtworkId?: string;
  previewAssetRef?: string;
};

export const SUPERME_SECTIONS: SuperMeSection[] = [
  { id: 'faith', title: 'ديني', subtitle: 'عبادات وأهداف تقرّبني', icon: '☾' },
  { id: 'learn', title: 'اتعلّم', subtitle: 'مهارات ومعرفة جديدة', icon: '✦' },
  { id: 'hobbies', title: 'هواياتي', subtitle: 'وقت للحاجات اللي بحبها', icon: '✿' },
  { id: 'art', title: 'رسم', subtitle: 'مساحة للإبداع والتجربة', icon: '✎' },
  { id: 'travel', title: 'سفر', subtitle: 'أماكن وتجارب نفسي أعيشها', icon: '⌁' },
  { id: 'plans', title: 'خططي', subtitle: 'أهداف وخطوات ومتابعة', icon: '▦' },
  { id: 'projects', title: 'مشاريعي', subtitle: 'أفكار تتحول لواقع', icon: '◇' },
  { id: 'wishes', title: 'أمنياتي', subtitle: 'أحلام تستاهل مساحة', icon: '☆' },
  { id: 'games', title: 'ألعاب', subtitle: 'تحديات وذكاء ومرح', icon: '♧' },
  { id: 'relax', title: 'روقان', subtitle: 'مساحة لنفسي وذكرياتي', icon: '☁' },
];

const titles: Record<string, string[]> = {
  faith: ['صلواتي على مدار السنة', 'رحلتي مع جزء عمّ', 'صدقاتي وأعمال الخير', 'ورد القرآن', 'أذكاري اليومية', 'أهدافي الإيمانية'],
  learn: ['اتعلّم صناعة المحتوى', 'خطة تعلّم لغة جديدة', 'مهارة جديدة كل شهر', 'كورسات عايز أخلصها', 'كتاب غيّر طريقة تفكيري', 'تطبيق اللي اتعلمته'],
  hobbies: ['قائمة الكتب', 'أفلام تستحق المشاهدة', 'وصفات عايز أجربها', 'هواية جديدة', 'تحدي التصوير', 'إنجازاتي الرياضية'],
  art: ['مساحة رسم حر', 'تحدي 30 يوم رسم', 'أفكار اسكتشات', 'لوحة الألوان المفضلة', 'رسمة من خيالي', 'رسومات فُكّي الضغط'],
  travel: ['قائمة الأماكن اللي نفسي أزورها', 'خطة رحلتي القادمة', 'ميزانية السفر', 'شنطة السفر', 'ذكريات رحلة', 'خريطة الأماكن اللي زرتها'],
  plans: ['أهداف السنة', 'خطة الشهر', 'أسبوعي بشكل أبسط', 'متابعة العادات', 'أولوياتي اليوم', 'إنجازاتي الصغيرة'],
  projects: ['بطاقة تعريف المشروع', 'فكرة المشروع', 'خريطة التنفيذ', 'الجمهور المستهدف', 'ميزانية المشروع', 'متابعة مراحل المشروع'],
  wishes: ['قائمة أمنياتي', 'نسختي القادمة', 'تجارب نفسي أخوضها', 'أشياء أريد امتلاكها', 'أماكن في قائمة أحلامي', 'رسالة لنفسي في المستقبل'],
  games: ['اختبر معلوماتك', 'ألغاز وتفكير', 'تحدي الكلمات', 'أسئلة بين الأصحاب', 'تحدي الذاكرة', 'ارسم وخمّن'],
  relax: ['مساحة كتابة حرة', 'حاجات ممتن لها', 'اقتباسات أحبها', 'لحظات حلوة', 'قائمة مزاجي', 'يوم لنفسي'],
};

const descriptions: Record<string, string> = {
  faith: 'تابع خطواتك بهدوء، واجعل لكل عادة مساحة واضحة في يومك.',
  learn: 'حوّل المحتوى الذي تتعلمه إلى مراحل صغيرة قابلة للإنجاز والتطبيق.',
  hobbies: 'احتفظ بقائمة تجاربك، وسجّل ما استمتعت به وما تريد تجربته بعد ذلك.',
  art: 'مساحة مفتوحة للتجربة والرسم والتعبير بطريقتك.',
  travel: 'خطط لتجربتك من الفكرة وحتى الذكريات التي ستعود بها.',
  plans: 'قسّم هدفك إلى خطوات، واحتفل بالتقدم مهما كان صغيرًا.',
  projects: 'رتّب فكرتك واكتب تفاصيلها وحوّلها إلى خطة قابلة للتنفيذ.',
  wishes: 'اكتب ما تتمناه، ثم اختر أمنية واحدة وابدأ أول خطوة نحوها.',
  games: 'تحديات خفيفة تضيف المرح وتحرك التفكير والإبداع.',
  relax: 'مساحة هادئة لك، بلا ضغط ولا قواعد كثيرة.',
};

const commonItems: Record<string, string[]> = {
  faith: ['الهدف', 'التاريخ', 'المتابعة', 'ملاحظاتي'],
  learn: ['المصدر / الكورس', 'المرحلة', 'التطبيق العملي', 'ملاحظاتي'],
  hobbies: ['اسم التجربة', 'التاريخ', 'تقييمي', 'ملاحظاتي'],
  art: ['الفكرة', 'الأدوات', 'التجربة', 'ملاحظاتي'],
  travel: ['المكان', 'التاريخ', 'التكلفة', 'ملاحظاتي'],
  plans: ['الهدف', 'موعد التنفيذ', 'خطواتي', 'الإنجاز'],
  projects: ['الفكرة', 'الخطوة التالية', 'الموعد', 'الحالة'],
  wishes: ['الأمنية', 'لماذا تهمني؟', 'أول خطوة', 'التاريخ'],
  games: ['التحدي', 'المحاولة', 'النتيجة', 'ملاحظاتي'],
  relax: ['مساحتي', 'التاريخ', 'ما أشعر به', 'شيء أريد تذكره'],
};

function makePage(sectionId: string, index: number, title: string): SuperMePage {
  const section = SUPERME_SECTIONS.find(item => item.id === sectionId)!;
  const kind: SuperMePage['kind'] =
    sectionId === 'learn' ? 'learning' :
    sectionId === 'projects' ? 'project' :
    sectionId === 'art' ? 'drawing' :
    sectionId === 'games' ? 'game' :
    ['faith', 'plans'].includes(sectionId) ? 'tracker' :
    ['hobbies', 'travel'].includes(sectionId) ? 'creative' : 'writing';
  const page: SuperMePage = {
    id: 'SM-' + sectionId.toUpperCase() + '-' + String(index + 1).padStart(2, '0'),
    sectionId, sectionTitle: section.title, title, kind,
    description: descriptions[sectionId],
    items: commonItems[sectionId],
    prompt: 'اكتب أفكارك هنا…',
    quote: sectionId === 'plans' ? 'كل خطوة صغيرة بتقرّبك.' : undefined,
  };
  if (sectionId === 'faith' && index === 0) {
    page.description = 'تابع الصلوات الخمس يومًا بيوم على مدار السنة، وعلّم على كل صلاة أنجزتها.';
    page.items = ['الفجر', 'الظهر', 'العصر', 'المغرب', 'العشاء'];
    page.prompt = 'مساحة لملاحظاتك وأهدافك';
  }
  if (sectionId === 'faith' && index === 1) {
    page.description = 'قائمة سور جزء عمّ، مع متابعة مستقلة للحفظ والمراجعة والتسميع.';
    page.items = ['النبأ', 'النازعات', 'عبس', 'التكوير', 'الانفطار', 'المطففين', 'الانشقاق', 'البروج', 'الطارق', 'الأعلى', 'الغاشية', 'الفجر', 'البلد', 'الشمس', 'الليل', 'الضحى', 'الشرح', 'التين', 'العلق', 'القدر', 'البينة', 'الزلزلة', 'العاديات', 'القارعة', 'التكاثر', 'العصر', 'الهمزة', 'الفيل', 'قريش', 'الماعون', 'الكوثر', 'الكافرون', 'النصر', 'المسد', 'الإخلاص', 'الفلق', 'الناس'];
    page.prompt = 'لكل سورة: حفظ · مراجعة · تسميع';
  }
  if (sectionId === 'faith' && index === 2) {
    page.items = ['صدقة يومية', 'صدقة جارية', 'مساعدة محتاج', 'إطعام طعام', 'مساهمة تطوعية'];
    page.prompt = 'اكتب أثرًا جميلًا تحب أن تتركه';
  }
  if (sectionId === 'learn' && index === 0) {
    page.description = 'امسح الكود لفتح محتوى تعليمي عن صناعة المحتوى، ثم تابع كل مرحلة وطبّق ما تعلمته.';
    page.items = ['فهم الجمهور وفكرة المحتوى', 'كتابة سكريبت جذاب', 'التصوير وتجهيز الأدوات', 'المونتاج والتحرير', 'النشر وتحليل النتائج', 'تنفيذ أول قطعة محتوى'];
    page.prompt = 'اكتب رابط الكورس أو المصدر الذي تتابعه';
    page.qrUrl = 'https://www.youtube.com/results?search_query=كورس+صناعة+المحتوى';
  }
  if (sectionId === 'projects' && index === 0) {
    page.description = 'صفحة تأسيس مشروعك: عرّف المشروع وارسم شعاره واكتب الفكرة التي تريد تحويلها إلى واقع.';
    page.items = ['اسم المشروع', 'فكرة المشروع', 'الجمهور المستهدف', 'القيمة التي يقدمها', 'أول خطوة تنفيذ', 'الموارد المطلوبة'];
    page.prompt = 'ارسم شعار مشروعك في المساحة المخصصة';
  }
  if (sectionId === 'travel' && index === 1) {
    page.items = ['الوجهة', 'موعد الرحلة', 'الإقامة', 'المواصلات', 'الأنشطة', 'ميزانية الرحلة'];
  }
  return page;
}

export const BUILT_IN_PAGES: SuperMePage[] = SUPERME_SECTIONS.flatMap(section =>
  (titles[section.id] || []).map((title, index) => makePage(section.id, index, title)),
);

export function mapLegacyArtwork(artwork: {
  id: string; title: string; category: string; previewAssetRef: string;
}): SuperMePage {
  return {
    id: 'legacy-' + artwork.id,
    sectionId: 'art',
    sectionTitle: 'رسومات فُكّي الضغط المحفوظة',
    title: artwork.title,
    kind: 'drawing',
    description: 'تصميم محفوظ من مكتبة فُكّي الضغط الأصلية. تم الاحتفاظ بمعرّفه ومرجع معاينته دون تعديل.',
    items: ['مساحة للرسم أو التلوين'],
    prompt: 'رسمة من المكتبة الأصلية',
    legacyArtworkId: artwork.id,
    previewAssetRef: artwork.previewAssetRef,
  };
}
