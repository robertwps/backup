import { Bell, ChevronRight, Check, Loader2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { User } from "@supabase/supabase-js";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  user_id: string | null;
  product_id: string | null;
  is_read: boolean;
  created_at: string;
  produtos: { slug: string } | null;
};

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} d`;
}

export function NotificationsBell({ user }: { user: User | null }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unread = useMemo(() => items.filter((item) => !item.is_read).length, [items]);

  useEffect(() => {
    if (!user) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;

    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("*, produtos (slug)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!active) return;
      if (error) {
        setError("Não foi possível carregar os avisos.");
        setItems([]);
      } else {
        setError(null);
        setItems((data ?? []) as NotificationItem[]);
      }
      setLoading(false);
    };

    fetch();
    return () => {
      active = false;
    };
  }, [user]);

  const markAllRead = async () => {
    if (unread === 0 || !user) return;
    setMarking(true);
    try {
      const unreadIds = items.filter((item) => !item.is_read).map((item) => item.id);
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", unreadIds);
      if (!error) {
        setItems((prev) => prev.map((item) => ({ ...item, is_read: true })));
      }
    } finally {
      setMarking(false);
    }
  };

  const clearNotifications = async () => {
    if (!user || items.length === 0) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);
      if (!error) {
        setItems([]);
      }
    } finally {
      setDeleting(false);
    }
  };

  const markRead = async (notificationId: string) => {
    setItems((prev) => prev.map((item) => (item.id === notificationId ? { ...item, is_read: true } : item)));
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);
    if (error) {
      console.error("Falha ao marcar notificação como lida", error);
    }
  };

  const handleNotificationClick = async (notification: NotificationItem) => {
    await markRead(notification.id);
    if (notification.produtos?.slug) {
      navigate({ to: "/produto/$slug", params: { slug: notification.produtos.slug } });
    }
  };

  if (!user) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notificações de produtos" className="relative">
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-[6px] text-[10px] font-bold text-gold-foreground ring-2 ring-background">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="rounded-lg border border-border bg-card text-foreground shadow-lg">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Avisos</p>
              <p className="text-xs text-muted-foreground">
                {unread > 0 ? `${unread} não lida${unread > 1 ? "s" : ""}` : "Sem novidades"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllRead}
                disabled={unread === 0 || marking}
              >
                {marking ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                Marcar todas
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearNotifications}
                disabled={items.length === 0 || deleting}
              >
                {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                Limpar tudo
              </Button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="size-6 animate-spin text-gold" />
              </div>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhum aviso disponível.</p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-background/80 ${
                        !notification.is_read ? "bg-gold/10" : ""
                      }`}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/10 text-gold">
                        <ChevronRight className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-foreground">{notification.title}</p>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {formatRelativeTime(notification.created_at)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-5 text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                      {notification.produtos?.slug && (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
