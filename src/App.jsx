
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { navItems } from "./nav-items";
import { ThemeProvider } from "@/context/ThemeContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { AuthProvider } from "@/context/AuthContext";
import { PasswordAuthProvider, usePasswordAuth } from "@/context/PasswordAuthContext";
import Login from "@/pages/Login";

const queryClient = new QueryClient();

// 主应用内容组件
const AppContent = () => {
  const { isAuthenticated, requiresAuth, isLoading } = usePasswordAuth();

  // 加载中显示loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">正在初始化...</p>
        </div>
      </div>
    );
  }

  // 如果需要认证但未认证，显示登录页
  if (requiresAuth && !isAuthenticated) {
    return <Login />;
  }

  // 否则显示正常应用内容
  return (
    <HashRouter>
      <Routes>
        {navItems.map(({ to, page }) => (
          <Route key={to} path={to} element={page} />
        ))}
      </Routes>
    </HashRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PasswordAuthProvider>
      <AuthProvider>
        <ThemeProvider>
          <SettingsProvider>
            <TooltipProvider>
              <Toaster />
              <AppContent />
            </TooltipProvider>
          </SettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    </PasswordAuthProvider>
  </QueryClientProvider>
);

export default App;

