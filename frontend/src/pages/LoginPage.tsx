import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginBackground3D } from "../components/chat/LoginBackground3D";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const { user, login, register } = useAuth();

  const navigate = useNavigate();

  // 监听登录状态，如果已登录则跳回主页
  useEffect(() => {
    if (user) {
      navigate("/", { viewTransition: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (isRegister) {
        await register(email, password);
        setError("注册成功！请检查邮箱验证链接。");
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* 3D 背景层: 从透明度 0 缓慢淡入，更长的时间给予震撼感 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      >
        <LoginBackground3D />
      </motion.div>

      {/* 登录卡片层，zIndex 保证在最上层，带有缩放和上浮淡入的动画 */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: 0.6,
          delay: 0.3,
          type: "spring",
          stiffness: 100,
          damping: 20,
        }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="w-full bg-card/50 border-border backdrop-blur-md shadow-2xl">
          <CardHeader className="text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
              transition={{ delay: 0.8, type: "spring", damping: 10 }}
              className="mx-auto w-16 h-12 flex items-center justify-center"
              style={{ viewTransitionName: "app-logo" }}
            >
              <Logo size={60} />
            </motion.div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Pulse AI
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-1">
                {isRegister ? "创建新账户" : "登录到您的账户"}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    error.includes("成功")
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-destructive/10 text-destructive border border-destructive/20"
                  }`}
                >
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Input
                  type="email"
                  placeholder="邮箱地址"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 bg-background/50 border-border text-foreground placeholder:text-muted-foreground focus:ring-emerald-500/20 focus:border-emerald-500/50"
                />
              </div>

              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-11 bg-background/50 border-border text-foreground placeholder:text-muted-foreground focus:ring-emerald-500/20 focus:border-emerald-500/50"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : isRegister ? (
                  "注册"
                ) : (
                  "登录"
                )}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                {isRegister ? (
                  <>
                    已有账户？{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegister(false);
                        setError("");
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      登录
                    </button>
                  </>
                ) : (
                  <>
                    没有账户？{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegister(true);
                        setError("");
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      注册
                    </button>
                  </>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
