import { useEffect, useRef, useState } from "react";
import { Bell, Check, Loader2, ShoppingBag, UserPlus, Sparkles } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  metadata?: { pedido_id?: string; numero?: number; cliente_id?: string } | null;
};

function iconFor(type: string) {
  if (type === "cadastro") return UserPlus;
  if (type === "compra") return ShoppingBag;
  return Sparkles;
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} d`;
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const unread = items.filter((n) => !n.read).length;

  // Load + realtime subscribe
  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (!active) return;
      if (!error && data) setItems(data as Notification[]);
      setLoading(false);
    })();

    const channel = supabase
      .channel("admin_notifications_changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_notifications" },
        (payload) => {
          const n = payload.new as Notification;
          setItems((prev) => [n, ...prev].slice(0, 30));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "admin_notifications" },
        (payload) => {
          const n = payload.new as Notification;
          setItems((prev) => prev.map((it) => (it.id === n.id ? n : it)));
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const markAllRead = async () => {
    if (unread === 0) return;
    setMarking(true);
    try {
      const ids = items.filter((n) => !n.read).map((n) => n.id);
      const { error } = await supabase
        .from("admin_notifications")
        .update({ read: true })
        .in("id", ids);
      if (error) {
        toast.error("Falha ao marcar como lidas.");
        return;
      }
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } finally {
      setMarking(false);
    }
  };

  const handleClickNotification = async (n: Notification) => {
    setOpen(false);
    if (!n.read) {
      setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, read: true } : it)));
      const { error } = await supabase
        .from("admin_notifications")
        .update({ read: true })
        .eq("id", n.id);
      if (error) console.error("[notif] marcar lida", error);
    }
    if (n.type === "compra") {
      navigate({ to: "/admin/pedidos" });
    } else if (n.type === "cadastro") {
      navigate({ to: "/admin/clientes" });
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notificações"
        className="relative inline-flex size-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-slate-900">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">Notificações</p>
              <p className="text-[11px] text-slate-500">
                {unread > 0 ? `${unread} não lida${unread > 1 ? "s" : ""}` : "Tudo em dia"}
              </p>
            </div>
            <button
              onClick={markAllRead}
              disabled={marking || unread === 0}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-indigo-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {marking ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
              Marcar todas como lidas
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin text-indigo-400" />
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-slate-500">
                Nenhuma notificação ainda.
              </p>
            ) : (
              <ul className="divide-y divide-slate-800">
                {items.map((n) => {
                  const Icon = iconFor(n.type);
                  return (
                    <li
                      key={n.id}
                      onClick={() => handleClickNotification(n)}
                      className={`flex cursor-pointer gap-3 px-4 py-3 transition-colors hover:bg-slate-800/50 ${!n.read ? "bg-indigo-500/5" : ""}`}
                    >
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-300">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-medium text-slate-100">{n.title}</p>
                          <span className="shrink-0 text-[10px] text-slate-500">
                            {formatRelative(n.created_at)}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-xs text-slate-400">{n.message}</p>
                      </div>
                      {!n.read && (
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-indigo-400" />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
