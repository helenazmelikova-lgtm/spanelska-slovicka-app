return (
  <div className="container">import React, { useEffect, useMemo, useRef, useState } from "react";

const vocabulary = {
  restaurace: [
    { word: "la mesa", translation: "stůl", sentence: "Tenemos una mesa reservada para dos personas." },
    { word: "el menú", translation: "jídelní lístek", sentence: "¿Puede traerme el menú, por favor?" },
    { word: "la cuenta", translation: "účet", sentence: "La cuenta, por favor." },
    { word: "el camarero", translation: "číšník", sentence: "El camarero recomienda la paella." },
    { word: "la bebida", translation: "nápoj", sentence: "Quiero una bebida fría." },
    { word: "el postre", translation: "dezert", sentence: "De postre quiero flan." },
    { word: "pedir", translation: "objednat si", sentence: "Voy a pedir pescado." },
    { word: "rico", translation: "chutný", sentence: "La comida está muy rica." },
  ],
  hotel: [
    { word: "la habitación", translation: "pokoj", sentence: "La habitación está en el segundo piso." },
    { word: "la recepción", translation: "recepce", sentence: "Pregunte en la recepción." },
    { word: "la llave", translation: "klíč", sentence: "Aquí tiene la llave de su habitación." },
    { word: "reservar", translation: "rezervovat", sentence: "Quiero reservar una habitación doble." },
    { word: "el desayuno", translation: "snídaně", sentence: "El desayuno empieza a las ocho." },
    { word: "la maleta", translation: "kufr", sentence: "Mi maleta está en la habitación." },
    { word: "el ascensor", translation: "výtah", sentence: "El ascensor no funciona." },
    { word: "la cama", translation: "postel", sentence: "La cama es muy cómoda." },
  ],
  obchod: [
    { word: "la tienda", translation: "obchod", sentence: "La tienda abre a las nueve." },
    { word: "el precio", translation: "cena", sentence: "¿Cuál es el precio de esta camiseta?" },
    { word: "comprar", translation: "koupit", sentence: "Quiero comprar estos zapatos." },
    { word: "pagar", translation: "platit", sentence: "¿Puedo pagar con tarjeta?" },
    { word: "la talla", translation: "velikost", sentence: "¿Tiene esta falda en otra talla?" },
    { word: "barato", translation: "levný", sentence: "Este bolso es barato." },
    { word: "caro", translation: "drahý", sentence: "Ese abrigo es demasiado caro." },
    { word: "el recibo", translation: "účtenka", sentence: "Necesito el recibo, por favor." },
  ],
};

const topicMeta = {
  restaurace: { label: "Restaurace", emoji: "🍽️", description: "Objednávání, jídlo a placení." },
  hotel: { label: "Hotel", emoji: "🏨", description: "Ubytování, recepce a služby." },
  obchod: { label: "Obchod", emoji: "🛍️", description: "Nakupování, ceny a velikosti." },
};

const STORAGE_KEY = "spanelska-slovicka-vysledky";
const UNKNOWN_KEY = "spanelska-slovicka-neumel";

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, "")
    .replace(/[^a-zñ\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function safeGetLocalStorage(key) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLocalStorage(key, value) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Náhled nebo prohlížeč může localStorage blokovat. Aplikace má fungovat i bez něj.
  }
}

function safeRemoveLocalStorage(key) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Bezpečné ignorování, aby aplikace nespadla v sandboxu.
  }
}

function getStoredNumber(key, fallback = 0) {
  const value = Number(safeGetLocalStorage(key));
  return Number.isFinite(value) ? value : fallback;
}

function speakSpanish(text, onMessage) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onMessage?.("Tento prohlížeč bohužel nepodporuje hlasové čtení.");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-ES";
  utterance.rate = 0.85;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function makeQuizOptions(words, currentQuestion) {
  if (!currentQuestion) return [];
  const wrongOptions = shuffle(words.filter((item) => item.translation !== currentQuestion.translation))
    .slice(0, 3)
    .map((item) => item.translation);
  return shuffle([currentQuestion.translation, ...wrongOptions]);
}

function runInternalTests() {
  console.assert(normalizeText("La habitación") === "habitacion", "Test normalizeText: odstranění členu a diakritiky");
  console.assert(normalizeText("  El menú!!! ") === "menu", "Test normalizeText: mezery a interpunkce");
  console.assert(Object.keys(vocabulary).length === 3, "Test vocabulary: aplikace má 3 témata");
  console.assert(vocabulary.restaurace.length >= 4, "Test vocabulary: restaurace má slovíčka");
  const options = makeQuizOptions(vocabulary.hotel, vocabulary.hotel[0]);
  console.assert(options.length === 4, "Test quiz: kvíz má 4 možnosti");
  console.assert(options.includes(vocabulary.hotel[0].translation), "Test quiz: možnosti obsahují správnou odpověď");
}

if (typeof window !== "undefined") {
  runInternalTests();
}

function App() {
  const [screen, setScreen] = useState("intro");
  const [topic, setTopic] = useState(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [unknownWords, setUnknownWords] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState("");
  const [speechFeedback, setSpeechFeedback] = useState("");
  const recognitionRef = useRef(null);

  useEffect(() => {
    setBestScore(getStoredNumber(STORAGE_KEY, 0));
    const savedUnknown = safeGetLocalStorage(UNKNOWN_KEY);
    if (savedUnknown) {
      try {
        const parsed = JSON.parse(savedUnknown);
        setUnknownWords(Array.isArray(parsed) ? parsed : []);
      } catch {
        setUnknownWords([]);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const words = topic ? vocabulary[topic] : [];
  const currentCard = words[cardIndex];
  const currentQuestion = words[quizIndex];

  const options = useMemo(() => makeQuizOptions(words, currentQuestion), [currentQuestion, words]);

  function chooseTopic(nextTopic) {
    setTopic(nextTopic);
    setCardIndex(0);
    setQuizIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setShowTranslation(false);
    setSpokenText("");
    setSpeechFeedback("");
    setScreen("cards");
  }

  function startSpeakingPractice(targetText) {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setSpeechFeedback("Tento prohlížeč nepodporuje rozpoznávání řeči. Nejlépe funguje Chrome nebo Edge. Poslech slovíček ale může fungovat i bez mikrofonu.");
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "es-ES";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setSpokenText("");
        setSpeechFeedback("Poslouchám… řekněte španělské slovíčko nahlas.");
      };

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";
        const expected = normalizeText(targetText);
        const spoken = normalizeText(transcript);
        setSpokenText(transcript);

        if (spoken === expected || spoken.includes(expected) || expected.includes(spoken)) {
          setSpeechFeedback("Výborně! Výslovnost byla rozpoznána správně.");
        } else {
          setSpeechFeedback(`Zkuste to ještě jednou. Aplikace rozpoznala: „${transcript}“.`);
        }
      };

      recognition.onerror = (event) => {
        const reason = event?.error ? ` (${event.error})` : "";
        setSpeechFeedback(`Nepodařilo se zachytit hlas${reason}. Zkontrolujte povolení mikrofonu a zkuste to znovu.`);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setSpeechFeedback("Rozpoznávání řeči se v tomto náhledu nepodařilo spustit. Zkuste aplikaci v Chrome nebo Edge.");
    }
  }

  function nextCard() {
    if (!words.length) return;
    setShowTranslation(false);
    setSpokenText("");
    setSpeechFeedback("");
    setCardIndex((index) => (index + 1) % words.length);
  }

  function previousCard() {
    if (!words.length) return;
    setShowTranslation(false);
    setSpokenText("");
    setSpeechFeedback("");
    setCardIndex((index) => (index - 1 + words.length) % words.length);
  }

  function saveUnknownWord(word) {
    if (!word) return;
    const exists = unknownWords.some((item) => item.word === word.word && item.topic === topic);
    if (exists) return;
    const updated = [...unknownWords, { ...word, topic }];
    setUnknownWords(updated);
    safeSetLocalStorage(UNKNOWN_KEY, JSON.stringify(updated));
  }

  function answerQuestion(answer) {
    if (selectedAnswer || !currentQuestion) return;
    setSelectedAnswer(answer);
    const isCorrect = answer === currentQuestion.translation;
    if (isCorrect) {
      setScore((value) => value + 1);
    } else {
      saveUnknownWord(currentQuestion);
    }
  }

  function nextQuestion() {
    if (!currentQuestion) return;
    const nextIndex = quizIndex + 1;
    if (nextIndex >= words.length) {
      const finalScore = selectedAnswer === currentQuestion.translation ? score + 1 : score;
      if (finalScore > bestScore) {
        setBestScore(finalScore);
        safeSetLocalStorage(STORAGE_KEY, String(finalScore));
      }
      setScreen("result");
      return;
    }
    setQuizIndex(nextIndex);
    setSelectedAnswer(null);
  }

  function resetQuiz() {
    setQuizIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setScreen("quiz");
  }

  function clearUnknownWords() {
    setUnknownWords([]);
    safeRemoveLocalStorage(UNKNOWN_KEY);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-red-50 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-5xl">
        <Header topic={topic} setScreen={setScreen} />

        {screen === "intro" && (
          <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Card>
              <div className="mb-5 inline-flex rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
                Interaktivní mini aplikace
              </div>
              <h2 className="text-4xl font-black leading-tight md:text-5xl">
                Naučte se španělská slovíčka rychleji a zábavněji.
              </h2>
              <p className="mt-5 max-w-2xl text-lg text-slate-600">
                Vyberte si téma, projděte si kartičky se slovem, překladem a větou, poslechněte si výslovnost a potom si znalosti ověřte v kvízu.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button onClick={() => setScreen("topics")}>Začít procvičovat</Button>
                <Button variant="outline" onClick={() => setScreen("unknown")}>Slovíčka, která neumím</Button>
              </div>
            </Card>

            <div className="grid gap-4">
              <StatCard emoji="🏆" label="Nejlepší skóre" value={`${bestScore} bodů`} />
              <StatCard emoji="📚" label="Počet slovíček" value={`${Object.values(vocabulary).flat().length}`} />
              <StatCard emoji="🎯" label="K procvičení" value={`${unknownWords.length}`} />
            </div>
          </section>
        )}

        {screen === "topics" && (
          <section className="mt-10">
            <h2 className="text-3xl font-bold">Vyberte téma</h2>
            <p className="mt-2 text-slate-600">Každé téma obsahuje 8 praktických slovíček.</p>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {Object.entries(topicMeta).map(([key, item]) => (
                <button key={key} onClick={() => chooseTopic(key)} className="group text-left">
                  <Card className="h-full transition group-hover:-translate-y-1 group-hover:shadow-xl">
                    <div className="mb-5 inline-flex rounded-2xl bg-red-100 p-4 text-4xl">
                      {item.emoji}
                    </div>
                    <h3 className="text-2xl font-bold">{item.label}</h3>
                    <p className="mt-2 text-slate-600">{item.description}</p>
                  </Card>
                </button>
              ))}
            </div>
          </section>
        )}

        {screen === "cards" && currentCard && (
          <section className="mt-10">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold">Kartičky</h2>
                <p className="text-slate-600">Kartička {cardIndex + 1} z {words.length}</p>
              </div>
              <Button onClick={() => setScreen("quiz")}>Spustit kvíz</Button>
            </div>

            <Card className="p-8 md:p-12">
              <p className="text-sm font-semibold uppercase tracking-wide text-red-600">Španělsky</p>
              <h3 className="mt-2 text-5xl font-black">{currentCard.word}</h3>

              <div className="mt-8 rounded-3xl bg-slate-50 p-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Příkladová věta</p>
                <p className="mt-2 text-2xl font-semibold text-slate-800">{currentCard.sentence}</p>
              </div>

              <div className="mt-8 min-h-[72px]">
                {showTranslation ? (
                  <div className="rounded-2xl bg-amber-100 p-5 text-2xl font-bold text-amber-900">
                    Český překlad: {currentCard.translation}
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => setShowTranslation(true)}>Zobrazit překlad</Button>
                )}
              </div>

              <div className="mt-8 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <h4 className="text-lg font-bold">Poslech a mluvení</h4>
                <p className="mt-1 text-sm text-slate-600">Nejdříve si slovíčko nebo větu poslechněte, potom je zkuste říct nahlas.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => speakSpanish(currentCard.word, setSpeechFeedback)}>🔊 Přehrát slovíčko</Button>
                  <Button variant="outline" onClick={() => speakSpanish(currentCard.sentence, setSpeechFeedback)}>🔊 Přehrát větu</Button>
                  <Button onClick={() => startSpeakingPractice(currentCard.word)} disabled={isListening}>
                    {isListening ? "🎙️ Poslouchám…" : "🎤 Říct slovíčko"}
                  </Button>
                </div>
                {speechFeedback && (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-medium text-slate-700">
                    {speechFeedback}
                    {spokenText && <div className="mt-1 text-slate-500">Rozpoznaný text: {spokenText}</div>}
                  </div>
                )}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="outline" onClick={previousCard}>Předchozí</Button>
                <Button onClick={nextCard}>Další kartička</Button>
                <Button variant="secondary" onClick={() => saveUnknownWord(currentCard)}>Tohle si chci procvičit</Button>
              </div>
            </Card>
          </section>
        )}

        {screen === "quiz" && currentQuestion && (
          <section className="mt-10">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold">Kvíz</h2>
                <p className="text-slate-600">Otázka {quizIndex + 1} z {words.length} · Skóre: {score}</p>
              </div>
              <Button variant="outline" onClick={() => setScreen("cards")}>Zpět na kartičky</Button>
            </div>

            <Card className="p-8 md:p-10">
              <p className="text-sm font-semibold uppercase tracking-wide text-red-600">Co znamená?</p>
              <h3 className="mt-2 text-5xl font-black">{currentQuestion.word}</h3>
              <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-xl text-slate-700">{currentQuestion.sentence}</p>

              <div className="mt-8 grid gap-3 md:grid-cols-2">
                {options.map((option) => {
                  const isCorrect = option === currentQuestion.translation;
                  const isSelected = option === selectedAnswer;
                  let className = "rounded-2xl border bg-white p-5 text-left text-lg font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md";
                  if (selectedAnswer && isCorrect) className += " border-green-400 bg-green-50 text-green-800";
                  if (selectedAnswer && isSelected && !isCorrect) className += " border-red-400 bg-red-50 text-red-800";
                  return (
                    <button key={option} onClick={() => answerQuestion(option)} className={className}>
                      {option}
                    </button>
                  );
                })}
              </div>

              {selectedAnswer && (
                <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-50 p-5">
                  <div className="font-semibold">
                    {selectedAnswer === currentQuestion.translation ? "✅ Správně!" : `❌ Správná odpověď: ${currentQuestion.translation}`}
                  </div>
                  <Button onClick={nextQuestion}>
                    {quizIndex + 1 >= words.length ? "Zobrazit výsledek" : "Další otázka"}
                  </Button>
                </div>
              )}
            </Card>
          </section>
        )}

        {screen === "result" && (
          <section className="mt-10">
            <Card className="p-8 text-center md:p-12">
              <div className="text-6xl">🏆</div>
              <h2 className="mt-5 text-4xl font-black">Výsledek kvízu</h2>
              <p className="mt-4 text-2xl font-bold">{score} / {words.length} bodů</p>
              <p className="mt-2 text-slate-600">Nejlepší uložené skóre: {bestScore} bodů</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button onClick={resetQuiz}>Zkusit znovu</Button>
                <Button variant="outline" onClick={() => setScreen("unknown")}>Procvičit chybné výrazy</Button>
                <Button variant="secondary" onClick={() => setScreen("topics")}>Vybrat jiné téma</Button>
              </div>
            </Card>
          </section>
        )}

        {screen === "unknown" && (
          <section className="mt-10">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold">Slovíčka, která student neuměl</h2>
                <p className="text-slate-600">Ukládají se automaticky při chybné odpovědi v kvízu.</p>
              </div>
              <Button variant="outline" onClick={clearUnknownWords}>Vymazat seznam</Button>
            </div>

            {unknownWords.length === 0 ? (
              <Card className="text-center text-slate-600">Zatím zde nejsou žádná problematická slovíčka.</Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {unknownWords.map((item, index) => (
                  <Card key={`${item.word}-${index}`}>
                    <div className="mb-3 inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold uppercase text-red-700">
                      {topicMeta[item.topic]?.label || "Slovíčko"}
                    </div>
                    <h3 className="text-2xl font-black">{item.word}</h3>
                    <p className="mt-1 text-lg font-semibold text-slate-700">{item.translation}</p>
                    <p className="mt-3 text-slate-600">{item.sentence}</p>
                  </Card>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function Header({ topic, setScreen }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <button onClick={() => setScreen("intro")} className="flex items-center gap-2 text-left">
        <div className="rounded-2xl bg-white/80 p-3 text-2xl shadow-sm">🇪🇸</div>
        <div>
          <p className="text-sm text-slate-500">Procvičování slovíček</p>
          <h1 className="text-xl font-bold text-slate-900">Španělština na cesty</h1>
        </div>
      </button>
      {topic && (
        <div className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
          Téma: {topicMeta[topic].label}
        </div>
      )}
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-3xl border-0 bg-white/90 p-7 shadow-lg ${className}`}>
      {children}
    </div>
  );
}

function Button({ children, onClick, variant = "primary", disabled = false, className = "" }) {
  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-700",
    outline: "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50",
    secondary: "bg-amber-100 text-amber-900 hover:bg-amber-200",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl px-5 py-3 text-base font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant] || variants.primary} ${className}`}
    >
      {children}
    </button>
  );
}

function StatCard({ emoji, label, value }) {
  return (
    <Card className="flex items-center gap-4">
      <div className="rounded-2xl bg-slate-100 p-4 text-3xl">{emoji}</div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-black">{value}</p>
      </div>
    </Card>
  );
}
</div>
);
export default App;
