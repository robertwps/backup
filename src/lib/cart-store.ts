// Minimal cart store using localStorage + event emitter (no extra deps)
import { useEffect, useState } from "react";

export type CartItem = {
  produto_id: string;
  variante_id: string;
  nome: string;
  slug: string;
  comprimento: string;
  preco_unit: number; // already considers promo
  preco_original: number;
  imagem: string;
  quantidade: number;
};

const KEY = "elite316_cart_v1";

type Listener = () => void;
const listeners = new Set<Listener>();

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}
function write(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach((l) => l());
}

export const cart = {
  get: read,
  add(item: CartItem) {
    const items = read();
    const ex = items.find((i) => i.variante_id === item.variante_id);
    if (ex) ex.quantidade += item.quantidade;
    else items.push(item);
    write(items);
  },
  update(variante_id: string, quantidade: number) {
    const items = read().map((i) => (i.variante_id === variante_id ? { ...i, quantidade } : i));
    write(items.filter((i) => i.quantidade > 0));
  },
  remove(variante_id: string) {
    write(read().filter((i) => i.variante_id !== variante_id));
  },
  clear() {
    write([]);
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

const drawerListeners = new Set<(open: boolean) => void>();
let drawerOpen = false;
export const cartDrawer = {
  open() { drawerOpen = true; drawerListeners.forEach((l) => l(true)); },
  close() { drawerOpen = false; drawerListeners.forEach((l) => l(false)); },
  toggle() { drawerOpen = !drawerOpen; drawerListeners.forEach((l) => l(drawerOpen)); },
  subscribe(l: (open: boolean) => void) {
    drawerListeners.add(l);
    return () => drawerListeners.delete(l);
  },
  get isOpen() { return drawerOpen; },
};

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    setItems(read());
    const unsub = cart.subscribe(() => setItems(read()));
    return () => { unsub(); };
  }, []);
  const subtotal = items.reduce((s, i) => s + i.preco_unit * i.quantidade, 0);
  const count = items.reduce((s, i) => s + i.quantidade, 0);
  return { items, subtotal, count };
}

export function useCartDrawer() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(cartDrawer.isOpen);
    const unsub = cartDrawer.subscribe(setOpen);
    return () => { unsub(); };
  }, []);
  return { open, openDrawer: cartDrawer.open, closeDrawer: cartDrawer.close };
}

