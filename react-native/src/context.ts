import { createContext, useContext } from "react";
import type { AuthContextValue } from "./types";

export const HelloJohnContext = createContext<AuthContextValue | null>(null);

export function useHelloJohnContext(): AuthContextValue {
  const context = useContext(HelloJohnContext);
  if (!context) {
    throw new Error("[HelloJohn] useAuth() debe usarse dentro de <HelloJohnProvider>.");
  }
  return context;
}
