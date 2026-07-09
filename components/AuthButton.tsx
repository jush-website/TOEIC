"use client";

import { useState } from "react";
import { useSync } from "./SyncProvider";

export function AuthButton() {
  const { enabled, user, ready, signIn, signOut } = useSync();
  const [busy, setBusy] = useState(false);

  if (!ready) return null;

  // Firebase 未設定：不靜默隱藏，顯示提示讓使用者知道如何啟用
  if (!enabled) {
    return (
      <span
        title="尚未設定 Firebase。把 .env.local.example 複製成 .env.local 並填入 Firebase 設定、重啟伺服器後，即可用 Google 帳號登入同步。"
        className="cursor-help rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted"
      >
        登入同步<span className="hidden sm:inline">（未設定）</span>
      </span>
    );
  }

  const click = async () => {
    setBusy(true);
    try {
      if (user) await signOut();
      else await signIn();
    } catch {
      /* 使用者取消或失敗，忽略 */
    } finally {
      setBusy(false);
    }
  };

  if (user) {
    return (
      <button
        onClick={click}
        disabled={busy}
        title="點擊登出"
        className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-xs text-cream-dim transition-colors hover:border-cream-dim hover:text-cream"
      >
        <span className="grid h-5 w-5 place-items-center rounded-full bg-gold/20 text-[10px] text-gold">
          {(user.displayName ?? user.email ?? "?").slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-[8rem] truncate sm:inline">{user.displayName ?? user.email}</span>
        <span className="text-teal">●</span>
      </button>
    );
  }

  return (
    <button
      onClick={click}
      disabled={busy}
      className="rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-gold transition-colors hover:bg-gold/20"
    >
      {busy ? "登入中…" : "登入同步"}
    </button>
  );
}
