import type { Dict } from './en';

export const ar: Dict = {
  nav: { home: 'الرئيسية', apps: 'التطبيقات', media: 'الوسائط', settings: 'الإعدادات', search: 'بحث' },
  common: {
    open: 'فتح', close: 'إغلاق', back: 'رجوع', cancel: 'إلغاء', refresh: 'تحديث', on: 'مفعّل', off: 'متوقف',
    yes: 'نعم', no: 'لا', unknown: 'غير معروف', notAvailable: 'غير متاح', comingSoon: 'قريبًا',
    loading: 'جارٍ التحميل…', agentOffline: 'خدمة النظام غير متصلة', retry: 'إعادة المحاولة',
    phase: 'مخطط له في المرحلة {n}',
  },
  status: { online: 'متصل', offline: 'غير متصل', checking: 'جارٍ الفحص…' },
  home: {
    favorites: 'المفضلة', continue: 'تابع المشاهدة', installed: 'تطبيقاتك', library: 'مكتبتك',
    addFavorites: 'أضف مفضلة', addFavoritesHint: 'ثبّت التطبيقات اللي تستخدمها كثير من شاشة التطبيقات.',
    resume: 'استئناف', left: 'باقي {t}', welcome: 'أهلًا بك في SPIDER TV',
    welcomeSub: 'تنقّل بالأسهم، واختر بـ Enter، وارجع بـ Esc.',
  },
  apps: {
    title: 'التطبيقات', subtitle: 'كل التطبيقات على الجهاز، مع توضيح اللي يشتغل فعليًا اليوم.',
    favorite: 'إضافة للمفضلة', unfavorite: 'إزالة من المفضلة', launch: 'فتح',
    launched: 'تم فتح {name}', returnHintMac: 'اضغط ⌘Q للرجوع إلى SPIDER TV.',
    returnHintLinux: 'أغلق النافذة للرجوع إلى SPIDER TV.',
    noBrowser: 'ما في متصفح مبني على Chromium. ثبّت Google Chrome أو Chromium.',
    openedHere: 'انفتح في تبويب جديد (خدمة النظام غير متصلة).',
    closeRunning: 'إغلاق التطبيق المفتوح', running: 'يعمل الآن',
  },
  support: {
    works: 'يعمل', 'drm-limited': 'يعمل · قيود DRM', builtin: 'مدمج',
    notes: {
      youtube: 'يفتح واجهة YouTube الرسمية للتلفزيون (youtube.com/tv) في نافذة متصفح بملء الشاشة باستخدام User-Agent تلفزيوني. هذه الطريقة المستخدمة في أغلب أجهزة التلفزيون المصنوعة يدويًا، وقد تغيّرها Google في أي وقت.',
      drm: 'يشتغل داخل Chromium عبر وحدة Widevine للحماية. المتصفحات تحصل على أدنى مستوى أمان، فالجودة غالبًا محدودة بـ 720p (وأحيانًا SD). الـ 4K وHDR تحتاج جهازًا معتمدًا. سجّل الدخول مرة وحدة داخل النافذة.',
      spotify: 'مشغّل Spotify على الويب يحتاج Widevine أيضًا. الحل الأفضل للتلفزيون (المرحلة 2) هو مستقبل Spotify Connect ‏(librespot)، بحيث تتحكم من جوالك.',
      browser: 'متصفح Chromium كامل بملء الشاشة. الأفضل استخدامه مع لوحة مفاتيح أو تطبيق الجوال مستقبلًا.',
      media: 'يشغّل الفيديوهات من مجلد الوسائط مع حفظ مكان التوقف. الصيغ المدعومة هي اللي يفكّها Chromium ‏(H.264 وVP9 وAV1 وHEVC على الماك).',
      files: 'تصفّح المجلدات المسموح لـ SPIDER TV بقراءتها، وافتح الفيديوهات والموسيقى والصور.',
    },
  },
  media: {
    title: 'الوسائط', subtitle: 'الفيديوهات من {dirs}', empty: 'ما في فيديوهات بعد',
    emptyHint: 'انسخ ملفات الفيديو إلى {dirs} واضغط تحديث.', noDirs: 'ما لقينا مجلد وسائط. أنشئ مجلد Movies ‏(ماك) أو Videos ‏(لينكس) في مجلد المستخدم.',
    unplayable: 'هذه الصيغة قد لا تعمل في المتصفح', browseFiles: 'تصفّح الملفات', allVideos: 'كل الفيديوهات',
  },
  files: { title: 'الملفات', roots: 'المجلدات', empty: 'المجلد فاضي', unsupported: 'ما نقدر نفتح هذا النوع من الملفات حاليًا', up: 'للأعلى' },
  player: {
    error: 'ما نقدر نشغّل هذا الفيديو', errorHint: 'Chromium ما يقدر يفك ترميز هذا الملف. التشغيل الأصلي عبر mpv ‏(كل الصيغ مع تسريع العتاد) مخطط له في المرحلة 2.',
    paused: 'متوقف مؤقتًا', seekHint: '← → تقديم/ترجيع 10 ث · OK تشغيل/إيقاف · رجوع للخروج',
  },
  search: {
    title: 'بحث', placeholder: 'ابحث في التطبيقات والفيديوهات والإعدادات', apps: 'التطبيقات', videos: 'الفيديوهات', settings: 'الإعدادات',
    none: 'ما في نتائج لـ «{q}»', space: 'مسافة', clear: 'مسح', del: 'حذف', typeHint: 'اكتب بلوحة المفاتيح على الشاشة أو بلوحة مفاتيحك.',
  },
  settings: {
    title: 'الإعدادات',
    sections: {
      network: 'الشبكة', bluetooth: 'البلوتوث', display: 'الشاشة', audio: 'الصوت', storage: 'التخزين',
      apps: 'التطبيقات', themes: 'الثيمات', language: 'اللغة', mirroring: 'مشاركة الشاشة',
      system: 'معلومات النظام', updates: 'التحديثات',
    },
    network: {
      internet: 'الإنترنت', latency: 'زمن الاستجابة', interfaces: 'واجهات الشبكة', wifi: 'شبكة Wi-Fi',
      ssidHidden: 'مخفية بسبب إعدادات الخصوصية في macOS', networks: 'الشبكات القريبة', scanUnsupported: 'الاتصال بشبكة Wi-Fi من التلفزيون مخطط له في المرحلة 2 (عبر NetworkManager على لينكس). على الماك استخدم إعدادات النظام.',
      none: 'ما في واجهة شبكة نشطة',
    },
    bluetooth: {
      adapter: 'المحوّل', powered: 'التشغيل', devices: 'الأجهزة المقترنة', none: 'ما في أجهزة مقترنة', unavailable: 'ما تم العثور على محوّل بلوتوث',
      pairing: 'اقتران الريموت والسماعات من التلفزيون مخطط له في المرحلة 2 (عبر BlueZ على لينكس).', connected: 'متصل',
    },
    display: {
      resolution: 'دقة الإخراج', scale: 'نسبة البكسل', refresh: 'معدل التحديث', overscan: 'هوامش الشاشة',
      overscanHint: 'التلفزيونات القديمة تقص أطراف الصورة. زِد القيمة حتى يظهر الإطار بالكامل.',
      reduceMotion: 'تقليل الحركة', clock24: 'ساعة 24 ساعة', modeHint: 'تغيير وضع إخراج HDMI مخطط له في المرحلة 3 (على الجهاز نفسه).',
    },
    audio: { volume: 'مستوى الصوت', mute: 'كتم الصوت', backend: 'نظام الصوت', unsupported: 'التحكم بالصوت غير متاح على هذا الجهاز.', keys: 'أزرار الصوت في الريموت (أو + / − في لوحة المفاتيح) تشتغل بعد.' },
    storage: { volumes: 'الأقراص', free: '{free} متاح من {total}', mediaDirs: 'مجلدات الوسائط', fileRoots: 'المجلدات المقروءة' },
    apps: { hint: 'التطبيقات المفضلة تظهر أولًا في الشاشة الرئيسية.', favorite: 'مفضلة' },
    themes: { hint: 'يغيّر الألوان والخلفيات والتأثيرات في الواجهة كاملة.', active: 'مفعّل' },
    language: { hint: 'العربية تستخدم تخطيطًا من اليمين لليسار.' },
    mirroring: {
      airplay: 'AirPlay ‏(آيفون، آيباد، ماك)', airplayHint: 'يستخدم UxPlay، وهو مستقبل AirPlay مفتوح المصدر. ثبّته بالأمر: brew install uxplay ‏(ماك) أو sudo apt install uxplay ‏(Raspberry Pi OS).',
      notInstalled: 'UxPlay غير مثبّت', start: 'تشغيل المستقبل', stop: 'إيقاف المستقبل', running: 'المستقبل يعمل باسم «{name}»',
      android: 'أندرويد', androidHint: 'ما في مستقبل Miracast أو Google Cast مفتوح المصدر يعتمد عليه. الخيارات قيد التقييم: scrcpy عبر Wi-Fi، أو تطبيقات تدعم AirPlay.',
      drm: 'التطبيقات المحمية (Netflix وDisney+…) تمنع مشاركة الشاشة عمدًا وتظهر شاشة سوداء. هذا قيد DRM وليس خللًا.',
    },
    system: {
      device: 'الجهاز', os: 'نظام التشغيل', arch: 'المعمارية', cpu: 'المعالج', memory: 'الذاكرة', uptime: 'مدة التشغيل',
      shell: 'SPIDER TV', agent: 'خدمة النظام', node: 'بيئة التشغيل', browserForApps: 'متصفح التطبيقات', none: 'غير موجود',
    },
    updates: { current: 'الإصدار المثبّت', hint: 'التحديثات التلقائية مخطط لها في المرحلة 4. حاليًا حدّث بـ git pull ثم npm run build.' },
  },
  themes: {
    classic: { name: 'Classic Spider', desc: 'أحمر وأسود' },
    miles: { name: 'Miles Style', desc: 'أسود وأحمر نيون' },
    symbiote: { name: 'Symbiote', desc: 'أسود وأبيض' },
    '2099': { name: 'Spider 2099', desc: 'أزرق داكن وأحمر' },
  },
  volume: { title: 'الصوت', muted: 'مكتوم' },
  units: { b: 'بايت', kb: 'ك.ب', mb: 'م.ب', gb: 'ج.ب', tb: 'ت.ب', d: 'ي', h: 'س', m: 'د' },
};
