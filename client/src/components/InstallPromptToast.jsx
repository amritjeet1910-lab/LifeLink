import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export default function InstallPromptToast() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = window.localStorage.getItem("lifelink_install_dismissed");
    if (dismissed === "true") return;

    const handlePrompt = (event) => {
      event.preventDefault();
      setPromptEvent(event);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  const dismiss = () => {
    setIsVisible(false);
    window.localStorage.setItem("lifelink_install_dismissed", "true");
  };

  const install = async () => {
    if (!promptEvent) return;
    promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice?.outcome === "accepted") {
      setPromptEvent(null);
      setIsVisible(false);
      return;
    }
    dismiss();
  };

  if (!isVisible || !promptEvent) return null;

  return (
    <div className="fixed bottom-5 left-1/2 z-[120] w-[min(92vw,420px)] -translate-x-1/2 rounded-[1.4rem] border border-white/60 bg-white/75 p-4 shadow-[0_25px_80px_rgba(15,23,42,0.18)] backdrop-blur-2xl">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-red-600 text-white">
          <Download className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-slate-950">Install LifeLink</div>
          <div className="mt-1 text-xs leading-relaxed text-slate-600">
            Add LifeLink to your home screen for faster access to live requests and location tools.
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button type="button" onClick={install} className="btn-primary text-sm !px-4 !py-2.5 !rounded-2xl">
              Install
            </button>
            <button type="button" onClick={dismiss} className="btn-ghost text-sm !px-4 !py-2.5 !rounded-2xl">
              Not now
            </button>
          </div>
        </div>
        <button type="button" onClick={dismiss} className="rounded-xl p-1.5 text-slate-500 transition hover:bg-white/80 hover:text-slate-900">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
