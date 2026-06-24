"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db, firebaseEnabled, googleProvider } from "@/lib/firebase";
import {
  applySnapshot,
  loadCards,
  loadQuizHistory,
  mergeSnapshots,
  setRemoteWriter,
  type ProgressSnapshot,
} from "@/lib/storage";

interface SyncCtx {
  enabled: boolean;
  user: User | null;
  ready: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<SyncCtx>({
  enabled: false,
  user: null,
  ready: false,
  signIn: async () => {},
  signOut: async () => {},
});

export const useSync = () => useContext(Ctx);

export function SyncProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!firebaseEnabled);
  const unsubDoc = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!firebaseEnabled || !auth) return;
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setReady(true);
      // 切換使用者前先清掉舊的訂閱與寫入器
      unsubDoc.current?.();
      unsubDoc.current = null;
      setRemoteWriter(null);

      if (!u || !db) return;
      const ref = doc(db, "users", u.uid);
      const local: ProgressSnapshot = { cards: loadCards(), quizHistory: loadQuizHistory() };

      // 首次登入：合併本機與雲端，避免任一邊被覆蓋
      try {
        const snap = await getDoc(ref);
        const cloud = (snap.exists() ? snap.data() : {}) as Partial<ProgressSnapshot>;
        const merged = mergeSnapshots(local, {
          cards: cloud.cards ?? {},
          quizHistory: cloud.quizHistory ?? [],
        });
        applySnapshot(merged);
        await setDoc(ref, merged);
      } catch (e) {
        console.warn("初次同步失敗：", e);
      }

      // 之後本機寫入 → 推到雲端
      setRemoteWriter((s) => {
        setDoc(ref, s).catch((e) => console.warn("雲端寫入失敗：", e));
      });

      // 雲端變動 → 鏡像回本機（其他裝置更新時）
      unsubDoc.current = onSnapshot(ref, (d) => {
        if (!d.exists()) return;
        const data = d.data() as ProgressSnapshot;
        applySnapshot({ cards: data.cards ?? {}, quizHistory: data.quizHistory ?? [] });
      });
    });

    return () => {
      unsub();
      unsubDoc.current?.();
      setRemoteWriter(null);
    };
  }, []);

  const signIn = async () => {
    if (!auth) return;
    await signInWithPopup(auth, googleProvider);
  };
  const signOut = async () => {
    if (!auth) return;
    await fbSignOut(auth);
  };

  return (
    <Ctx.Provider value={{ enabled: firebaseEnabled, user, ready, signIn, signOut }}>
      {children}
    </Ctx.Provider>
  );
}
