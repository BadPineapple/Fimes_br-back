// frontend/src/components/LoginDialog.jsx
import React from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext"; // <- corrigido (sem 's')
import { useToast } from "../hooks/use-toast";

export default function LoginDialog() {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [captcha, setCaptcha] = React.useState("");
  const [answer, setAnswer] = React.useState(0);
  const [question, setQuestion] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const { login } = useAuth();
  const emailRef = React.useRef(null);

  const gen = React.useCallback(() => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const ops = ["+", "-", "×"];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let ans = a + b, q = `${a} + ${b}`;
    if (op === "-") { ans = Math.max(a, b) - Math.min(a, b); q = `${Math.max(a,b)} - ${Math.min(a,b)}`; }
    if (op === "×") { ans = a * b; q = `${a} × ${b}`; }
    setQuestion(q); setAnswer(ans);
  }, []);

  React.useEffect(() => {
    if (open) {
      gen();
      // foco no e-mail ao abrir
      setTimeout(() => emailRef.current?.focus(), 0);
    } else {
      // limpar ao fechar
      setEmail("");
      setCaptcha("");
    }
  }, [open, gen]);

  const submit = async (e) => {
    e.preventDefault();

    const emailTrim = email.trim();
    const emailOk = /^\S+@\S+\.\S+$/.test(emailTrim);
    if (!emailOk) {
      toast({ title: "E-mail inválido.", duration: 2500 });
      return;
    }

    const cap = Number(captcha);
    if (!Number.isFinite(cap) || cap !== answer) {
      toast({ title: "Verificação incorreta. Tente novamente.", duration: 2500 });
      gen();
      setCaptcha("");
      return;
    }

    setLoading(true);
    try {
      await login(emailTrim);
      setOpen(false);
      setEmail("");
      setCaptcha("");
      toast({ title: "Login efetuado!", duration: 1800 });
    } catch (err) {
      console.error(err);
      toast({ title: "Falha no login.", duration: 2800 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} data-testid="login-button" aria-label="Abrir diálogo de login">
        <User size={18} className="mr-2" /> Entrar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Entrar no Filmes.br</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <Input
              ref={emailRef}
              type="email"
              placeholder="Seu email"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <div className="bg-gray-50 p-4 rounded-md flex items-center gap-3">
              <span className="text-lg font-mono bg-white px-3 py-2 border rounded">{question} = ?</span>
              <Input
                type="number"
                className="w-20"
                value={captcha}
                onChange={(e)=>setCaptcha(e.target.value)}
                required
                inputMode="numeric"
              />
              <Button type="button" variant="outline" size="sm" onClick={gen} aria-label="Gerar novo desafio">
                🔄
              </Button>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
