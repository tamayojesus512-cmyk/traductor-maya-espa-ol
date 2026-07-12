import { useEffect, useState } from "react";
import { Download, WifiOff, X } from "lucide-react";
import { toast } from "sonner";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "tm-install-dismissed";

export function PwaBanner() {
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [offline, setOffline] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    setOffline(!navigator.onLine);

    const onInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallEvt(null);
      toast.success("¡App instalada! Ya puedes usarla sin conexión.");
    };
    const goOffline = () => {
      setOffline(true);
      toast("Sin conexión — el diccionario sigue funcionando.", {
        icon: <WifiOff className="h-4 w-4" />,
      });
    };
    const goOnline = () => setOffline(false);

    window.addEventListener("beforeinstallprompt", onInstall);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstall);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  const install = async () => {
    if (!installEvt) return;
    await installEvt.prompt();
    const { outcome } = await installEvt.userChoice;
    if (outcome === "dismissed") {
      localStorage.setItem(DISMISS_KEY, "1");
      setDismissed(true);
    }
    setInstallEvt(null);
  };

  const close = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <>
      {offline && (
        <div className="flex items-center justify-center gap-1.5 bg-primary/10 py-1.5 text-[11px] font-semibold text-primary">
          <WifiOff className="h-3.5 w-3.5" />
          Modo sin conexión
        </div>
      )}

      {installEvt && !dismissed && (
        <div className="fixed bottom-[76px] left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-lg">
          <div className="rounded-xl bg-primary-soft p-2 text-primary">
            <Download className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Instala Traductor Maya</p>
            <p className="text-xs text-muted-foreground">
              Úsalo como app y sin conexión.
            </p>
          </div>
          <button
            onClick={install}
            className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground transition-transform active:scale-95"
          >
            Instalar
          </button>
          <button
            onClick={close}
            aria-label="Cerrar"
            className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
