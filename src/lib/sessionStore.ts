/**
 * sessionStore.ts
 * Simple in-memory session store for admin tokens.
 * Tokens expire after 4 hours.
 */

interface Session {
  createdAt: number;
  expiresAt: number;
}

const store = new Map<string, Session>();

// Cleanup expired sessions every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of store.entries()) {
    if (session.expiresAt < now) {
      store.delete(token);
    }
  }
}, 10 * 60 * 1000);

export const sessionStore = {
  set(token: string, session: Session) {
    store.set(token, session);
  },

  isValid(token: string): boolean {
    const session = store.get(token);
    if (!session) return false;
    if (session.expiresAt < Date.now()) {
      store.delete(token);
      return false;
    }
    return true;
  },

  delete(token: string) {
    store.delete(token);
  },
};
