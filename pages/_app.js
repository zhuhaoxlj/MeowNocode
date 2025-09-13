import '../src/index.css';
import { useEffect, useState } from 'react';
import { Toaster } from "../src/components/ui/sonner";
import { TooltipProvider } from "../src/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "../src/context/ThemeContext";
import { SettingsProvider } from "../src/context/SettingsContext";
import { MusicProvider } from "../src/context/MusicContext";
import { AuthProvider } from "../src/context/AuthContext";
import { PasswordAuthProvider } from "../src/context/PasswordAuthContext";

const queryClient = new QueryClient();

export default function App({ Component, pageProps }) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return null;
  }
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <PasswordAuthProvider>
          <AuthProvider>
            <SettingsProvider>
              <MusicProvider>
                <TooltipProvider>
                  <Component {...pageProps} />
                  <Toaster />
                </TooltipProvider>
              </MusicProvider>
            </SettingsProvider>
          </AuthProvider>
        </PasswordAuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
