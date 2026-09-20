"use client";

import {
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  CircleStop,
  Clock3,
  ExternalLink,
  Eye,
  Globe2,
  History,
  LoaderCircle,
  Menu,
  Mic,
  MicOff,
  Monitor,
  PanelLeftClose,
  Play,
  Plus,
  RotateCw,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Square,
  UserRound,
  WandSparkles,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type TaskStatus = "idle" | "created" | "started" | "finished" | "failed" | "stopped";
type AgentStep = {
  number: number;
  memory?: string;
  evaluationPreviousGoal?: string;
  nextGoal?: string;
  url?: string;
  actions?: string[];
  screenshotUrl?: string;
};
type AgentTask = {
  id: string;
  sessionId?: string;
  task: string;
  status: TaskStatus;
  steps?: AgentStep[];
  output?: string | null;
  isSuccess?: boolean | null;
  cost?: string | null;
  liveUrl?: string | null;
  recordingUrl?: string | null;
};
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

const examples = [
  { icon: ShoppingCart, title: "Compare products", text: "Find the best noise-cancelling headphones under $300 and compare the top 3" },
  { icon: Globe2, title: "Plan a trip", text: "Find direct flights from New York to Austin next Friday morning" },
  { icon: Clock3, title: "Make a booking", text: "Find a highly rated Italian restaurant nearby with a table for two Friday at 7 PM" },
];

function stepLabel(step: AgentStep) {
  return step.nextGoal || step.evaluationPreviousGoal || step.memory || step.actions?.[0] || `Browser step ${step.number}`;
}

export default function HomePage() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [prompt, setPrompt] = useState("");
  const [task, setTask] = useState<AgentTask | null>(null);
  const [history, setHistory] = useState<Array<{ id: string; text: string; status: TaskStatus }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [error, setError] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [browserKey, setBrowserKey] = useState(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const terminal = task && ["finished", "failed", "stopped"].includes(task.status);

  useEffect(() => {
    fetch("/api/tasks").then((res) => res.json()).then((data) => setConfigured(Boolean(data.configured))).catch(() => setConfigured(false));
    return () => {
      recognitionRef.current?.abort?.();
      recognitionRef.current = null;
    };
  }, []);

  const say = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.03;
    window.speechSynthesis.speak(utterance);
  }, []);

  const startTask = useCallback(async (value: string) => {
    const clean = value.trim();
    if (!clean || submitting) return;
    setSubmitting(true);
    setError("");
    setTask(null);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: clean }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to launch browser agent.");
      setTask(data);
      setHistory((items) => [{ id: data.id, text: clean, status: data.status }, ...items]);
      setPrompt("");
      say("Task started. I opened a cloud browser and I am working on it now.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to launch browser agent.");
    } finally {
      setSubmitting(false);
    }
  }, [say, submitting]);

  useEffect(() => {
    if (!task?.id || terminal) return;
    const poll = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/tasks/${task.id}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setTask(data);
        setHistory((items) => items.map((item) => item.id === data.id ? { ...item, status: data.status } : item));
        if (data.status === "finished") say(data.isSuccess === false ? "The agent finished, but may need your help." : "The browser task is complete. Please review the result.");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Lost connection to agent.");
      }
    }, 1800);
    return () => window.clearInterval(poll);
  }, [task?.id, terminal, say]);

  async function stopTask() {
    if (!task?.id || stopping) return;
    setStopping(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, { method: "PATCH" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setTask((current) => current ? { ...current, status: "stopped" } : current);
      say("Browser task stopped.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not stop task.");
    } finally {
      setStopping(false);
    }
  }

  function toggleVoice() {
    if (listening && recognitionRef.current) return recognitionRef.current.stop();
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceSupported(false);
      setError("Voice input is not supported in this browser. Try Google Chrome or Microsoft Edge.");
      return;
    }
    const recognition = new Recognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;
    let finalText = "";
    recognition.onresult = (event) => {
      let text = "";
      for (let index = 0; index < event.results.length; index += 1) {
        text += event.results[index][0].transcript;
        if (event.results[index].isFinal) finalText += event.results[index][0].transcript;
      }
      setPrompt(text);
    };
    recognition.onerror = (event) => {
      setListening(false);
      recognitionRef.current = null;
      const messages: Record<string, string> = {
        "not-allowed": "Microphone permission was denied. Allow microphone access in the browser address bar and try again.",
        "service-not-allowed": "Speech recognition is blocked by the browser. Try Google Chrome or Microsoft Edge.",
        "audio-capture": "No microphone was detected. Connect a microphone and try again.",
        "no-speech": "I did not hear speech. Click the microphone and speak your task.",
        aborted: "Voice input was stopped.",
      };
      if (event.error !== "aborted") setError(messages[event.error] || "Voice input failed. Check your microphone and try again.");
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      if (finalText.trim()) startTask(finalText);
    };
    setError("");
    setListening(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
      recognitionRef.current = null;
      setError("Voice input could not start. Check that your microphone is available and try again.");
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    startTask(prompt);
  }

  const currentUrl = task?.steps?.at(-1)?.url;
  const screenshot = task?.steps?.at(-1)?.screenshotUrl;
  const running = task && ["created", "started"].includes(task.status);

  return (
    <main className={panelOpen ? "agent-app" : "agent-app panel-collapsed"}>
      <aside className="rail">
        <div className="agent-logo"><Sparkles size={21} /></div>
        <div className="rail-nav">
          <button className="rail-button active" title="New task" onClick={() => { setTask(null); setPrompt(""); }}><Plus size={20} /></button>
          <button className="rail-button" title="Task history" onClick={() => setShowHistory(!showHistory)}><History size={20} /></button>
          <button className="rail-button" title="Agents"><Bot size={20} /></button>
        </div>
        <div className="rail-bottom">
          <button className="rail-button" title="Settings"><Settings size={20} /></button>
          <div className="mini-avatar">A</div>
        </div>
      </aside>

      <section className={panelOpen ? "command-panel" : "command-panel collapsed"}>
        <header className="command-header">
          <div className="wordmark"><span>Vocaly</span><b>Browser Agent</b></div>
          <button className="ghost-icon" onClick={() => setPanelOpen(false)} title="Close panel"><PanelLeftClose size={19} /></button>
        </header>

        {showHistory ? (
          <div className="history-view">
            <div className="panel-title"><div><span>Workspace</span><h1>Task history</h1></div><button onClick={() => setShowHistory(false)}><X size={17} /></button></div>
            <div className="history-list">
              {history.length ? history.map((item) => <button key={item.id}><span className={`history-status ${item.status}`} /><div><b>{item.text}</b><small>{item.status}</small></div></button>) : <div className="history-empty"><History size={25} /><p>Your browser tasks will appear here.</p></div>}
            </div>
          </div>
        ) : (
          <>
            <div className="conversation">
              {!task ? (
                <div className="welcome-block">
                  <div className="ai-badge"><WandSparkles size={18} /></div>
                  <span className="overline">Voice-first browser automation</span>
                  <h1>What should I do<br />on the web?</h1>
                  <p>Speak naturally. I’ll open a real browser, navigate websites, compare options, and fill forms for you.</p>
                  <div className="example-list">
                    {examples.map((example) => <button key={example.title} onClick={() => setPrompt(example.text)}><example.icon size={17} /><span><b>{example.title}</b><small>{example.text}</small></span></button>)}
                  </div>
                </div>
              ) : (
                <div className="run-view">
                  <div className="user-message"><span>{task.task}</span><div className="user-dot"><UserRound size={14} /></div></div>
                  <div className="agent-message">
                    <div className="agent-message-head"><div className="bot-dot"><Sparkles size={14} /></div><div><b>Browser Agent</b><span className={`run-state ${task.status}`}>{running && <i />}{task.status}</span></div></div>
                    <p>{task.status === "finished" ? "Task complete. I stopped before any irreversible action so you can review it." : task.status === "failed" ? "I couldn’t complete this task. Review the steps below to see where I stopped." : task.status === "stopped" ? "You stopped this browser run." : "I’m controlling the browser now. You can watch each action live."}</p>
                  </div>
                  <div className="step-log">
                    {(task.steps ?? []).map((step, index) => <div className="log-row" key={`${step.number}-${index}`}><span className="log-marker">{index < (task.steps?.length ?? 0) - 1 || terminal ? <Check size={12} /> : <LoaderCircle className="spin" size={12} />}</span><div><b>{stepLabel(step)}</b>{step.url && <small>{new URL(step.url).hostname}</small>}</div></div>)}
                    {running && !(task.steps?.length) && <div className="log-row"><span className="log-marker"><LoaderCircle className="spin" size={12} /></span><div><b>Starting secure cloud browser…</b><small>This usually takes a few seconds</small></div></div>}
                  </div>
                  {task.output && <div className="output-card"><span><Check size={14} /> Result</span><p>{task.output}</p>{task.cost && <small>Run cost ${Number(task.cost).toFixed(3)}</small>}</div>}
                </div>
              )}
            </div>

            <div className="composer-area">
              {error && <div className="error-toast"><span>{error}</span><button onClick={() => setError("")}><X size={14} /></button></div>}
              {configured === false && <div className="connect-banner"><ShieldCheck size={16} /><div><b>Connect Browser Use Cloud</b><span>Add <code>BROWSER_USE_API_KEY</code> to enable real automation.</span></div><a href="https://cloud.browser-use.com/settings?tab=api-keys&new=1" target="_blank" rel="noreferrer">Get key <ExternalLink size={12} /></a></div>}
              {listening && <div className="listening-bar"><div className="voice-bars">{[9,18,12,24,15,20,10,17].map((height, index) => <i key={index} style={{ height }} />)}</div><span>Listening… speak your browser task</span></div>}
              <form className={listening ? "command-composer listening" : "command-composer"} onSubmit={submit}>
                <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); startTask(prompt); } }} placeholder="Tell the browser what to do…" rows={3} />
                <div className="composer-actions">
                  <div><button type="button" className={listening ? "mic-button recording" : "mic-button"} onClick={toggleVoice} title={voiceSupported ? "Speak task" : "Voice unavailable"}>{listening ? <MicOff size={18} /> : <Mic size={18} />}</button><span>{voiceSupported ? "Voice command" : "Voice unavailable"}</span></div>
                  {running ? <button type="button" className="stop-button" onClick={stopTask} disabled={stopping}>{stopping ? <LoaderCircle className="spin" size={16} /> : <Square size={13} fill="currentColor" />} Stop</button> : <button className="launch-button" disabled={!prompt.trim() || submitting || configured === false}>{submitting ? <LoaderCircle className="spin" size={17} /> : <ArrowUp size={17} />}</button>}
                </div>
              </form>
              <p className="safety-copy"><ShieldCheck size={12} /> Pauses before payments, bookings, and other irreversible actions</p>
            </div>
          </>
        )}
      </section>

      <section className="browser-workspace">
        <header className="browser-topbar">
          {!panelOpen && <button className="ghost-icon panel-toggle" onClick={() => setPanelOpen(true)}><Menu size={19} /></button>}
          <div className="browser-title"><Monitor size={17} /><div><b>Live browser</b><span>{running ? "Agent is controlling this session" : task ? `Session ${task.status}` : "No active session"}</span></div></div>
          <div className="browser-actions">
            {running && <span className="live-chip"><i /> LIVE</span>}
            {task?.liveUrl && <a className="takeover-button" href={task.liveUrl} target="_blank" rel="noreferrer"><Eye size={15} /> Take over <ExternalLink size={12} /></a>}
          </div>
        </header>
        <div className="browser-frame">
          <div className="chrome-bar">
            <div className="traffic"><i /><i /><i /></div>
            <button className="chrome-icon" onClick={() => setBrowserKey((key) => key + 1)} disabled={!task?.liveUrl}><RotateCw size={14} /></button>
            <div className="address-bar"><ShieldCheck size={13} /><span>{currentUrl || (task?.liveUrl ? "Secure Browser Use live session" : "Ready for a new browser task")}</span></div>
            <button className="chrome-icon"><ChevronDown size={14} /></button>
          </div>
          <div className="viewport">
            {task?.liveUrl ? <iframe key={browserKey} src={task.liveUrl} title="Live Browser Use session" allow="clipboard-read; clipboard-write" /> : screenshot ? <img src={screenshot} alt="Latest browser agent step" /> : (
              <div className="browser-empty">
                <div className="empty-visual"><div className="browser-glyph"><Globe2 size={36} /></div><span className="orbit orbit-one" /><span className="orbit orbit-two" /></div>
                <span className="empty-label">CLOUD BROWSER</span>
                <h2>Your browser will appear here</h2>
                <p>Start with a voice or text command. Watch the agent navigate and take over at any time.</p>
                <div className="capabilities"><span><Check size={12} /> Real navigation</span><span><Check size={12} /> Live view</span><span><Check size={12} /> Human takeover</span></div>
              </div>
            )}
          </div>
          <footer className="browser-footer"><div><span className={running ? "connection-dot connected" : "connection-dot"} />{running ? "Secure session active" : "Browser disconnected"}</div>{task?.steps?.length ? <span>{task.steps.length} actions completed</span> : <span>Browser Use Cloud</span>}</footer>
        </div>
      </section>
    </main>
  );
}
