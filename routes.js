import { createServer } from "http";
import { storage } from "./storage.js";
import { api } from "./shared/routes.js";
import { z } from "zod";
import Groq from "groq-sdk";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const ADMIN_EMAIL = "admin@doctorplant.yo";
const ADMIN_PASSWORD = "Admin@123#";


const MUQAWIL_PRODUCTS = `
**منتجات شركة المقاولون المتاحة فقط:**

**للأسمدة والعناصر الغذائية:**
- حديد مخلبي (Fe-EDTA 13%) - لنقص الحديد والكلوروز
- يوريا فوسفات (Urea Phosphate) - لنقص النيتروجين والفوسفور
- سلفات المغنيسيوم (Magnesium Sulfate) - لنقص المغنيسيوم
- سلفات الزنك (Zinc Sulfate) - لنقص الزنك
- سماد NPK متوازن (20-20-20) - للتغذية الشاملة

**للآفات الحشرية:**
- أكتيليك (Pirimiphos-methyl 50% EC) - للمن، الذبابة البيضاء، التربس
- مارشال (Carbosulfan 25% EC) - للحشرات الماصة والقارضة
- سوميثيون (Fenitrothion 50% EC) - للمن والجراد والذباب

**للأمراض الفطرية والبكتيرية:**
- دياثين (Mancozeb 80% WP) - للبياض الزغبي واللفحات
- توبسين إم (Thiophanate-methyl 70% WP) - للأمراض الفطرية العامة
- كوبرافيت (Copper oxychloride 50% WP) - للأمراض البكتيرية والفطرية

**تحذير حاسم:** لا تذكر أي منتجات خارج هذه القائمة نهائياً. إذا لم يكن هناك منتج مناسب، اكتب: "لا يوجد منتج مناسب من شركة المقاولون حالياً"
`;

const DEFAULT_PROMPT = `أنت دكتور متخصص في أمراض النبات وتغذيتها بخبرة 15 سنة في التشخيص الدقيق. حلل الصورة المرفقة باحترافية وقدم تشخيصاً علمياً شاملاً.

${MUQAWIL_PRODUCTS}

**ترتيب الأولويات في التشخيص (من الأهم للأقل):**
1. **نقص العناصر الغذائية** (نيتروجين، حديد، مغنيسيوم، زنك، فوسفور، إلخ) - افحص هذا أولاً
2. الآفات الحشرية (من، ذبابة بيضاء، عنكبوت أحمر، تربس، إلخ)
3. الأمراض الفطرية والبكتيرية
4. الأمراض الفيروسية (نادراً جداً)
5. مشاكل بيئية (حروق شمس، صقيع، ري خاطئ)

**منهجية التشخيص:**
- ابدأ بفحص لون الأوراق وتوزيع الاصفرار (هل على الأوراق القديمة أم الحديثة؟)
- لاحظ شكل العروق (هل خضراء والورقة صفراء؟ → نقص حديد/مغنيسيوم)
- تحقق من وجود حشرات أو آثارها قبل افتراض مرض
- استبعد الأسباب الشائعة (نقص تغذية) قبل التشخيصات المعقدة

**قواعد صارمة:**
1. إذا كانت الصورة غير واضحة أو لا تحتوي على نبات، اكتب في diseaseName: "لا يمكن التشخيص - صورة غير صالحة"
2. إذا كان النبات سليماً 100%، اكتب في diseaseName: "النبات سليم وبحالة ممتازة"
3. نسبة الثقة بناءً على: وضوح الأعراض + جودة الصورة + تطابق علمي دقيق
4. **العلاج العضوي أولوية قصوى** - اذكره بالتفصيل دائماً
5. العلاج الكيميائي:
   - استخدم **حصرياً** المنتجات من قائمة المقاولون أعلاه
   - **ممنوع منعاً باتاً** اختلاق أسماء منتجات
   - الصيغة الدقيقة: "اسم المنتج (المادة الفعالة) - المعدل بالتفصيل + طريقة الاستخدام + التوقيت"
   - إذا لم يوجد منتج مطابق تماماً، اكتب: "لا يوجد منتج مناسب من شركة المقاولون حالياً"

**صيغة الإخراج:**
أجب بـ JSON فقط، بدون أي كلمة قبله أو بعده، بدون markdown backticks، بدون مقدمات.

{
  "diseaseName": "اسم المشكلة بالعربية بدقة",
  "confidence": 85.0,
  "symptoms": "وصف علمي دقيق للأعراض المرئية مع ذكر التوزيع والشدة",
  "causes": "السبب العلمي المحدد (نقص عنصر معين بالاسم / نوع الآفة / اسم الفطر أو البكتيريا)",
  "treatmentOrganic": "خطة علاج عضوي تفصيلية: المواد + الجرعات + التوقيت + المدة",
  "treatmentChemical": "اسم المنتج من المقاولون (المادة الفعالة) - المعدل الدقيق + طريقة التطبيق + عدد مرات التكرار"
}

**مثال 1 - نقص عنصر (الأولوية):**
{
  "diseaseName": "نقص الحديد الحاد (Iron Chlorosis)",
  "confidence": 93.5,
  "symptoms": "اصفرار شديد في الأوراق الحديثة مع بقاء العروق خضراء بوضوح، تقزم طفيف في النمو الحديث",
  "causes": "نقص عنصر الحديد الناتج عن قلوية التربة العالية (pH > 7.5) أو سوء الامتصاص",
  "treatmentOrganic": "إضافة كومبوست حمضي بمعدل 2 كجم/م² حول النبات، خفض pH التربة بإضافة كبريت زراعي (50 جم/م²)، رش أوراق بمحلول خل التفاح المخفف (2 ملعقة/لتر) أسبوعياً لمدة 3 أسابيع",
  "treatmentChemical": "حديد مخلبي (Fe-EDTA 13%) - 2 جم/لتر ماء رشاً ورقياً كل 5-7 أيام لمدة 3 أسابيع، أو 4 جم/لتر تسميداً أرضياً مرة واحدة شهرياً"
}

**مثال 2 - آفة حشرية:**
{
  "diseaseName": "إصابة متوسطة بحشرات المن",
  "confidence": 91.0,
  "symptoms": "تجمعات من حشرات صغيرة خضراء فاتحة على البراعم والأوراق الحديثة، التواء خفيف في قمم الأوراق، وجود إفرازات عسلية لامعة",
  "causes": "هجوم حشرات المن (Aphids) نتيجة الطقس الدافئ الجاف وضعف مناعة النبات",
  "treatmentOrganic": "رش فوري بمحلول صابون قشتالي (1 ملعقة كبيرة/لتر ماء) + 5 مل زيت نيم يومياً لمدة 3 أيام، ثم مرتين أسبوعياً، إزالة الأجزاء شديدة الإصابة، تشجيع الدعسوقة والزنابير الطفيلية",
  "treatmentChemical": "أكتيليك (Pirimiphos-methyl 50% EC) - 1.5 مل/لتر ماء رشاً شاملاً على كامل النبات في الصباح الباكر، يُكرر بعد 7-10 أيام إذا استمرت الإصابة"
}
`;

function getGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY غير مضبوط. أضفه في تبويب Secrets.");
  }
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

async function getPrompt() {
  return await storage.getAdminSetting("ai_prompt") || DEFAULT_PROMPT;
}

async function parseGroqResponse(text) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in response");
  const raw = JSON.parse(jsonMatch[0]);
  
  const joinIfArray = (val) => Array.isArray(val) ? val.join("\n") : String(val || "");

  const mapped = {
    diseaseName: String(raw.diseaseName || "غير معروف"),
    confidence: typeof raw.confidence === "number" ? raw.confidence : parseFloat(raw.confidence) || 0,
    symptoms: joinIfArray(raw.symptoms),
    causes: joinIfArray(raw.causes),
    treatmentOrganic: joinIfArray(raw.treatmentOrganic),
    treatmentChemical: joinIfArray(raw.treatmentChemical),
    recommendations: joinIfArray(raw.recommendations || `${raw.treatmentOrganic || ""}\n\n${raw.treatmentChemical || ""}`),
  };
  return api.scan.analyze.responses[200].parse(mapped);
}

function requireSession(req, res) {
  if (!req.session?.userId) {
    res.status(401).json({ message: "يجب تسجيل الدخول أولاً" });
    return false;
  }
  return true;
}

function requireAdmin(req, res) {
  if (!req.session?.isAdmin) {
    res.status(403).json({ message: "غير مصرح" });
    return false;
  }
  return true;
}

export async function registerRoutes(httpServer, app) {

  // ─── Auth ───────────────────────────────────────────────────────────────────
  app.post(api.auth.register.path, async (req, res) => {
    try {
      const input = api.auth.register.input.parse(req.body);
      if (input.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        return res.status(400).json({ message: "هذا الإيميل غير مسموح به" });
      }
      const existing = await storage.getUserByEmail(input.email);
      if (existing) return res.status(409).json({ message: "الإيميل مسجل مسبقاً" });
      const hashed = await bcrypt.hash(input.password, 10);
      const user = await storage.createUser(input.email, hashed);
      req.session.userId = user.id;
      req.session.isAdmin = false;
      res.json({ user: { id: user.id, email: user.email } });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0]?.message });
      res.status(500).json({ message: "فشل في إنشاء الحساب" });
    }
  });

  app.post(api.auth.login.path, async (req, res) => {
    try {
      const input = api.auth.login.input.parse(req.body);
      if (input.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        if (input.password !== ADMIN_PASSWORD) {
          return res.status(401).json({ message: "بيانات الدخول غير صحيحة" });
        }
        req.session.userId = 0;
        req.session.isAdmin = true;
        return res.json({ user: { id: 0, email: ADMIN_EMAIL, isAdmin: true } });
      }
      const user = await storage.getUserByEmail(input.email);
      if (!user) return res.status(401).json({ message: "الإيميل أو كلمة المرور غير صحيحة" });
      const match = await bcrypt.compare(input.password, user.password);
      if (!match) return res.status(401).json({ message: "الإيميل أو كلمة المرور غير صحيحة" });
      req.session.userId = user.id;
      req.session.isAdmin = false;
      res.json({ user: { id: user.id, email: user.email, isAdmin: false } });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0]?.message });
      res.status(500).json({ message: "فشل تسجيل الدخول" });
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
  });

  app.get(api.auth.me.path, async (req, res) => {
    if (!req.session?.userId && !req.session?.isAdmin) {
      return res.status(401).json({ message: "غير مسجل دخول" });
    }
    if (req.session.isAdmin) {
      return res.json({ user: { id: 0, email: ADMIN_EMAIL, isAdmin: true } });
    }
    const user = await storage.getUserById(req.session.userId);
    if (!user) return res.status(401).json({ message: "الجلسة منتهية" });
    res.json({ user: { id: user.id, email: user.email, isAdmin: false } });
  });

  // ─── Scan (image) ────────────────────────────────────────────────────────────
  app.post(api.scan.analyze.path, async (req, res) => {
    try {
      const input = api.scan.analyze.input.parse(req.body);
      const imageData = input.imageBase64.startsWith("data:")
        ? input.imageBase64
        : `data:image/jpeg;base64,${input.imageBase64}`;

      // Check Cache
      const hash = crypto.createHash("md5").update(input.imageBase64).digest("hex");
      const cached = await storage.getCache(hash);
      if (cached) {
        console.log("Serving from cache (image)");
        return res.status(200).json(cached);
      }

      const groq = getGroqClient();
      const prompt = await getPrompt();
      const response = await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{ role: "user", content: [
          { type: "image_url", image_url: { url: imageData } },
          { type: "text", text: prompt },
        ]}],
        max_tokens: 1024,
        temperature: 0, // Ensure determinism
      });
      const scanResponse = await parseGroqResponse(response.choices[0]?.message?.content || "");

      const elemRecs = await storage.getElementRecommendations();
      const diag = scanResponse.diseaseName.toLowerCase();
      const matchKey = Object.keys(elemRecs).find(k => diag.includes(k.toLowerCase()));
      if (matchKey) {
        scanResponse.recommendations = elemRecs[matchKey];
      }

      // Save to Cache
      await storage.setCache(hash, scanResponse);

      res.status(200).json(scanResponse);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0]?.message });
      console.error("Scan error details:", err);
      res.status(500).json({ message: `فشل تحليل الصورة: ${err.message}` });
    }
  });

  // ─── Scan (text) ──────────────────────────────────────────────────────────────
  app.post(api.scan.analyzeText.path, async (req, res) => {
    try {
      const input = api.scan.analyzeText.input.parse(req.body);

      // Check Cache
      const hash = crypto.createHash("md5").update(input.text).digest("hex");
      const cached = await storage.getCache(hash);
      if (cached) {
        console.log("Serving from cache (text)");
        return res.status(200).json(cached);
      }

      const groq = getGroqClient();
      const prompt = await getPrompt();
      const response = await groq.chat.completions.create({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        messages: [{ role: "user", content: `${prompt}\n\nوصف المشكلة من المستخدم:\n${input.text}` }],
        max_tokens: 1024,
        temperature: 0, // Ensure determinism
      });
      const scanResponse = await parseGroqResponse(response.choices[0]?.message?.content || "");

      const elemRecs = await storage.getElementRecommendations();
      const diag = scanResponse.diseaseName.toLowerCase();
      const matchKey = Object.keys(elemRecs).find(k => diag.includes(k.toLowerCase()));
      if (matchKey) {
        scanResponse.recommendations = elemRecs[matchKey];
      }

      // Save to Cache
      await storage.setCache(hash, scanResponse);

      res.status(200).json(scanResponse);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0]?.message });
      console.error("Text scan error details:", err);
      res.status(500).json({ message: `فشل تحليل الوصف النصي: ${err.message}` });
    }
  });

  // ─── Scan History ─────────────────────────────────────────────────────────────
  app.get(api.history.list.path, async (req, res) => {
    if (!requireSession(req, res)) return;
    const history = await storage.getUserHistory(req.session.userId);
    res.json(history);
  });

  app.post(api.history.save.path, async (req, res) => {
    if (!requireSession(req, res)) return;
    try {
      const input = api.history.save.input.parse(req.body);
      const result = await storage.saveScanHistory(req.session.userId, input);
      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0]?.message });
      res.status(500).json({ message: "فشل حفظ السجل" });
    }
  });

  // ─── Admin ────────────────────────────────────────────────────────────────────
  app.get(api.admin.getPrompt.path, async (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json({ prompt: await storage.getAdminSetting("ai_prompt") || DEFAULT_PROMPT });
  });

  app.put(api.admin.updatePrompt.path, async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const input = api.admin.updatePrompt.input.parse(req.body);
      await storage.setAdminSetting("ai_prompt", input.prompt);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0]?.message });
      res.status(500).json({ message: "فشل تحديث البرومبت" });
    }
  });

  app.get(api.admin.getRecommendations.path, async (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json(await storage.getElementRecommendations());
  });

  app.put(api.admin.updateRecommendations.path, async (req, res) => {
    if (!requireAdmin(req, res)) return;
    try {
      const input = api.admin.updateRecommendations.input.parse(req.body);
      await storage.setElementRecommendations(input.recommendations);
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0]?.message });
      res.status(500).json({ message: "فشل تحديث التوصيات" });
    }
  });

  return httpServer;
}
