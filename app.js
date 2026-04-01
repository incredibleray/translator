const MODES = {
  enToKo: {
    id: "enToKo",
    sourceLabel: "Heard in English",
    targetLabel: "Translated Korean",
    recognitionLang: "en-US",
    sourceLang: "en",
    targetLang: "ko",
    pairLabel: "EN → KO",
  },
  koToEn: {
    id: "koToEn",
    sourceLabel: "Heard in Korean",
    targetLabel: "Translated English",
    recognitionLang: "ko-KR",
    sourceLang: "ko",
    targetLang: "en",
    pairLabel: "KO → EN",
  },
};

const EMPTY_TARGET_TEXT =
  "The translated text will appear here and play automatically.";
const EMPTY_TYPED_TARGET_TEXT =
  "The translated text will appear here after you press Translate.";

const state = {
  mode: MODES.enToKo,
  activeTab: "speech",
  recognition: null,
  isListening: false,
  transcript: "",
  translated: "",
  typedTranscript: "",
  typedTranslated: "",
  voices: [],
};

const elements = {
  tabSpeech: document.querySelector("#tab-speech"),
  tabText: document.querySelector("#tab-text"),
  modeEnKo: document.querySelector("#mode-en-ko"),
  modeKoEn: document.querySelector("#mode-ko-en"),
  statusBadge: document.querySelector("#status-badge"),
  langPair: document.querySelector("#lang-pair"),
  listenHint: document.querySelector("#listen-hint"),
  speechPanel: document.querySelector("#speech-panel"),
  textPanel: document.querySelector("#text-panel"),
  sourceLabel: document.querySelector("#source-label"),
  targetLabel: document.querySelector("#target-label"),
  sourceText: document.querySelector("#source-text"),
  targetText: document.querySelector("#target-text"),
  speakButton: document.querySelector("#speak-button"),
  typedSourceLabel: document.querySelector("#typed-source-label"),
  typedTargetLabel: document.querySelector("#typed-target-label"),
  typedSourceText: document.querySelector("#typed-source-text"),
  typedTargetText: document.querySelector("#typed-target-text"),
  translateButton: document.querySelector("#translate-button"),
  typedSpeakButton: document.querySelector("#typed-speak-button"),
};

const SpeechRecognitionApi =
  window.SpeechRecognition || window.webkitSpeechRecognition || null;

function setStatus(message) {
  elements.statusBadge.textContent = message;
}

function setPaneText(element, value, emptyMessage) {
  if (value) {
    element.textContent = value;
    element.classList.remove("is-empty");
    return;
  }

  element.textContent = emptyMessage;
  element.classList.add("is-empty");
}

function setSpeechSourceText(value) {
  setPaneText(elements.sourceText, value, "Your transcript will appear here.");
}

function syncModeUi() {
  const isEnglishToKorean = state.mode.id === "enToKo";

  elements.modeEnKo.classList.toggle("is-active", isEnglishToKorean);
  elements.modeEnKo.setAttribute("aria-selected", String(isEnglishToKorean));
  elements.modeKoEn.classList.toggle("is-active", !isEnglishToKorean);
  elements.modeKoEn.setAttribute("aria-selected", String(!isEnglishToKorean));

  elements.sourceLabel.textContent = state.mode.sourceLabel;
  elements.targetLabel.textContent = state.mode.targetLabel;
  elements.typedSourceLabel.textContent =
    state.mode.id === "enToKo" ? "Type in English" : "Type in Korean";
  elements.typedTargetLabel.textContent = state.mode.targetLabel;
  elements.langPair.textContent = state.mode.pairLabel;

  state.transcript = "";
  state.translated = "";
  setSpeechSourceText("");
  setPaneText(elements.targetText, "", EMPTY_TARGET_TEXT);
  elements.speakButton.disabled = true;

  state.typedTranscript = "";
  state.typedTranslated = "";
  elements.typedSourceText.value = "";
  setPaneText(elements.typedTargetText, "", EMPTY_TYPED_TARGET_TEXT);
  elements.typedSpeakButton.disabled = true;

  window.speechSynthesis.cancel();
  setStatus("Ready");
}

function loadVoices() {
  state.voices = window.speechSynthesis.getVoices();
}

function getVoiceForLanguage(lang) {
  const langPrefix = lang.toLowerCase();
  const exact = state.voices.find((voice) =>
    voice.lang.toLowerCase().startsWith(langPrefix)
  );

  if (exact) {
    return exact;
  }

  return state.voices.find((voice) =>
    voice.lang.toLowerCase().startsWith(langPrefix.split("-")[0])
  );
}

function speakText(text) {
  if (!text) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = state.mode.targetLang === "ko" ? "ko-KR" : "en-US";
  utterance.rate = state.mode.targetLang === "ko" ? 0.92 : 1;

  const voice = getVoiceForLanguage(utterance.lang);
  if (voice) {
    utterance.voice = voice;
  }

  window.speechSynthesis.speak(utterance);
}

function speakTranslatedText() {
  speakText(state.translated);
}

function speakTypedTranslatedText() {
  speakText(state.typedTranslated);
}

async function translateText(text) {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", state.mode.sourceLang);
  url.searchParams.set("tl", state.mode.targetLang);
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Translation failed with status ${response.status}`);
  }

  const payload = await response.json();
  const translatedText = Array.isArray(payload?.[0])
    ? payload[0].map((part) => part[0]).join("")
    : "";

  if (!translatedText) {
    throw new Error("Translation service returned an empty result.");
  }

  return translatedText;
}

async function handleTranscript(finalTranscript) {
  state.transcript = finalTranscript.trim();
  setSpeechSourceText(state.transcript);

  if (!state.transcript) {
    setStatus("Nothing heard");
    return;
  }

  setStatus("Translating");
  setPaneText(elements.targetText, "", EMPTY_TARGET_TEXT);

  try {
    const translated = await translateText(state.transcript);
    state.translated = translated;
    setPaneText(elements.targetText, translated, "");
    elements.speakButton.disabled = false;
    setStatus("Speaking");
    speakTranslatedText();
    setTimeout(() => {
      if (!state.isListening) {
        setStatus("Ready");
      }
    }, 400);
  } catch (error) {
    console.error(error);
    state.translated = "";
    elements.speakButton.disabled = true;
    setStatus("Translation error");
    setPaneText(
      elements.targetText,
      "",
      "Translation failed. Check your internet connection and try again."
    );
  }
}

async function handleTypedTranslation() {
  const sourceText = elements.typedSourceText.value.trim();
  state.typedTranscript = sourceText;

  if (!sourceText) {
    state.typedTranslated = "";
    elements.typedSpeakButton.disabled = true;
    setStatus("Nothing to translate");
    setPaneText(elements.typedTargetText, "", EMPTY_TYPED_TARGET_TEXT);
    return;
  }

  setStatus("Translating");
  setPaneText(elements.typedTargetText, "", EMPTY_TYPED_TARGET_TEXT);

  try {
    const translated = await translateText(sourceText);
    state.typedTranslated = translated;
    setPaneText(elements.typedTargetText, translated, EMPTY_TYPED_TARGET_TEXT);
    elements.typedSpeakButton.disabled = false;
    setStatus("Ready");
  } catch (error) {
    console.error(error);
    state.typedTranslated = "";
    elements.typedSpeakButton.disabled = true;
    setStatus("Translation error");
    setPaneText(
      elements.typedTargetText,
      "",
      "Translation failed. Check your internet connection and try again."
    );
  }
}

function stopListening() {
  if (!state.recognition || !state.isListening) {
    return;
  }

  state.isListening = false;
  state.recognition.stop();
}

function startListening(forceRestart = false) {
  if (!SpeechRecognitionApi) {
    setStatus("Speech recognition unavailable");
    elements.listenHint.textContent =
      "Use Chrome or Edge on desktop or Android for microphone support.";
    return;
  }

  if (state.isListening) {
    if (!forceRestart) {
      stopListening();
      return;
    }

    state.recognition.stop();
    return;
  }

  window.speechSynthesis.cancel();

  const recognition = new SpeechRecognitionApi();
  recognition.lang = state.mode.recognitionLang;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  let finalTranscript = "";

  recognition.onstart = () => {
    state.isListening = true;
    state.recognition = recognition;
    elements.listenHint.innerHTML = `Listening for <strong>${state.mode.sourceLabel.toLowerCase()}</strong>. Press the same shortcut again after the sentence to start over.`;
    setStatus("Listening");
  };

  recognition.onresult = (event) => {
    let interimTranscript = "";

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const text = result[0]?.transcript ?? "";

      if (result.isFinal) {
        finalTranscript += text;
      } else {
        interimTranscript += text;
      }
    }

    setSpeechSourceText(`${finalTranscript}${interimTranscript}`.trim());
  };

  recognition.onerror = (event) => {
    console.error(event.error);
    state.isListening = false;
    elements.listenHint.textContent =
      event.error === "not-allowed"
        ? "Microphone permission was blocked."
        : "Listening failed. Please try again.";
    setStatus(event.error === "not-allowed" ? "Mic blocked" : "Listen error");
  };

  recognition.onend = () => {
    const finishedTranscript = finalTranscript.trim();
    state.isListening = false;
    state.recognition = null;
    elements.listenHint.innerHTML =
      "Press <strong>E</strong> or <strong>K</strong>, or tap a mode button, and listening starts immediately.";

    if (finishedTranscript) {
      handleTranscript(finishedTranscript);
      return;
    }

    if (elements.statusBadge.textContent === "Listening") {
      setStatus("Ready");
    }
  };

  recognition.start();
}

function activateMode(mode) {
  const switchingModes = state.mode.id !== mode.id;

  if (switchingModes) {
    stopListening();
    state.mode = mode;
    syncModeUi();
  }

  startListening(switchingModes);
}

function setActiveTab(nextTab) {
  state.activeTab = nextTab;
  const isSpeechTab = nextTab === "speech";

  elements.tabSpeech.classList.toggle("is-active", isSpeechTab);
  elements.tabSpeech.setAttribute("aria-selected", String(isSpeechTab));
  elements.tabText.classList.toggle("is-active", !isSpeechTab);
  elements.tabText.setAttribute("aria-selected", String(!isSpeechTab));
  elements.speechPanel.classList.toggle("is-hidden", !isSpeechTab);
  elements.textPanel.classList.toggle("is-hidden", isSpeechTab);

  if (!isSpeechTab) {
    stopListening();
    setStatus("Ready");
  }
}

elements.tabSpeech.addEventListener("click", () => setActiveTab("speech"));
elements.tabText.addEventListener("click", () => setActiveTab("text"));
elements.modeEnKo.addEventListener("click", () => activateMode(MODES.enToKo));
elements.modeKoEn.addEventListener("click", () => activateMode(MODES.koToEn));
elements.speakButton.addEventListener("click", speakTranslatedText);
elements.translateButton.addEventListener("click", handleTypedTranslation);
elements.typedSpeakButton.addEventListener("click", speakTypedTranslatedText);
elements.typedSourceText.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
    event.preventDefault();
    handleTypedTranslation();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.repeat) {
    return;
  }

  const target = event.target;
  const isTypingField =
    target instanceof HTMLElement &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable);

  if (isTypingField) {
    return;
  }

  const key = event.key.toLowerCase();

  if (key === "e") {
    event.preventDefault();
    setActiveTab("speech");
    activateMode(MODES.enToKo);
  }

  if (key === "k") {
    event.preventDefault();
    setActiveTab("speech");
    activateMode(MODES.koToEn);
  }
});

window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
loadVoices();
syncModeUi();
setActiveTab("speech");
