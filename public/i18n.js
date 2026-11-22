/* Lokizenith i18n — English / עברית / العربية. Made by Lokiz Studios. */
(function(){
'use strict';
// en | he | ar
const RAW = `
Design|עיצוב|التصميم
Design assistant|עוזר עיצוב|مساعد التصميم
Describe a look or a new animated background — it is applied live and saved below.|תארו מראה או רקע מונפש חדש — הוא מוחל מיד ונשמר למטה.|صِف مظهرًا أو خلفية متحركة جديدة — سيُطبَّق فورًا ويُحفظ أدناه.
e.g. make all buttons rounded purple glass|לדוגמה: כל הכפתורים מעוגלים מזכוכית סגולה|مثلًا: اجعل كل الأزرار زجاجًا بنفسجيًا مستديرًا
Design it|עצב|صمّمه
Designing…|מעצב…|جارٍ التصميم…
Designing|מעצב|جارٍ التصميم
Fixing a problem in the design|מתקן בעיה בעיצוב|إصلاح مشكلة في التصميم
Applied|הוחל|تم التطبيق
Custom designs|עיצובים מותאמים|تصاميم مخصصة
Undo|ביטול|تراجع
Undone|בוטל|تم التراجع
Reset to default|איפוס לברירת מחדל|إعادة الافتراضي
No custom designs yet — describe one above.|אין עדיין עיצובים — תארו אחד למעלה.|لا توجد تصاميم بعد — صِف واحدًا بالأعلى.
Design deleted — Undo is available|העיצוב נמחק — אפשר לבטל|حُذف التصميم — يمكنك التراجع
Back to the default look — your designs are kept (switched off)|חזרה למראה ברירת המחדל — העיצובים נשמרו (כבויים)|عاد المظهر الافتراضي — تصاميمك محفوظة (متوقفة)
Make all buttons rounded purple glass|כל הכפתורים מעוגלים מזכוכית סגולה|اجعل كل الأزرار زجاجًا بنفسجيًا مستديرًا
Create a new animated background with lots of changing emojis|צור רקע מונפש חדש עם הרבה אימוג'ים מתחלפים|أنشئ خلفية متحركة جديدة مليئة بالإيموجي المتغيرة
Warm sunset accent with softer corners|צבע שקיעה חם ופינות רכות יותר|لون غروب دافئ وزوايا أنعم
Neon pink glow on my messages|זוהר ורוד ניאון על ההודעות שלי|توهج وردي نيون على رسائلي
Starry night background with shooting stars|רקע לילה מכוכב עם כוכבים נופלים|خلفية ليل مرصع بالنجوم مع شهب
The design could not be applied safely — try describing it differently.|לא ניתן היה להחיל את העיצוב בבטחה — נסו לתאר אחרת.|تعذّر تطبيق التصميم بأمان — جرّب وصفه بطريقة أخرى.
Storage is full — delete an old design|האחסון מלא — מחקו עיצוב ישן|التخزين ممتلئ — احذف تصميمًا قديمًا
On / off|הפעלה / כיבוי|تشغيل / إيقاف

Mascot|קמע|التميمة
An animated buddy that reacts while Lokizenith works|חבר מונפש שמגיב בזמן ש-Lokizenith עובד|رفيق متحرك يتفاعل أثناء عمل Lokizenith
Walk around|הליכה|التجوّل
Let Loki wander along the message box|לוקי יטייל לאורך תיבת ההודעה|دع لوكي يتجول على طول مربع الرسالة
Try an expression|נסו הבעה|جرّب تعبيرًا
Happy|שמח|سعيد
Curious|סקרן|فضولي
Thinking|חושב|يفكر
Talking|מדבר|يتحدث
Surprised|מופתע|متفاجئ
Oops|אופס|عذرًا
Waving|מנופף|يلوّح
Love|אהבה|حب
Sleepy|ישנוני|نعسان
Aurora|זוהר צפוני|الشفق
Warp|מהירות האור|الالتواء
Bokeh|בוקה|بوكيه
Waves|גלים|أمواج
Horizon|אופק|الأفق
Fireflies|גחליליות|اليراعات
Hex pulse|פעימת משושים|نبض سداسي
Orbits|מסלולים|مدارات
8 new animated backgrounds: Aurora, Warp, Bokeh, Waves, Horizon, Fireflies, Hex pulse and Orbits|8 רקעים מונפשים חדשים: זוהר צפוני, מהירות האור, בוקה, גלים, אופק, גחליליות, פעימת משושים ומסלולים|8 خلفيات متحركة جديدة: الشفق، الالتواء، بوكيه، أمواج، الأفق، اليراعات، نبض سداسي ومدارات
Loki, the animated mascot: blinks, follows your cursor, looks around, walks along the message box, thinks while working, talks while answering, celebrates, waves and joins voice calls (Settings → Mascot)|לוקי, הקמע המונפש: ממצמץ, עוקב אחרי הסמן, מסתכל סביב, מטייל לאורך תיבת ההודעה, חושב בזמן עבודה, מדבר בזמן תשובה, חוגג, מנופף ומצטרף לשיחות קוליות (הגדרות ← קמע)|لوكي، التميمة المتحركة: يرمش ويتابع المؤشر وينظر حوله ويتجول على مربع الرسالة ويفكر أثناء العمل ويتحدث أثناء الإجابة ويحتفل ويلوّح وينضم إلى المكالمات الصوتية (الإعدادات ← التميمة)

New chat|צ׳אט חדש|محادثة جديدة
Search chats…|חיפוש בצ׳אטים…|ابحث في المحادثات…
Settings|הגדרות|الإعدادات
⚙ Settings|⚙ הגדרות|⚙ الإعدادات
Labs|מעבדה|المختبر
✦ Labs|✦ מעבדה|✦ المختبر
Lab|מעבדה|مختبر
Today|היום|اليوم
Yesterday|אתמול|أمس
Previous 7 days|7 הימים האחרונים|آخر 7 أيام
Previous 30 days|30 הימים האחרונים|آخر 30 يومًا
Older|ישן יותר|أقدم
Pinned|מוצמד|مثبّت
Pin|הצמד|تثبيت
Unpin|בטל הצמדה|إلغاء التثبيت
Unpinned|ההצמדה בוטלה|أُلغي التثبيت
Rename|שנה שם|إعادة تسمية
Delete|מחק|حذف
Delete this chat?|למחוק את הצ׳אט הזה?|حذف هذه المحادثة؟
Apply|החל|تطبيق
Background applied|הרקע הוחל|تم تطبيق الخلفية
Animated backgrounds|רקעים מונפשים|خلفيات متحركة
None|ללא|بدون
Sign out|התנתק|تسجيل الخروج
Sign out every other device? This browser stays signed in.|לנתק את כל שאר המכשירים? הדפדפן הזה יישאר מחובר.|تسجيل الخروج من كل الأجهزة الأخرى؟ يبقى هذا المتصفح مسجّلاً.
Chat deleted|הצ׳אט נמחק|حُذفت المحادثة
No chats yet.|אין עדיין צ׳אטים.|لا توجد محادثات بعد.
Start a conversation ✦|התחילו שיחה ✦|ابدأ محادثة ✦
Message Lokizenith…|כתבו ל-Lokizenith…|اكتب إلى Lokizenith…
Lokizenith can make mistakes. Check important info.|Lokizenith עלול לטעות. כדאי לבדוק מידע חשוב.|قد يخطئ Lokizenith. تحقّق من المعلومات المهمة.
Send|שלח|إرسال
Stop|עצור|إيقاف
Voice|קול|صوت
Dictate|הכתבה|إملاء
Live voice call|שיחה קולית חיה|مكالمة صوتية مباشرة
Upload image or file|העלאת תמונה או קובץ|رفع صورة أو ملف
Create image|יצירת תמונה|إنشاء صورة
Search the web|חיפוש ברשת|البحث في الويب
Make a PowerPoint|הכנת מצגת|إنشاء عرض تقديمي
Create a file|יצירת קובץ|إنشاء ملف
Thinking|חשיבה|التفكير
Thinking level — higher is slower but smarter|רמת חשיבה — גבוהה יותר איטית אבל חכמה יותר|مستوى التفكير — الأعلى أبطأ لكنه أذكى
Medium|בינונית|متوسط
High|גבוהה|عالٍ
Extra High|גבוהה מאוד|عالٍ جدًا
Ultra|אולטרה|فائق
Open menu|פתח תפריט|افتح القائمة
Close menu|סגור תפריט|أغلق القائمة
made by|נוצר על ידי|من صنع
Write · Run · Ship|כתבו · הריצו · שגרו|اكتب · شغّل · انشر
Learn · Practice · Ace it|לומדים · מתרגלים · מצליחים|تعلّم · تدرّب · تفوّق
Describe it. Watch it get built. Run it.|תארו את זה. צפו בבנייה. הריצו.|صِفه. شاهده يُبنى. شغّله.
e.g. A snake game with score and speed levels…|למשל: משחק נחש עם ניקוד ורמות מהירות…|مثلًا: لعبة ثعبان مع نقاط ومستويات سرعة…
Generate ⚡|צור ⚡|أنشئ ⚡
Fast everyday model. Chats, sees images and reads your files.|מודל מהיר לכל יום. משוחח, רואה תמונות וקורא קבצים.|نموذج سريع لكل يوم. يدردش ويرى الصور ويقرأ ملفاتك.
Upgraded flagship. Smarter & faster, plus images, web search, PowerPoint and file creation.|מודל הדגל המשודרג. חכם ומהיר יותר, ועוד תמונות, חיפוש ברשת, מצגות ויצירת קבצים.|النموذج الرائد المطوّر. أذكى وأسرع، مع الصور والبحث على الويب والعروض التقديمية وإنشاء الملفات.
Fera + Stark|Fera + Stark|Fera + Stark
Upgraded|משודרג|مطوّر
· Default|· ברירת מחדל|· افتراضي
Output|פלט|المخرجات
Preview|תצוגה מקדימה|معاينة
Run|הרץ|تشغيل
▶ Run|▶ הרץ|▶ تشغيل
◌ Running…|◌ מריץ…|◌ جارٍ التشغيل…
Run your code to see the result.|הריצו את הקוד כדי לראות את התוצאה.|شغّل الكود لترى النتيجة.
stdin (optional input for your program)|stdin (קלט אופציונלי לתוכנית)|stdin (مدخلات اختيارية لبرنامجك)
⧉ Copy|⧉ העתק|⧉ نسخ
⤓ Save|⤓ שמור|⤓ حفظ
💡 Explain|💡 הסבר|💡 اشرح
🛠 Auto-fix|🛠 תיקון אוטומטי|🛠 إصلاح تلقائي
Explain the code|הסבר את הקוד|اشرح الكود
Comments|הערות|تعليقات
Clear|נקה|مسح
Add|הוסף|إضافة
Copy|העתק|نسخ
Download|הורדה|تنزيل
⤓ Download|⤓ הורדה|⤓ تنزيل
‹ Chat|‹ לצ׳אט|‹ الدردشة
Copied to clipboard|הועתק ללוח|نُسخ إلى الحافظة
Storage is full — delete some chats|האחסון מלא — מחקו כמה צ׳אטים|التخزين ممتلئ — احذف بعض المحادثات
Up late|ער/ה מאוחר|سهران
Good morning|בוקר טוב|صباح الخير
Good afternoon|צהריים טובים|مساء الخير
Good evening|ערב טוב|مساء الخير
What shall we create?|מה ניצור היום?|ماذا سننشئ اليوم؟
You're using|אתם משתמשים ב-|أنت تستخدم
Images, live web search, presentations and files — all unlocked.|תמונות, חיפוש חי ברשת, מצגות וקבצים — הכול פתוח.|صور وبحث مباشر في الويب وعروض تقديمية وملفات — كلها متاحة.
Chat, analyze images and read files. Switch to Stark for images, web search and more.|צ׳אט, ניתוח תמונות וקריאת קבצים. עברו ל-Stark בשביל תמונות, חיפוש ברשת ועוד.|دردشة وتحليل الصور وقراءة الملفات. انتقل إلى Stark للصور والبحث في الويب والمزيد.
Explain quantum computing simply|הסבר לי מחשוב קוונטי בפשטות|اشرح لي الحوسبة الكمّية ببساطة
Like I'm 12, with an analogy|כאילו אני בן 12, עם משל|كأنني في الثانية عشرة، مع تشبيه
Poetry in Hebrew|שירה בעברית|شعر بالعبرية
Give me a 7-day plan to learn the basics of Python|תן לי תוכנית של 7 ימים ללמוד את יסודות Python|أعطني خطة 7 أيام لتعلّم أساسيات Python
Structured learning plan|תוכנית לימוד מסודרת|خطة تعلّم منظّمة
Upload an image and ask me about it|העלו תמונה ושאלו אותי עליה|ارفع صورة واسألني عنها
I can see images & read files|אני רואה תמונות וקורא קבצים|أستطيع رؤية الصور وقراءة الملفات
Build an interactive compound-interest calculator|בנה מחשבון ריבית דריבית אינטראקטיבי|ابنِ حاسبة فائدة مركّبة تفاعلية
Interactive widget right in the chat|וידג׳ט אינטראקטיבי בתוך הצ׳אט|أداة تفاعلية داخل الدردشة
Create an image of a neon green fox in a cyberpunk city at night|צור תמונה של שועל ירוק ניאון בעיר סייברפאנק בלילה|أنشئ صورة لثعلب أخضر نيون في مدينة سايبربانك ليلًا
Image creation|יצירת תמונות|إنشاء الصور
Search the web: what are the latest breakthroughs in fusion energy?|חפש ברשת: מהן פריצות הדרך האחרונות באנרגיית היתוך?|ابحث في الويب: ما أحدث الاختراقات في طاقة الاندماج؟
Live web search with sources|חיפוש חי ברשת עם מקורות|بحث مباشر في الويب مع المصادر
Make a PowerPoint presentation about the future of AI in education|הכן מצגת PowerPoint על עתיד הבינה המלאכותית בחינוך|أنشئ عرض PowerPoint عن مستقبل الذكاء الاصطناعي في التعليم
Downloadable .pptx|קובץ ‎.pptx‎ להורדה|ملف ‎.pptx‎ للتنزيل
Create a CSV file with the 15 largest countries by area|צור קובץ CSV עם 15 המדינות הגדולות בשטחן|أنشئ ملف CSV بأكبر 15 دولة مساحةً
File with download button|קובץ עם כפתור הורדה|ملف مع زر تنزيل
Build a mini snake game I can play right here|בנה משחק נחש קטן שאפשר לשחק כאן|ابنِ لعبة ثعبان صغيرة ألعبها هنا
You|אתם|أنت
Generated image|תמונה שנוצרה|صورة مُنشأة
Working|עובד|يعمل
Worked|עבד|عمل
Show what I'm doing|הצג מה אני עושה|اعرض ما أفعله
Show what I did|הצג מה עשיתי|اعرض ما فعلته
Toggle activity|הצג/הסתר פעילות|إظهار/إخفاء النشاط
Describe the image to create…|תארו את התמונה שתרצו ליצור…|صف الصورة التي تريد إنشاءها…
What should I search the web for?|מה לחפש ברשת?|ماذا أبحث في الويب؟
What is the presentation about?|על מה המצגת?|عمّ يدور العرض التقديمي؟
What file should I create?|איזה קובץ ליצור?|أي ملف أنشئ؟
Reading PDF…|קורא PDF…|جارٍ قراءة PDF…
Writing the answer|כותב את התשובה|أكتب الإجابة
Reasoning carefully|חושב בזהירות|أفكّر بعناية
Double-checked the answer|בדקתי שוב את התשובה|تحقّقت من الإجابة مرتين
Thinking pass 1/4 · planning the answer|סבב חשיבה 1/4 · מתכנן את התשובה|جولة تفكير 1/4 · أخطّط للإجابة
Thinking pass 3/4 · critiquing the draft|סבב חשיבה 3/4 · מבקר את הטיוטה|جولة تفكير 3/4 · أنقد المسودة
Planning searches|מתכנן חיפושים|أخطّط لعمليات البحث
Visiting|מבקר ב|أزور
Composing scene…|מחבר את הסצנה…|أرسم المشهد…
Rendering details…|מרנדר פרטים…|أرسم التفاصيل…
Image rendered|התמונה מוכנה|اكتملت الصورة
Almost there…|כמעט שם…|اقتربنا…
Designing the interactive widget|מעצב את הווידג׳ט האינטראקטיבי|أصمّم الأداة التفاعلية
Writing code|כותב קוד|أكتب الكود
Rendering the widget|מציג את הווידג׳ט|أعرض الأداة
Interactive|אינטראקטיבי|تفاعلي
Interactive widget|וידג׳ט אינטראקטיבי|أداة تفاعلية
Fullscreen|מסך מלא|ملء الشاشة
Open in new tab|פתח בכרטיסייה חדשה|افتح في علامة تبويب جديدة
Outlining the presentation|מתכנן את המצגת|أخطّط للعرض التقديمي
Could not design the slides, please try again.|לא הצלחתי לעצב את השקפים, נסו שוב.|تعذّر تصميم الشرائح، حاول مرة أخرى.
Loading presentation engine|טוען מנוע מצגות|أحمّل محرك العروض
Building the deck|בונה את המצגת|أبني العرض
Packaging .pptx file|אורז קובץ ‎.pptx‎|أجهّز ملف ‎.pptx‎
Planning the file|מתכנן את הקובץ|أخطّط للملف
Writing file contents|כותב את תוכן הקובץ|أكتب محتوى الملف
Thinking · Medium|חשיבה · בינונית|التفكير · متوسط
Thinking · High — careful reasoning|חשיבה · גבוהה — חשיבה זהירה|التفكير · عالٍ — تفكير دقيق
Thinking · Extra High — draft + self-review|חשיבה · גבוהה מאוד — טיוטה + ביקורת עצמית|التفكير · عالٍ جدًا — مسودة + مراجعة ذاتية
Thinking · Ultra — plan, draft, critique, perfect|חשיבה · אולטרה — תכנון, טיוטה, ביקורת, שלמות|التفكير · فائق — تخطيط، مسودة، نقد، إتقان
Looking at your image|מסתכל על התמונה שלך|أنظر إلى صورتك
Looking at your images|מסתכל על התמונות שלך|أنظر إلى صورك
Reading your file|קורא את הקובץ שלך|أقرأ ملفك
Reading your files|קורא את הקבצים שלך|أقرأ ملفاتك
Done|סיום|تم
Stopped.|נעצר.|توقّف.
(stopped)|(נעצר)|(توقّف)
Something went wrong — please try again.|משהו השתבש — נסו שוב.|حدث خطأ — حاول مرة أخرى.
Speech is not supported in this browser|הדפדפן לא תומך בהקראה|المتصفح لا يدعم النطق
Voice input is not supported in this browser — try Chrome|הדפדפן לא תומך בקלט קולי — נסו Chrome|المتصفح لا يدعم الإدخال الصوتي — جرّب Chrome
Speaking…|מדבר…|يتحدث…
Listening…|מקשיב…|أستمع…
Thinking…|חושב…|أفكّر…
Polished|מלוטש|مُحسَّن
Could not enhance right now|לא ניתן לשפר כרגע|تعذّر التحسين الآن
Fact-checking against sources|בודק עובדות מול המקורות|أتحقّق من الحقائق مقابل المصادر
Report ready|הדוח מוכן|التقرير جاهز
Research failed — try again|המחקר נכשל — נסו שוב|فشل البحث — حاول مرة أخرى
Applying your change|מיישם את השינוי|أطبّق التغيير
Planning layout & sections|מתכנן פריסה ואזורים|أخطّط للتخطيط والأقسام
Writing HTML, CSS & JavaScript|כותב HTML, ‏CSS ו-JavaScript|أكتب HTML وCSS وJavaScript
Rendering live preview|מציג תצוגה חיה|أعرض المعاينة المباشرة
Build failed — try again|הבנייה נכשלה — נסו שוב|فشل البناء — حاول مرة أخرى
Loading chart engine|טוען מנוע גרפים|أحمّل محرك الرسوم
Interpreting your data|מפענח את הנתונים|أفسّر بياناتك
Rendering chart|מצייר גרף|أرسم المخطط
Could not build the chart|לא הצלחתי לבנות את הגרף|تعذّر إنشاء المخطط
Language|שפה|اللغة
Appearance|מראה|المظهر
Performance|ביצועים|الأداء
Behavior|התנהגות|السلوك
LokiLessons|LokiLessons|LokiLessons
Personalization|התאמה אישית|التخصيص
Data|נתונים|البيانات
Interface language|שפת הממשק|لغة الواجهة
Menus, buttons and labels|תפריטים, כפתורים ותוויות|القوائم والأزرار والتسميات
Reply in my language|ענה בשפה שלי|الرد بلغتي
The assistant answers in the interface language by default|העוזר עונה כברירת מחדל בשפת הממשק|يجيب المساعد بلغة الواجهة افتراضيًا
Accent color|צבע הדגשה|لون التمييز
Glows, buttons and highlights|זוהר, כפתורים והדגשות|التوهج والأزرار والتمييز
Background animation|אנימציית רקע|حركة الخلفية
Living backdrop style|סגנון הרקע החי|نمط الخلفية الحية
Flow|זרימה|تدفّق
Matrix|מטריקס|ماتريكس
Network|רשת|شبكة
Off|כבוי|إيقاف
Animation intensity|עוצמת אנימציה|شدة الحركة
Particles & glow strength|חלקיקים ועוצמת זוהר|الجسيمات وقوة التوهج
Animation speed|מהירות אנימציה|سرعة الحركة
UI transitions|מעברים בממשק|انتقالات الواجهة
Slow|איטי|بطيء
Normal|רגיל|عادي
Fast|מהיר|سريع
Reduce motion|הפחתת תנועה|تقليل الحركة
Calmer UI, fewer animations|ממשק רגוע, פחות אנימציות|واجهة أهدأ وحركات أقل
Font|גופן|الخط
Font size|גודל גופן|حجم الخط
System|מערכת|النظام
Mono|מונו|أحادي
Bubble style|סגנון בועות|نمط الفقاعات
Glass|זכוכית|زجاجي
Solid|אטום|صلب
Minimal|מינימלי|بسيط
Compact mode|מצב קומפקטי|الوضع المضغوط
Tighter spacing, more on screen|מרווחים צפופים, יותר על המסך|مسافات أضيق ومحتوى أكثر
Chat width|רוחב הצ׳אט|عرض الدردشة
Narrow|צר|ضيق
Wide|רחב|عريض
Performance mode|מצב ביצועים|وضع الأداء
Lighter background, no blur or glow effects — best for older devices|רקע קל יותר, בלי טשטוש וזוהר — מושלם למכשירים ישנים|خلفية أخف دون ضبابية أو توهج — الأفضل للأجهزة القديمة
Live streaming text|טקסט בזמן אמת|نص مباشر
Show answers word-by-word as they arrive|הצגת התשובות מילה אחר מילה כשהן מגיעות|عرض الإجابات كلمة بكلمة فور وصولها
Send with Enter|שליחה ב-Enter|الإرسال بـ Enter
Shift+Enter for a new line|Shift+Enter לשורה חדשה|Shift+Enter لسطر جديد
Auto-scroll|גלילה אוטומטית|التمرير التلقائي
Follow new text while it streams|עקוב אחרי טקסט חדש בזמן הזרימה|تتبّع النص الجديد أثناء تدفقه
Sounds|צלילים|الأصوات
Subtle send & done chimes|צלילי שליחה וסיום עדינים|نغمات إرسال وإنهاء خفيفة
Default model|מודל ברירת מחדל|النموذج الافتراضي
Default thinking|חשיבה כברירת מחדל|التفكير الافتراضي
Read replies aloud|הקראת תשובות|قراءة الردود بصوت عالٍ
Auto text-to-speech|הקראה אוטומטית|تحويل النص إلى كلام تلقائيًا
Most natural voice is picked automatically|הקול הטבעי ביותר נבחר אוטומטית|يُختار الصوت الأكثر طبيعية تلقائيًا
Auto (best available)|אוטומטי (הטוב ביותר)|تلقائي (الأفضل المتاح)
Auto|אוטומטי|تلقائي
Voice speed|מהירות קול|سرعة الصوت
Voice pitch|גובה קול|طبقة الصوت
Speech recognition language|שפת זיהוי דיבור|لغة التعرف على الكلام
Live call: end-of-speech pause|שיחה חיה: הפסקה בסוף דיבור|المكالمة المباشرة: توقف نهاية الكلام
Live call captions|כתוביות בשיחה חיה|ترجمة المكالمة المباشرة
Show what you and the assistant say|הצג מה שאתם והעוזר אומרים|اعرض ما تقوله أنت والمساعد
Test voice|בדיקת קול|اختبار الصوت
🔊 Play sample|🔊 השמע דוגמה|🔊 تشغيل عيّنة
Default quiz difficulty|רמת קושי ברירת מחדל לבחנים|صعوبة الاختبار الافتراضية
Easy|קל|سهل
Hard|קשה|صعب
Questions per quiz|שאלות בכל בוחן|أسئلة لكل اختبار
Tutor language|שפת המורה|لغة المعلم
LokiLessons answers in this language|LokiLessons עונה בשפה הזו|يجيب LokiLessons بهذه اللغة
Your name|השם שלך|اسمك
So I can greet you|כדי שאוכל לברך אותך|لكي أحيّيك
About you|עליך|عنك
What should Lokizenith know about you?|מה Lokizenith צריך לדעת עליך?|ماذا يجب أن يعرف Lokizenith عنك؟
How should I respond?|איך לענות לך?|كيف أرد عليك؟
Tone, length, format|טון, אורך, פורמט|النبرة والطول والتنسيق
Export chats|ייצוא צ׳אטים|تصدير المحادثات
Download everything as JSON|הורדת הכול כ-JSON|تنزيل كل شيء بصيغة JSON
⤓ Export|⤓ ייצוא|⤓ تصدير
Reset settings|איפוס הגדרות|إعادة ضبط الإعدادات
Back to defaults, keeps chats|חזרה לברירת המחדל, הצ׳אטים נשמרים|العودة إلى الافتراضي مع الإبقاء على المحادثات
↺ Reset|↺ איפוס|↺ إعادة ضبط
Clear all data|מחיקת כל הנתונים|مسح كل البيانات
Deletes all chats & settings on this device|מוחק את כל הצ׳אטים וההגדרות במכשיר|يحذف كل المحادثات والإعدادات على هذا الجهاز
Clear everything|מחק הכול|امسح كل شيء
Keyboard shortcuts|קיצורי מקלדת|اختصارات لوحة المفاتيح
Focus message box|מיקוד בתיבת ההודעה|التركيز على مربع الرسالة
Toggle sidebar|הצג/הסתר סרגל צד|إظهار/إخفاء الشريط الجانبي
Switch model|החלפת מודל|تبديل النموذج
Cycle thinking level|החלפת רמת חשיבה|تبديل مستوى التفكير
Close dialogs|סגירת חלונות|إغلاق النوافذ
Settings reset|ההגדרות אופסו|أُعيد ضبط الإعدادات
Delete ALL chats and settings? This cannot be undone.|למחוק את כל הצ׳אטים וההגדרות? לא ניתן לבטל.|حذف كل المحادثات والإعدادات؟ لا يمكن التراجع.
Voice call is loading…|השיחה הקולית נטענת…|المكالمة الصوتية قيد التحميل…
Pro|פרו|برو
Upgraded|שודרג|تمت الترقية
· Default|· ברירת מחדל|· افتراضي
↻ Retry|↻ נסה שוב|↻ أعد المحاولة
⤢ View|⤢ הצג|⤢ عرض
You're on|אתם ב-|أنت على
. Upgrade to|. שדרגו ל-|. قم بالترقية إلى
to unlock it — plus smarter, faster answers.|כדי לפתוח את זה — וגם תשובות חכמות ומהירות יותר.|لفتحها — مع إجابات أذكى وأسرع.
Create images|יצירת תמונות|إنشاء الصور
Live web search|חיפוש חי ברשת|بحث مباشر في الويب
PowerPoint decks|מצגות PowerPoint|عروض PowerPoint
Files with download|קבצים להורדה|ملفات للتنزيل
Deep Research|מחקר מעמיק|بحث معمّق
Site Builder & Charts|בניית אתרים וגרפים|منشئ المواقع والمخططات
⚡ Switch to Stark|⚡ עברו ל-Stark|⚡ انتقل إلى Stark
Cancel|ביטול|إلغاء
Save & send|שמור ושלח|احفظ وأرسل
New|חדש|جديد
Tap the orb and start talking|הקישו על הכדור והתחילו לדבר|اضغط على الكرة وابدأ الكلام
Auto language|שפה אוטומטית|لغة تلقائية
Keep listening after replies|המשך להקשיב אחרי תשובות|واصل الاستماع بعد الردود
Write a rough idea. I'll rewrite it into a precise, detailed prompt that gets much better answers.|כתבו רעיון גולמי. אנסח אותו מחדש לפרומפט מדויק ומפורט שמקבל תשובות טובות בהרבה.|اكتب فكرة أولية. سأعيد صياغتها إلى طلب دقيق ومفصّل يحصل على إجابات أفضل بكثير.
✨ Enhance|✨ שפר|✨ حسّن
➜ Use in chat|➜ השתמש בצ׳אט|➜ استخدم في الدردشة
🔭 Research|🔭 חקור|🔭 ابحث
⤓ Download .md|⤓ הורד ‎.md‎|⤓ تنزيل ‎.md‎
➜ Send to chat|➜ שלח לצ׳אט|➜ أرسل إلى الدردشة
Describe a website. I'll build a complete, responsive page you can preview live and download.|תארו אתר. אבנה עמוד מלא ורספונסיבי שאפשר לצפות בו בזמן אמת ולהוריד.|صف موقعًا. سأبني صفحة كاملة متجاوبة يمكنك معاينتها مباشرة وتنزيلها.
Modern & bold|מודרני ונועז|عصري وجريء
Minimal & elegant|מינימלי ואלגנטי|بسيط وأنيق
Dark neon|ניאון כהה|نيون داكن
Playful & colorful|שובב וצבעוני|مرح وملوّن
Corporate|עסקי|مؤسسي
🏗 Build site|🏗 בנה אתר|🏗 ابنِ الموقع
↻ Refine|↻ שפר|↻ حسّن
⤓ Download .html|⤓ הורד ‎.html‎|⤓ تنزيل ‎.html‎
‹/› Open in LokiCode|‹/› פתח ב-LokiCode|‹/› افتح في LokiCode
Describe the chart you want, or paste CSV data. I'll design it and render it — download as PNG.|תארו את הגרף הרצוי או הדביקו נתוני CSV. אעצב ואצייר אותו — להורדה כ-PNG.|صف المخطط الذي تريده أو الصق بيانات CSV. سأصممه وأرسمه — للتنزيل بصيغة PNG.
Auto type|סוג אוטומטי|نوع تلقائي
Bar|עמודות|أعمدة
Line|קו|خطي
Pie|עוגה|دائري
Doughnut|טבעת|حلقي
Radar|רדאר|راداري
Polar area|קוטבי|قطبي
📈 Create chart|📈 צור גרף|📈 أنشئ مخططًا
⤓ Download PNG|⤓ הורד PNG|⤓ تنزيل PNG
Type and press Enter…|הקלידו ולחצו Enter…|اكتب واضغط Enter…
Site preview|תצוגת אתר|معاينة الموقع
Image creation|יצירת תמונות|إنشاء الصور
Web search|חיפוש ברשת|البحث في الويب
PowerPoint creation|יצירת מצגות|إنشاء العروض التقديمية
File creation & download|יצירת קבצים והורדה|إنشاء الملفات وتنزيلها
Document Q&A|שאלות על מסמך|أسئلة حول مستند
URL Summarizer|סיכום קישורים|ملخّص الروابط
Site Builder|בונה אתרים|منشئ المواقع
Chart Studio|סטודיו גרפים|استوديو المخططات
This feature|הפיצ׳ר הזה|هذه الميزة
Voice Mode|מצב קולי|الوضع الصوتي
Talk hands-free and hear replies aloud|דברו בלי ידיים ושמעו את התשובות|تحدّث دون استخدام اليدين واستمع للردود
Prompt Enhancer|משפר פרומפטים|محسّن الطلبات
Turn a rough idea into a pro prompt|הפכו רעיון גולמי לפרומפט מקצועי|حوّل فكرة أولية إلى طلب احترافي
Multi-source cited report + .md export|דוח עם מקורות מרובים + ייצוא ‎.md‎|تقرير موثّق من مصادر متعددة + تصدير ‎.md‎
Full web page, live preview, download|עמוד אינטרנט מלא, תצוגה חיה, הורדה|صفحة ويب كاملة، معاينة مباشرة، تنزيل
Describe or paste CSV → beautiful chart|תארו או הדביקו CSV ← גרף יפהפה|صف أو الصق CSV ← مخطط جميل
Math Solver|פותר מתמטיקה|حلّال الرياضيات
Step-by-step solutions, typeset math & graphs|פתרונות שלב אחר שלב, נוסחאות וגרפים|حلول خطوة بخطوة، صيغ رياضية ورسوم
Translator|מתרגם|المترجم
Side-by-side, tones, alternatives, 15 languages|זה לצד זה, טונים, חלופות, 15 שפות|جنبًا إلى جنب، نبرات، بدائل، 15 لغة
Mind Map|מפת חשיבה|خريطة ذهنية
Any topic → interactive radial mind map|כל נושא ← מפת חשיבה מעגלית אינטראקטיבית|أي موضوع ← خريطة ذهنية دائرية تفاعلية
Ask a PDF — answers with highlighted quotes|שאלו קובץ PDF — תשובות עם ציטוטים מודגשים|اسأل ملف PDF — إجابات مع اقتباسات مميّزة
Any link → TL;DR, key points & quotes|כל קישור ← תקציר, נקודות מפתח וציטוטים|أي رابط ← ملخص ونقاط رئيسية واقتباسات
Solve|פתור|حلّ
Loading math typesetting|טוען תצוגת נוסחאות|أحمّل عرض الصيغ
Solving step by step|פותר שלב אחר שלב|أحلّ خطوة بخطوة
Typesetting|מעצב נוסחאות|أنسّق الصيغ
Answer|תשובה|الإجابة
Could not solve that — try rephrasing|לא הצלחתי לפתור — נסו לנסח מחדש|تعذّر الحل — جرّب إعادة الصياغة
Type any math problem — equations, word problems, derivatives, geometry. You get a clear step-by-step solution, typeset math and a graph when it helps.|הקלידו כל בעיה מתמטית — משוואות, בעיות מילוליות, נגזרות, גאומטריה. תקבלו פתרון ברור שלב אחר שלב, נוסחאות מעוצבות וגרף כשזה עוזר.|اكتب أي مسألة رياضية — معادلات، مسائل كلامية، مشتقات، هندسة. ستحصل على حل واضح خطوة بخطوة وصيغ منسّقة ورسم بياني عند الحاجة.
e.g. Solve x² − 5x + 6 = 0 and draw the parabola|למשל: פתרו x² − 5x + 6 = 0 וציירו את הפרבולה|مثلًا: حلّ x² − 5x + 6 = 0 وارسم القطع المكافئ
Detect language|זיהוי שפה|اكتشاف اللغة
Swap|החלף|تبديل
Natural|טבעי|طبيعي
Formal|רשמי|رسمي
Casual|יומיומי|عامي
Literal|מילולי|حرفي
Type or paste text…|הקלידו או הדביקו טקסט…|اكتب أو الصق نصًا…
Translate|תרגם|ترجم
Translate as I type|תרגם תוך כדי הקלדה|ترجم أثناء الكتابة
Alternatives|חלופות|بدائل
Translation failed — try again|התרגום נכשל — נסו שוב|فشلت الترجمة — حاول مرة أخرى
Any topic → a beautiful radial mind map. Click a branch to expand it deeper. Export as SVG or PNG.|כל נושא ← מפת חשיבה מעגלית יפהפייה. לחצו על ענף כדי להעמיק. ייצוא כ-SVG או PNG.|أي موضوع ← خريطة ذهنية دائرية جميلة. انقر على فرع للتعمق. صدّر بصيغة SVG أو PNG.
e.g. The French Revolution, photosynthesis, starting a startup…|למשל: המהפכה הצרפתית, פוטוסינתזה, הקמת סטארט-אפ…|مثلًا: الثورة الفرنسية، التمثيل الضوئي، تأسيس شركة ناشئة…
Map it|מפה את זה|ارسم الخريطة
Mapping ideas|ממפה רעיונות|أرسم الأفكار
Could not build the mind map|לא הצלחתי לבנות את מפת החשיבה|تعذّر إنشاء الخريطة الذهنية
Upload PDF / TXT / MD|העלאת PDF / TXT / MD|رفع PDF / TXT / MD
…or paste the document text here|…או הדביקו כאן את טקסט המסמך|…أو الصق نص المستند هنا
Ask anything about your document. Answers quote the exact passages and highlight them in the text.|שאלו כל דבר על המסמך. התשובות מצטטות את הקטעים המדויקים ומדגישות אותם בטקסט.|اسأل أي شيء عن مستندك. تقتبس الإجابات المقاطع الدقيقة وتميّزها في النص.
Ask about the document…|שאלו על המסמך…|اسأل عن المستند…
Ask|שאל|اسأل
Add a document first|הוסיפו קודם מסמך|أضف مستندًا أولًا
Reading the document|קורא את המסמך|أقرأ المستند
Quotes could not be located verbatim in the text.|לא נמצאו הציטוטים מילה במילה בטקסט.|تعذّر العثور على الاقتباسات حرفيًا في النص.
Could not answer — try again|לא הצלחתי לענות — נסו שוב|تعذّرت الإجابة — حاول مرة أخرى
Could not read that file|לא הצלחתי לקרוא את הקובץ|تعذّرت قراءة الملف
Paste any article or page link — get a TL;DR, key points, notable quotes and reading time.|הדביקו קישור לכל כתבה או עמוד — קבלו תקציר, נקודות מפתח, ציטוטים וזמן קריאה.|الصق رابط أي مقال أو صفحة — احصل على ملخص ونقاط رئيسية واقتباسات ووقت القراءة.
Short|קצר|قصير
Detailed|מפורט|مفصّل
Summarize|סכם|لخّص
Reading|קורא|أقرأ
Summarizing|מסכם|ألخّص
words|מילים|كلمة
min read|דק׳ קריאה|دقيقة قراءة
Could not read that page (it may block readers or need a login).|לא ניתן לקרוא את העמוד (ייתכן שהוא חוסם קוראים או דורש התחברות).|تعذّرت قراءة الصفحة (قد تحظر القرّاء أو تتطلب تسجيل الدخول).
Continue in chat|המשך בצ׳אט|تابع في الدردشة
Could not summarize that page|לא הצלחתי לסכם את העמוד|تعذّر تلخيص الصفحة
Connecting…|מתחבר…|جارٍ الاتصال…
Call language|שפת השיחה|لغة المكالمة
Mute|השתק|كتم
End call|סיום שיחה|إنهاء المكالمة
Captions|כתוביות|الترجمة
Speaking — talk to interrupt|מדבר — דברו כדי לקטוע|يتحدث — تكلّم للمقاطعة
Muted|מושתק|مكتوم
Transcribing…|מתמלל…|أفرّغ النص…
Microphone access was blocked. Allow the microphone for this site and try again.|הגישה למיקרופון נחסמה. אפשרו מיקרופון לאתר ונסו שוב.|تم حظر الوصول إلى الميكروفون. اسمح بالميكروفون لهذا الموقع وحاول مجددًا.
Live voice calls need microphone recording and speech synthesis, which this browser does not support. Try the latest Chrome, Edge or Safari.|שיחות קוליות חיות דורשות הקלטת מיקרופון והקראה, והדפדפן הזה לא תומך בהן. נסו Chrome, ‏Edge או Safari עדכניים.|تحتاج المكالمات الصوتية المباشرة إلى تسجيل الميكروفون وتحويل النص إلى كلام، وهذا المتصفح لا يدعمها. جرّب أحدث Chrome أو Edge أو Safari.
Switched to browser speech recognition|עבר לזיהוי הדיבור של הדפדפן|تم التبديل إلى التعرف على الكلام في المتصفح
Speech recognition is not available in this browser|זיהוי דיבור לא זמין בדפדפן הזה|التعرف على الكلام غير متاح في هذا المتصفح
Voice call|שיחה קולית|مكالمة صوتية
Call saved to your chats|השיחה נשמרה בצ׳אטים|حُفظت المكالمة في محادثاتك
Ready to run|מוכן להרצה|جاهز للتشغيل
Generation failed — try again|היצירה נכשלה — נסו שוב|فشل الإنشاء — حاول مرة أخرى
Generate or paste some code first|צרו או הדביקו קוד קודם|أنشئ أو الصق بعض الكود أولًا
✓ Rendered in the preview below|✓ מוצג בתצוגה המקדימה למטה|✓ عُرض في المعاينة أدناه
Runner unavailable|מריץ הקוד לא זמין|المشغّل غير متاح
Error|שגיאה|خطأ
Simulated run|הרצה מדומה|تشغيل محاكى
Simulated|מדומה|محاكى
Reading the code|קורא את הקוד|أقرأ الكود
Could not explain right now.|לא ניתן להסביר כרגע.|تعذّر الشرح الآن.
Analyzing the error|מנתח את השגיאה|أحلّل الخطأ
Applied fix · re-running|התיקון הוחל · מריץ שוב|طُبّق الإصلاح · إعادة التشغيل
Auto-fix failed|התיקון האוטומטי נכשל|فشل الإصلاح التلقائي
Analyzing intent & missing details|מנתח כוונה ופרטים חסרים|أحلّل القصد والتفاصيل الناقصة
Hi! This is how I sound.|היי! ככה אני נשמע.|مرحبًا! هكذا يبدو صوتي.
About {n}s left|נותרו כ-{n} שניות|متبقٍ نحو {n} ث
About {t} left|נותרו כ-{t}|متبقٍ نحو {t}
Remove|הסר|إزالة
Clear mode|נקה מצב|مسح الوضع
Generating image|יוצר תמונה|أنشئ الصورة
Rendering image|מרנדר תמונה|أرسم الصورة
e.g. Elad|למשל: אלעד|مثلًا: إلعاد
Write a short poem about the ocean at sunset|כתוב לי שיר קצר על הים בשקיעה|اكتب قصيدة قصيرة عن البحر عند الغروب
Calling|שיחה קולית|مكالمة
Coding|מקודד|يبرمج
Dancing|רוקד|يرقص
Celebrating|חוגג|يحتفل
Juggling|מלהטט|يلعب الخفة
Salute|מצדיע|يؤدي التحية
Position|מיקום|الموقع
Reset Dock Position|אפס מיקום לעגינה|إعادة تعيين الموقع
Hold & drag Loki anywhere on screen, or reset to dock|החזק וגרור את לוקי לכל מקום במסך, או אפס לעגינה|اسحب لوكي إلى أي مكان على الشاشة أو أعده لمكانه
An animated buddy that reacts while Lokizenith works (Hold & drag Loki anywhere!)|חבר מונפש שמגיב בזמן שלוקיזנית עובד (אפשר להחזיק ולגרור אותו לכל מקום!)|رفيق متحرك يتفاعل أثناء عمل Lokizenith (اسحبه لأي مكان!)
Loki returned to the dock!|לוקי חזר לעמדת העגינה!|عاد لوكي إلى مكانه!
Download App|הורדת האפליקציה|تنزيل التطبيق
Windows · Android APK|Windows · APK לאנדרואיד|Windows · APK لأندرويد
Download Lokizenith AI|הורידו את Lokizenith AI|نزّل Lokizenith AI
Lokiz Studios|Lokiz Studios|Lokiz Studios
Independent apps|אפליקציות עצמאיות|تطبيقات مستقلة
Install a standalone Windows or Android app. Each app can be updated separately from the website. Sign in with the same Lokizenith account — a new user on mobile or PC appears in the website admin users list, and chats stay in sync.|התקינו אפליקציה עצמאית ל-Windows או לאנדרואיד. אפשר לעדכן כל אפליקציה בנפרד מהאתר. התחברו עם אותו חשבון Lokizenith — משתמש חדש במובייל או במחשב מופיע ברשימת המשתמשים של מנהל האתר, והשיחות נשארות מסונכרנות.|ثبّت تطبيق Windows أو Android مستقلًا. يمكن تحديث كل تطبيق بمعزل عن الموقع. سجّل الدخول بنفس حساب Lokizenith — يظهر المستخدم الجديد على الجوال أو الكمبيوتر في قائمة مستخدمي المشرف على الموقع، وتبقى المحادثات متزامنة.
App version|גרסת האפליקציה|إصدار التطبيق
Same accounts as|אותם חשבונות כמו|نفس الحسابات كما في
Auto-update check|בדיקת עדכון אוטומטית|فحص التحديث التلقائي
Windows|Windows|Windows
Android|Android|أندرويد
A native PC app with a system tray, a global hotkey, local file access, offline cache, notifications, and auto-update — abilities the website and the Android app do not have.|אפליקציית מחשב עם מגש מערכת, קיצור מקשים כללי, גישה לקבצים מקומיים, מטמון לא מקוון, התראות ועדכון אוטומטי — יכולות שאין באתר ובאפליקציית אנדרואיד.|تطبيق كمبيوتر أصلي مع شريط النظام ومفتاح اختصار عام والوصول إلى الملفات المحلية وذاكرة تخزين مؤقت دون اتصال وإشعارات وتحديث تلقائي — ميزات غير موجودة في الموقع وتطبيق أندرويد.
Download for Windows|הורדה ל-Windows|تنزيل لـ Windows
A signed release APK that opens Lokizenith AI as its own app. Use the same account as the website and the Windows app. Chats, settings, and LokiCode stay in sync.|קובץ APK חתום שפותח את Lokizenith AI כאפליקציה עצמאית. השתמשו באותו חשבון כמו באתר ובאפליקציית Windows. שיחות, הגדרות ו-LokiCode נשארים מסונכרנים.|ملف APK موقّع يفتح Lokizenith AI كتطبيق مستقل. استخدم نفس حساب الموقع وتطبيق Windows. تبقى المحادثات والإعدادات وLokiCode متزامنة.
Download for Android (APK)|הורדה לאנדרואיד (APK)|تنزيل لأندرويد (APK)
PC-only abilities|יכולות רק במחשב|ميزات خاصة بالكمبيوتر
Shared data across website, PC, and Android|נתונים משותפים בין האתר, המחשב ואנדרואיד|بيانات مشتركة بين الموقع والكمبيوتر وأندرويد
Both apps load your Lokizenith account through the same secure backend as the website. If you create an account in the Windows or Android app, it is added to the admin users list on the website, and the other app can sign in with it. Conversations, settings, usage, and LokiCode workspaces stay in sync because they live on the server — not only on one device.|שתי האפליקציות טוענות את חשבון Lokizenith שלכם דרך אותו שרת מאובטח כמו האתר. אם תיצרו חשבון באפליקציית Windows או אנדרואיד, הוא יתווסף לרשימת המשתמשים של מנהל האתר, ואפשר להתחבר אליו גם מהאפליקציה השנייה. שיחות, הגדרות, שימוש וסביבות LokiCode נשארים מסונכרנים כי הם נשמרים בשרת — לא רק במכשיר אחד.|يحمّل كلا التطبيقين حساب Lokizenith عبر نفس الخادم الآمن للموقع. إذا أنشأت حسابًا في تطبيق Windows أو أندرويد، يُضاف إلى قائمة مستخدمي المشرف على الموقع، ويمكن للتطبيق الآخر تسجيل الدخول به. تبقى المحادثات والإعدادات والاستخدام ومساحات LokiCode متزامنة لأنها محفوظة على الخادم — وليس على جهاز واحد فقط.
About “unknown app” and safety warnings|על אזהרות “אפליקציה לא מוכרת” ובטיחות|حول تحذيرات “تطبيق غير معروف” والسلامة
The installer is published by Lokiz Studios with a proper name, icon, and version info. It is not yet Authenticode-signed, so Windows SmartScreen may show “Windows protected your PC.” Click More info, then Run anyway. A paid Organization Validation (OV) code-signing certificate (typically $150–300/year from DigiCert, Sectigo or similar) or Azure Artifact Signing (formerly Trusted Signing, $9.99/month — currently for organizations in the US, Canada, EU and UK, and individuals in the US and Canada) lets Windows show the publisher name and lets reputation build across versions. EV certificates (about $400+/year) no longer skip SmartScreen on first download. Listing the app in the Microsoft Store is what removes the warning completely. A self-signed certificate does not help.|קובץ ההתקנה מפורסם על ידי Lokiz Studios עם שם, סמל ופרטי גרסה. הוא עדיין לא חתום ב-Authenticode, ולכן Windows SmartScreen עלול להציג “Windows protected your PC.” לחצו More info ואז Run anyway. תעודת OV בתשלום (בדרך כלל 150–300 דולר לשנה) או Azure Artifact Signing (9.99 דולר לחודש, כיום בעיקר לארה״ב/קנדה/האיחוד האירופי/בריטניה) מציגות את שם המפרסם ובונות מוניטין בין גרסאות. תעודת EV (כ-400+ דולר לשנה) כבר לא מדלגת על SmartScreen בהורדה הראשונה. פרסום ב-Microsoft Store הוא מה שמסיר את האזהרה לגמרי.|ينشر Lokiz Studios المُثبّت باسم ورمز ومعلومات إصدار صحيحة. لم يُوقَّع بعد بتوقيع Authenticode، لذلك قد يُظهر Windows SmartScreen “Windows protected your PC.” انقر More info ثم Run anyway. شهادة OV مدفوعة (عادة 150–300 دولار سنويًا) أو Azure Artifact Signing (9.99 دولار شهريًا، ومتاح حاليًا بشكل أساسي في الولايات المتحدة وكندا والاتحاد الأوروبي والمملكة المتحدة) تُظهر اسم الناشر وتبني السمعة عبر الإصدارات. شهادات EV (نحو 400+ دولار سنويًا) لم تعد تتجاوز SmartScreen عند أول تنزيل. النشر في Microsoft Store هو ما يزيل التحذير تمامًا.
Sideloaded APKs always show the system “install unknown apps” prompt unless the app is installed from Google Play. This APK is a signed release build with a stable Lokiz Studios key, current target Android API, and only the permissions the app needs. Play Protect warnings are reduced by that signing, and they go away after the $25 Play Console listing and Play Protect / Play Store review.|קבצי APK שמורידים ישירות תמיד מציגים את ההודעה “התקנת אפליקציות לא מוכרות”, אלא אם מתקינים מ-Google Play. ה-APK הזה הוא בניית הפצה חתומה עם מפתח קבוע של Lokiz Studios, API עדכני של אנדרואיד, ורק ההרשאות שהאפליקציה צריכה. אזהרות Play Protect מופחתות בזכות החתימה, והן נעלמות אחרי רישום ב-Play Console ב-25 דולר ובדיקת Play Protect / Play Store.|تُظهر ملفات APK الجانبية دائمًا تنبيه النظام “تثبيت التطبيقات غير المعروفة” ما لم يُثبَّت التطبيق من Google Play. هذا ملف APK إصداري موقّع بمفتاح ثابت من Lokiz Studios ويستهدف واجهة أندرويد الحالية ويطلب فقط الأذونات اللازمة. تقل تحذيرات Play Protect بفضل ذلك التوقيع، وتزول بعد التسجيل في Play Console مقابل 25 دولارًا ومراجعة Play Protect / Play Store.
You're using the|אתם משתמשים ב|أنت تستخدم
Windows app|אפליקציית Windows|تطبيق Windows
Android app|אפליקציית אנדרואיד|تطبيق أندرويد
The website and both apps share the same accounts, chats, and admin user list.|האתר ושתיהן האפליקציות חולקים את אותם חשבונות, שיחות ורשימת משתמשי מנהל.|يشترك الموقع وكلا التطبيقين في نفس الحسابات والمحادثات وقائمة مستخدمي المشرف.
Loading download details…|טוען את פרטי ההורדה…|جارٍ تحميل تفاصيل التنزيل…
The download catalog could not be loaded. Please try again in a moment.|לא ניתן היה לטעון את קטלוג ההורדות. נסו שוב בעוד רגע.|تعذّر تحميل قائمة التنزيلات. حاول مرة أخرى بعد لحظات.
Open local files (Windows app)|פתח קבצים מקומיים (אפליקציית Windows)|افتح ملفات محلية (تطبيق Windows)
A new Lokizenith AI app is available: v|גרסה חדשה של אפליקציית Lokizenith AI זמינה: v|يتوفر إصدار جديد من تطبيق Lokizenith AI: v
System tray with quick New Chat, Show/Hide, and Quit|מגש מערכת עם צ׳אט חדש, הצג/הסתר ויציאה|شريط النظام مع دردشة جديدة وإظهار/إخفاء وخروج
Global hotkey Ctrl+Shift+L to show or hide the window|קיצור מקשים Ctrl+Shift+L להצגה או הסתרה של החלון|اختصار Ctrl+Shift+L لإظهار النافذة أو إخفائها
Open local files from disk and attach them to chat|פתיחת קבצים מקומיים וצירוף שלהם לצ׳אט|فتح ملفات من القرص وإرفاقها بالدردشة
Offline cache so the last session can reopen without a connection|מטמון לא מקוון כדי לפתוח מחדש את הסשן האחרון בלי חיבור|ذاكرة مؤقتة دون اتصال لإعادة فتح آخر جلسة بدون اتصال
Native Windows notifications|התראות Windows מקוריות|إشعارات Windows أصلية
Automatic update check against lokizenith.com|בדיקת עדכונים אוטומטית מול lokizenith.com|فحص تحديث تلقائي عبر lokizenith.com
Windows 10 or later · 64-bit installer|Windows 10 ומעלה · קובץ התקנה 64 סיביות|Windows 10 أو أحدث · مثبّت 64 بت
Android 8.0 or later · signed APK|אנדרואיד 8.0 ומעלה · APK חתום|أندرويد 8.0 أو أحدث · APK موقّع
What's new · v2.7|מה חדש · v2.7|ما الجديد · v2.7
`;
const DICT = new Map();
RAW.trim().split('\n').forEach(l => { const p = l.split('|'); if (p.length === 3) DICT.set(p[0].trim(), {he: p[1].trim(), ar: p[2].trim()}); });

// dynamic strings
const PAT = [
  [/^Switched to (.+)$/, {he:'עברת ל-$1', ar:'تم التبديل إلى $1'}],
  [/^Thinking: (.+)$/, {he:'חשיבה: $1', ar:'التفكير: $1'}],
  [/^Downloaded (.+)$/, {he:'הורד: $1', ar:'تم التنزيل: $1'}],
  [/^No chats match “(.+)”$/, {he:'אין צ׳אטים שתואמים ל-“$1”', ar:'لا محادثات تطابق “$1”'}],
  [/^Delete “(.+)”\?$/, {he:'למחוק את “$1”?', ar:'حذف “$1”؟'}],
  [/^Rendering details… \((\d+)\/(\d+)\)$/, {he:'מרנדר פרטים… ($1/$2)', ar:'أرسم التفاصيل… ($1/$2)'}],
  [/^Reading (\d+) sources & writing a cited answer$/, {he:'קורא $1 מקורות וכותב תשובה עם הפניות', ar:'أقرأ $1 مصادر وأكتب إجابة موثّقة'}],
  [/^Mic: (.+)$/, {he:'מיקרופון: $1', ar:'الميكروفون: $1'}],
  [/^Failed: (.+)$/, {he:'נכשל: $1', ar:'فشل: $1'}],
  [/^Could not run the code: (.+)$/, {he:'לא ניתן להריץ את הקוד: $1', ar:'تعذّر تشغيل الكود: $1'}],
  [/^Writing code · (.+)$/, {he:'כותב קוד · $1', ar:'أكتب الكود · $1'}],
  [/^Visiting (.+)$/, {he:'מבקר ב-$1', ar:'أزور $1'}],
  [/^Reading (\S+\.\S+)$/, {he:'קורא את $1', ar:'أقرأ $1'}]
];
const SKIP = '.bubble,.md,code,pre,textarea,.lc-code,.lc-out,.history .t,[data-noi18n],iframe,.co-caps,.gi-prompt,.work-log .lx,.kbd-raw';
let lang = 'en', obs = null;
const orig = new WeakMap();      // text node → original english
const origAttr = new WeakMap();  // element → {attr: original}

function tr(s){
  if (lang === 'en' || s == null) return s;
  const k = String(s).trim(); if (!k) return s;
  const hit = DICT.get(k);
  if (hit) return String(s).replace(k, hit[lang]);
  for (const [re, rep] of PAT){ if (re.test(k)) return String(s).replace(k, k.replace(re, rep[lang])); }
  return s;
}
function t(s){ if (lang === 'en') return s; const h = DICT.get(s); return h ? h[lang] : tr(s); }
function skip(n){ const e = n.nodeType === 1 ? n : n.parentElement; return !e || !!e.closest(SKIP) || e.tagName === 'SCRIPT' || e.tagName === 'STYLE'; }
function doText(n){
  if (skip(n)) return;
  const cur = n.nodeValue; const o = orig.get(n);
  if (!cur || (!o && !/[A-Za-z]/.test(cur))) return;
  // the node was changed by the app to new English text → treat as new original
  const base = (o && (o.tr === cur)) ? o.en : cur;
  const out = lang === 'en' ? base : tr(base);
  if (out !== cur){ orig.set(n, {en: base, tr: out}); n.nodeValue = out; }
  else if (!o || o.tr !== cur) orig.set(n, {en: base, tr: cur});
}
const ATTRS = ['placeholder', 'title', 'aria-label'];
function doAttrs(e){
  if (e.closest(SKIP) && !e.matches('textarea,input')) return;
  let o = origAttr.get(e);
  for (const a of ATTRS){
    if (!e.hasAttribute(a)) continue;
    const cur = e.getAttribute(a); o = o || {};
    const rec = o[a];
    const base = rec && rec.tr === cur ? rec.en : cur;
    const out = lang === 'en' ? base : tr(base);
    o[a] = {en: base, tr: out};
    if (out !== cur) e.setAttribute(a, out);
  }
  if (o) origAttr.set(e, o);
}
function walk(root){
  if (root.nodeType === 3) return doText(root);
  if (root.nodeType !== 1 || skip(root) && !root.matches('textarea,input')) { if (root.nodeType === 1 && root.matches && root.matches('textarea,input')) doAttrs(root); return; }
  doAttrs(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {acceptNode: n => n.nodeType === 1 ? (n.matches(SKIP) && !n.matches('textarea,input') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) : NodeFilter.FILTER_ACCEPT});
  let n; while ((n = w.nextNode())){ if (n.nodeType === 3) doText(n); else doAttrs(n); }
}
let queue = new Set(), sched = 0;
function flush(){ sched = 0; obs && obs.disconnect(); queue.forEach(n => n.isConnected && walk(n)); queue.clear(); if (lang !== 'en') observe(); }
function observe(){
  if (!obs) obs = new MutationObserver(ms => {
    for (const m of ms){
      if (m.type === 'childList') m.addedNodes.forEach(n => queue.add(n));
      else if (m.type === 'characterData') queue.add(m.target);
      else if (m.type === 'attributes') queue.add(m.target);
    }
    if (!sched) sched = requestAnimationFrame(flush);
  });
  obs.observe(document.body, {childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS});
}
function setLang(l){
  l = ['en', 'he', 'ar'].includes(l) ? l : 'en';
  const changed = l !== lang; lang = l;
  const html = document.documentElement;
  html.lang = l; html.dir = l === 'en' ? 'ltr' : 'rtl';
  document.body && document.body.classList.toggle('rtl', l !== 'en');
  if (!document.body) return;
  if (changed || l !== 'en'){ obs && obs.disconnect(); walk(document.body); }
  if (l === 'en'){ obs && obs.disconnect(); } else observe();
}
window.I18N = {t, tr, setLang, get lang(){ return lang; }, DICT};
})();
