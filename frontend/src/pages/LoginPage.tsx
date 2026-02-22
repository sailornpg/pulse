import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const { user, login, register } = useAuth();

  if (user) {
    return null;
  }

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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/5 via-zinc-950 to-zinc-950" />
      
      <Card className="w-full max-w-md bg-zinc-900/50 border-zinc-800 backdrop-blur-sm relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <Sparkles size={24} className="text-emerald-500" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-zinc-100">Pulse AI</CardTitle>
            <CardDescription className="text-zinc-500 mt-1">
              {isRegister ? "创建新账户" : "登录到您的账户"}
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className={`p-3 rounded-lg text-sm ${
                error.includes("成功") 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}>
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
                className="h-11 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:ring-emerald-500/20 focus:border-emerald-500/50"
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
                className="h-11 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus:ring-emerald-500/20 focus:border-emerald-500/50"
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

            <div className="text-center text-sm text-zinc-500">
              {isRegister ? (
                <>
                  已有账户？{" "}
                  <button
                    type="button"
                    onClick={() => { setIsRegister(false); setError(""); }}
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
                    onClick={() => { setIsRegister(true); setError(""); }}
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
    </div>
  );
}
