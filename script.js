// ==========================================
// إعدادات fhmha-ai
// ==========================================
// 1. ضع مفتاح Gemini API الخاص بك هنا
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";

// 2. (اختياري) ضع Google OAuth Client ID الخاص بك لتسجيل الدخول الحقيقي من Google Cloud Console
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

const SYSTEM_PROMPT = `
أنت مساعد ذكي ودود، دقيق، وسهل الشرح، ومهمتك مساعدة المستخدم في الإجابة عن أي سؤال يطرحه؛ سواء كان مسألة دراسية أو سؤالًا عامًا في أي مجال في الحياة.

اتبع الخطوات التالية بدقة مع كل سؤال يصلك:
1. فكر للحظة في السؤال بهدوء لتحديد جوهر المطلوب، وأدق طريقة لشرحه بوضوح وبساطة دون تعقيد.
2. قدّم الحل أو الشرح بشكل مرتب ومنظم (استخدم النقاط أو الخطوات المتسلسلة إذا كان ذلك أوضح، مع إبراز الأفكار المهمة).
3. اجعل أسلوبك واضحًا ومباشرًا ومناسبًا لمستوى السؤال، وإذا كان السؤال مسألة أو يحتاج إلى خطوات، وضّح كيف وصلت للنتيجة وليس النتيجة فقط.
4. في نهاية كل رد تمامًا، اختم بهذه العبارة أو ما يعادلها بوضوح: "هل فهمت ولا أعيدها تاني؟"

ابدأ فورًا بتطبيق هذه القواعد على أي سؤال يرسله المستخدم.
`;

// عناصر الصفحة
const welcomeHero = document.getElementById("welcome-hero");
const messagesList = document.getElementById("messages-list");
const chatContainer = document.getElementById("chat-container");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

const headerGoogleBtn = document.getElementById("header-google-btn");
const userProfile = document.getElementById("user-profile");
const userAvatar = document.getElementById("user-avatar");
const userName = document.getElementById("user-name");
const logoutBtn = document.getElementById("logout-btn");

const authModal = document.getElementById("google-auth-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const pendingQuestionText = document.getElementById("pending-question-text");
const demoGoogleLoginBtn = document.getElementById("demo-google-login-btn");

let currentUser = JSON.parse(localStorage.getItem("fhmha_google_user") || "null");
let pendingQuestion = "";
let isBusy = false;

// فك تشفير JWT الخاص بـ Google Sign-In
function decodeJwt(token) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join("")
  );
  return JSON.parse(jsonPayload);
}

function handleGoogleCredentialResponse(response) {
  try {
    const profile = decodeJwt(response.credential);
    completeSignIn({
      name: profile.name || "مستخدم Google",
      email: profile.email || "",
      picture: profile.picture || createDefaultAvatar(profile.name || "G")
    });
  } catch (err) {
    console.error("خطأ في قراءة بيانات Google:", err);
  }
}

function createDefaultAvatar(label) {
  const initial = encodeURIComponent((label || "G").trim().charAt(0).toUpperCase());
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='100%' height='100%' fill='%234c8dff'/><text x='50%' y='54%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='28' font-family='Cairo,sans-serif'>${initial}</text></svg>`;
}

function renderAuthUI() {
  if (currentUser) {
    headerGoogleBtn.classList.add("hidden");
    userProfile.classList.remove("hidden");
    userName.textContent = currentUser.name;
    userAvatar.src = currentUser.picture || createDefaultAvatar(currentUser.name);
  } else {
    headerGoogleBtn.classList.remove("hidden");
    userProfile.classList.add("hidden");
  }
}

function openAuthModal(question = "") {
  pendingQuestion = question;
  pendingQuestionText.textContent = question || "سؤال جديد في fhmha-ai";
  authModal.classList.remove("hidden");
}

function closeAuthModal() {
  authModal.classList.add("hidden");
}

async function completeSignIn(userObj) {
  currentUser = userObj;
  localStorage.setItem("fhmha_google_user", JSON.stringify(currentUser));
  renderAuthUI();
  closeAuthModal();

  if (pendingQuestion) {
    const q = pendingQuestion;
    pendingQuestion = "";
    userInput.value = "";
    autoResizeTextarea();
    await processQuestion(q);
  }
}

// تهيئة Google Identity Services إذا كان Client ID مضبوطًا
window.addEventListener("load", () => {
  renderAuthUI();

  if (
    window.google &&
    window.google.accounts &&
    GOOGLE_CLIENT_ID &&
    !GOOGLE_CLIENT_ID.startsWith("YOUR_GOOGLE_CLIENT_ID")
  ) {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredentialResponse
    });

    google.accounts.id.renderButton(document.getElementById("gsi-button-container"), {
      theme: "filled_blue",
      size: "large",
      text: "signin_with",
      shape: "pill",
      locale: "ar",
      width: 300
    });
  } else {
    document.getElementById("gsi-button-container").style.display = "none";
  }
});

headerGoogleBtn.addEventListener("click", () => {
  openAuthModal(userInput.value.trim());
});

closeModalBtn.addEventListener("click", () => {
  closeAuthModal();
});

authModal.addEventListener("click", (e) => {
  if (e.target === authModal) {
    closeAuthModal();
  }
});

demoGoogleLoginBtn.addEventListener("click", () => {
  completeSignIn({
    name: "حساب Google",
    email: "student@gmail.com",
    picture: createDefaultAvatar("G")
  });
});

logoutBtn.addEventListener("click", () => {
  currentUser = null;
  localStorage.removeItem("fhmha_google_user");
  renderAuthUI();
});

// اقتراحات الأسئلة الجاهزة
document.querySelectorAll(".suggestion-card").forEach((card) => {
  card.addEventListener("click", () => {
    const promptText = card.getAttribute("data-prompt") || "";
    userInput.value = promptText;
    autoResizeTextarea();
    handleQuestionSubmit(promptText);
  });
});

function autoResizeTextarea() {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 150) + "px";
}

userInput.addEventListener("input", autoResizeTextarea);

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm.requestSubmit();
  }
});

function appendMessageRow(text, sender = "bot", isThinking = false) {
  welcomeHero.classList.add("hidden");

  const row = document.createElement("div");
  row.className = `message-row ${sender}`;

  const avatar = document.createElement("div");
  avatar.className = `avatar-circle ${sender}`;
  avatar.textContent = sender === "bot" ? "✦" : (currentUser?.name?.[0] || "أ");

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if (isThinking) {
    bubble.innerHTML = `
      <span class="thinking-bubble">
        <span>أفكر ثانية في سؤالك...</span>
        <span class="dots"><span></span><span></span><span></span></span>
      </span>
    `;
  } else {
    bubble.textContent = text;
  }

  row.appendChild(avatar);
  row.appendChild(bubble);
  messagesList.appendChild(row);
  chatContainer.scrollTop = chatContainer.scrollHeight;
  return row;
}

function waitOneSecond() {
  return new Promise((resolve) => setTimeout(resolve, 1000));
}

async function fetchGeminiAnswer(question) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY") {
    return `إليك شرحًا مبسطًا لسؤالك: "${question}"

• أولاً: نحدد الفكرة الأساسية في السؤال ونرتب خطواتها بوضوح.
• ثانيًا: نربط الفكرة بمثال عملي يسهل استيعابه بسرعة.

ملاحظة: أضف مفتاح GEMINI_API_KEY داخل ملف script.js للحصول على إجابات حية ومباشرة من Gemini.

هل فهمت ولا أعيدها تاني؟`;
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: question }]
        }
      ]
    })
  });

  if (!res.ok) {
    throw new Error("فشل الاتصال بواجهة Gemini");
  }

  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

async function processQuestion(question) {
  if (isBusy) return;
  isBusy = true;
  sendBtn.disabled = true;
  userInput.disabled = true;

  appendMessageRow(question, "user", false);
  const thinkingRow = appendMessageRow("", "bot", true);

  try {
    const [reply] = await Promise.all([
      fetchGeminiAnswer(question),
      waitOneSecond()
    ]);

    thinkingRow.remove();
    appendMessageRow(reply, "bot", false);
  } catch (err) {
    thinkingRow.remove();
    appendMessageRow(
      "حصلت مشكلة أثناء تجهيز الشرح الآن، تأكد من مفتاح API أو الاتصال بالإنترنت.

هل فهمت ولا أعيدها تاني؟",
      "bot",
      false
    );
  } finally {
    isBusy = false;
    sendBtn.disabled = false;
    userInput.disabled = false;
    userInput.focus();
  }
}

function handleQuestionSubmit(question) {
  const trimmed = (question || "").trim();
  if (!trimmed || isBusy) return;

  // عند كتابة سؤال: إذا لم يسجل المستخدم دخوله بحساب جوجل، تظهر نافذة تسجيل الدخول أولاً
  if (!currentUser) {
    openAuthModal(trimmed);
    return;
  }

  userInput.value = "";
  autoResizeTextarea();
  processQuestion(trimmed);
}

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  handleQuestionSubmit(userInput.value);
});
