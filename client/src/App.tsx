import { useState, useCallback, useRef, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload,
  FileText,
  Sparkles,
  Check,
  X,
  ArrowLeft,
  Download,
  Loader2,
  Pencil,
  Shield,
  Scale,
  Mail,
  Github,
  LogOut,
  LogIn,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  FileUp,
  Sun,
  Moon,
} from "lucide-react";
import {
  auth,
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  logout,
  onAuthChange,
} from "./firebase";
import type { User } from "firebase/auth";

const API = "/api";
const SECTIONS = ["summary", "skills", "experience", "projects", "education"] as const;

async function authHeaders(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Dark Mode Hook ──────────────────────────────────────────────────────────

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return [dark, setDark] as const;
}

// ─── Layout ──────────────────────────────────────────────────────────────────

function PageLayout({
  children,
  maxWidth = "max-w-2xl",
}: {
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className={`mx-auto ${maxWidth} space-y-8`}>{children}</div>
  );
}

function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: string }) {
  const steps = [
    { key: "upload", label: "Upload" },
    { key: "processing", label: "Process" },
    { key: "review", label: "Review" },
    { key: "download", label: "Download" },
  ];
  const idx = steps.findIndex((s) => s.key === step);

  return (
    <nav className="flex items-center gap-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          {i > 0 && (
            <div
              className={`h-px w-8 transition-colors duration-300 ${
                i <= idx ? "bg-foreground/30" : "bg-border"
              }`}
            />
          )}
          <div className="flex items-center gap-1.5">
            <div
              className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
                i < idx
                  ? "bg-accent"
                  : i === idx
                  ? "bg-accent scale-125"
                  : "bg-border"
              }`}
            />
            <span
              className={`text-xs font-medium transition-colors duration-300 ${
                i === idx
                  ? "text-foreground"
                  : i < idx
                  ? "text-muted-foreground"
                  : "text-muted-foreground/50"
              }`}
            >
              {s.label}
            </span>
          </div>
        </div>
      ))}
    </nav>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <footer className="border-t border-border/50 mt-auto">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-background">
                <FileText className="h-3.5 w-3.5" />
              </div>
              <span className="font-semibold text-sm">Resume Optimizer</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[240px]">
              AI-powered resume optimization for tech professionals.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Legal
            </h4>
            <ul className="space-y-2.5">
              <li>
                <button
                  onClick={() => onNavigate("privacy")}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center gap-2"
                >
                  <Shield className="h-3 w-3" /> Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate("terms")}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center gap-2"
                >
                  <Scale className="h-3 w-3" /> Terms of Service
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Connect
            </h4>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="mailto:support@airesume.app"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center gap-2"
                >
                  <Mail className="h-3 w-3" /> support@airesume.app
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/airesume"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center gap-2"
                >
                  <Github className="h-3 w-3" /> GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/50">
          <p className="text-[11px] text-center text-muted-foreground/60">
            &copy; {new Date().getFullYear()} AI Resume Optimizer
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Auth Step ──────────────────────────────────────────────────────────────

function AuthStep({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "login") {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password);
      }
      onAuth();
    } catch (err: any) {
      setError(
        err.message?.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/, "") ||
          "Authentication failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      await loginWithGoogle();
      onAuth();
    } catch (err: any) {
      setError(
        err.message?.replace("Firebase: ", "").replace(/\(auth\/.*\)\.?/, "") ||
          "Google sign-in failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout maxWidth="max-w-sm">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "login" ? "Welcome back" : "Get started"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {mode === "login"
            ? "Sign in to optimize your resume."
            : "Create an account to begin."}
        </p>
      </div>

      <Card className="border-border/40 shadow-soft">
        <CardContent className="p-6">
          {error && (
            <div className="mb-5 rounded-xl bg-destructive/5 border border-destructive/10 p-3.5">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex h-11 w-full rounded-xl border border-border bg-transparent px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-foreground/20 transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="flex h-11 w-full rounded-xl border border-border bg-transparent px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-foreground/20 transition-all duration-200"
              />
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              {mode === "login" ? "Sign In" : "Create Account"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/60" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-widest">
              <span className="bg-card px-3 text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full h-11"
            onClick={handleGoogle}
            disabled={loading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </Button>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        {mode === "login" ? (
          <>
            Don't have an account?{" "}
            <button
              onClick={() => {
                setMode("register");
                setError("");
              }}
              className="font-medium text-foreground hover:underline underline-offset-4 transition-colors"
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className="font-medium text-foreground hover:underline underline-offset-4 transition-colors"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </PageLayout>
  );
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

interface ResumeListItem {
  id: string;
  fileName: string;
  status: string;
  createdAt: any;
  updatedAt: any;
  sections: string[];
}

function Dashboard({
  user,
  onResumeSelect,
  onNewResume,
}: {
  user: User;
  onResumeSelect: (id: string) => void;
  onNewResume: () => void;
}) {
  const [resumes, setResumes] = useState<ResumeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchResumes = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const { data } = await axios.get(`${API}/resumes`, { headers });
      setResumes(data.resumes || []);
    } catch (err) {
      console.error("Failed to fetch resumes:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const headers = await authHeaders();
      await axios.delete(`${API}/resumes/${id}`, { headers });
      setResumes((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to delete resume:", err);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (ts: any) => {
    if (!ts) return "";
    const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <PageLayout maxWidth="max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            {user.displayName || user.email?.split("@")[0]}
          </h1>
          <p className="text-sm text-muted-foreground">
            Your optimized resumes.
          </p>
        </div>
        <Button onClick={onNewResume} size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
        </div>
      ) : resumes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary mb-4">
            <FileUp className="h-6 w-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium mb-1">No resumes yet</p>
          <p className="text-xs text-muted-foreground mb-5 max-w-[240px]">
            Upload your first resume to get AI-powered suggestions.
          </p>
          <Button onClick={onNewResume} size="sm" variant="outline" className="gap-1.5">
            <Upload className="h-3.5 w-3.5" /> Upload
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {resumes.map((resume) => (
            <div
              key={resume.id}
              onClick={() => onResumeSelect(resume.id)}
              className="group flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-card p-4 cursor-pointer transition-all duration-200 hover:border-border hover:shadow-soft"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary shrink-0 transition-colors group-hover:bg-secondary/80">
                  <FileText className="h-4 w-4 text-muted-foreground/60" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{resume.fileName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {resume.createdAt && (
                      <>
                        <Clock className="h-3 w-3 text-muted-foreground/40" />
                        <p className="text-[11px] text-muted-foreground/60">
                          {formatDate(resume.createdAt)}
                        </p>
                      </>
                    )}
                    {resume.sections.length > 0 && (
                      <span className="text-[11px] text-muted-foreground/40">
                        {resume.sections.length} sections
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {resume.status === "completed" ? (
                  <Badge variant="success">
                    <CheckCircle2 className="mr-1 h-2.5 w-2.5" />
                    done
                  </Badge>
                ) : resume.status === "processed" ? (
                  <Badge variant="secondary">processed</Badge>
                ) : (
                  <Badge variant="outline">{resume.status}</Badge>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(resume.id);
                  }}
                  disabled={deleting === resume.id}
                  className="p-1.5 rounded-lg text-muted-foreground/30 hover:text-destructive hover:bg-destructive/5 transition-all duration-200 opacity-0 group-hover:opacity-100"
                >
                  {deleting === resume.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageLayout>
  );
}

// ─── Upload Step ─────────────────────────────────────────────────────────────

function UploadStep({ onComplete }: { onComplete: (file: File, data: any) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    if (f.type !== "application/pdf") {
      setError("Only PDF files are accepted.");
      return;
    }
    setError("");
    setFile(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    const form = new FormData();
    form.append("resume", file);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const { data } = await axios.post(`${API}/resume/upload`, form, {
        headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
      });
      onComplete(file, data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout maxWidth="max-w-lg">
      <PageHeader
        title="Upload resume"
        description="Drop a PDF and we'll extract and optimize each section."
      />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-14 transition-all duration-300 ${
          dragActive
            ? "border-accent bg-accent/5 scale-[1.01]"
            : file
            ? "border-foreground/15 bg-secondary/30"
            : "border-border hover:border-foreground/20 hover:bg-secondary/20"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors duration-300 mb-5 ${
            dragActive ? "bg-accent/10" : "bg-secondary"
          }`}
        >
          {file ? (
            <FileText className="h-6 w-6 text-foreground/60" />
          ) : (
            <Upload className="h-6 w-6 text-muted-foreground/40" />
          )}
        </div>
        {file ? (
          <div className="text-center">
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Drag & drop or{" "}
              <span className="font-medium text-foreground">browse</span>
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1.5">
              PDF only, max 5 MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-destructive/5 border border-destructive/10 p-3.5">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={handleUpload}
          disabled={!file || loading}
          className="flex-1 h-11"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {loading ? "Uploading..." : "Upload & Extract"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setFile(null);
            setError("");
          }}
          className="h-11"
        >
          Reset
        </Button>
      </div>
    </PageLayout>
  );
}

// ─── Processing Step ─────────────────────────────────────────────────────────

function ProcessingStep({ onComplete }: { onComplete: () => void }) {
  const calledRef = useRef(false);

  useEffect(() => {
    if (!calledRef.current) {
      calledRef.current = true;
      onComplete();
    }
  }, [onComplete]);

  return (
    <PageLayout maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center py-16 space-y-8">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-secondary">
            <Sparkles className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <div className="absolute -inset-3 rounded-[2rem] border border-accent/20 animate-ping" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-tight">Processing</h2>
          <p className="text-sm text-muted-foreground max-w-[280px]">
            Analyzing and optimizing all sections in parallel.
          </p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-1 w-6 rounded-full bg-accent/20 animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    </PageLayout>
  );
}

// ─── Section Card ────────────────────────────────────────────────────────────

function SectionCard({
  sectionKey,
  data,
  onAccept,
  onReject,
  onEdit,
  isAccepted,
  isRejected,
}: {
  sectionKey: string;
  data: any;
  onAccept: (key: string) => void;
  onReject: (key: string) => void;
  onEdit: (key: string, text: string) => void;
  isAccepted: boolean;
  isRejected: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const displayText =
    typeof data.edited === "string"
      ? data.edited
      : typeof data.edited === "object"
      ? JSON.stringify(data.edited, null, 2)
      : String(data.edited || "");
  const [draft, setDraft] = useState(displayText);

  const handleSave = () => {
    onEdit(sectionKey, draft);
    setEditing(false);
  };

  return (
    <Card
      className={`transition-all duration-200 ${
        isAccepted
          ? "border-emerald-200 dark:border-emerald-800/50"
          : isRejected
          ? "border-red-200/50 dark:border-red-800/30"
          : ""
      }`}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base capitalize">{sectionKey}</CardTitle>
          <div className="flex items-center gap-2">
            {isAccepted && (
              <Badge variant="success">Accepted</Badge>
            )}
            {isRejected && (
              <Badge variant="destructive">Rejected</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl bg-secondary/50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2">
            Original
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {data.original || "\u2014"}
          </p>
        </div>

        <div
          className={`rounded-xl p-4 transition-colors duration-200 ${
            isAccepted
              ? "bg-emerald-50/50 border border-emerald-200/50 dark:bg-emerald-900/5 dark:border-emerald-800/30"
              : isRejected
              ? "bg-red-50/30 border border-red-200/30 dark:bg-red-900/5 dark:border-red-800/20"
              : "bg-secondary/30 border border-border/30"
          }`}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-2">
            {editing ? "Editing" : "Suggested"}
          </p>
          {editing ? (
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={6}
              className="text-sm border-border/40"
            />
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {draft || data.edited}
            </p>
          )}
        </div>

        {data.reasoning && (
          <div className="rounded-xl bg-amber-50/50 border border-amber-200/40 p-4 dark:bg-amber-900/5 dark:border-amber-800/20">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400/70 mb-1.5">
              Why this change
            </p>
            <p className="text-sm text-amber-800/80 dark:text-amber-300/70 leading-relaxed">
              {data.reasoning}
            </p>
          </div>
        )}

        {data.suggestions?.length > 0 && (
          <div className="rounded-xl bg-blue-50/50 border border-blue-200/40 p-4 dark:bg-blue-900/5 dark:border-blue-800/20">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400/70 mb-2">
              Tips
            </p>
            <ul className="space-y-1.5">
              {data.suggestions.map((tip: string, i: number) => (
                <li
                  key={i}
                  className="text-sm text-blue-800/80 dark:text-blue-300/70 flex gap-2.5 leading-relaxed"
                >
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-blue-400/60 shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {editing ? (
            <>
              <Button size="sm" onClick={handleSave} className="gap-1">
                <Check className="h-3 w-3" /> Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDraft(data.edited || "");
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              {!isAccepted && !isRejected && (
                <>
                  <Button size="sm" onClick={() => onAccept(sectionKey)} className="gap-1">
                    <Check className="h-3 w-3" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onReject(sectionKey)}
                    className="gap-1 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" /> Reject
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(true)}
                className="gap-1 ml-auto"
              >
                <Pencil className="h-3 w-3" /> Edit
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Review Step ─────────────────────────────────────────────────────────────

function ReviewStep({
  suggestions,
  onAccept,
  onReject,
  onEdit,
  onAcceptAll,
  onGenerate,
  accepted,
  rejected,
}: {
  suggestions: any;
  onAccept: (key: string) => void;
  onReject: (key: string) => void;
  onEdit: (key: string, text: string) => void;
  onAcceptAll: () => void;
  onGenerate: () => void;
  accepted: Record<string, boolean>;
  rejected: Record<string, boolean>;
}) {
  const sections = SECTIONS.filter((k) => suggestions[k]);
  const acceptedCount = sections.filter((k) => accepted[k]).length;
  const allDone =
    sections.length > 0 && sections.every((k) => accepted[k] || rejected[k]);

  return (
    <PageLayout maxWidth="max-w-2xl">
      <PageHeader
        title="Review"
        description={`${acceptedCount}/${sections.length} sections accepted`}
        action={
          <div className="flex gap-2">
            {!allDone && (
              <Button variant="outline" size="sm" onClick={onAcceptAll}>
                Accept All
              </Button>
            )}
            <Button onClick={onGenerate} disabled={!allDone} size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Generate
            </Button>
          </div>
        }
      />

      <div className="space-y-4">
        {sections.map((key) => (
          <SectionCard
            key={key}
            sectionKey={key}
            data={suggestions[key]}
            onAccept={onAccept}
            onReject={onReject}
            onEdit={onEdit}
            isAccepted={!!accepted[key]}
            isRejected={!!rejected[key]}
          />
        ))}
      </div>
    </PageLayout>
  );
}

// ─── Download Step ───────────────────────────────────────────────────────────

function DownloadStep({
  resumeData,
  resumeId,
  onBack,
  onDone,
}: {
  resumeData: any;
  resumeId: string | null;
  onBack: () => void;
  onDone: () => void;
}) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
        const doc = await PDFDocument.create();
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const bold = await doc.embedFont(StandardFonts.HelveticaBold);
        let page = doc.addPage([612, 792]);
        let y = 752;

        const sections = [
          { key: "summary", label: "PROFESSIONAL SUMMARY" },
          { key: "skills", label: "SKILLS" },
          { key: "experience", label: "EXPERIENCE" },
          { key: "projects", label: "PROJECTS" },
          { key: "education", label: "EDUCATION" },
        ];

        const sanitize = (s: string) =>
          s.replace(/[^\x20-\x7E\n\t]/g, (c) => {
            const map: Record<string, string> = {
              "\u2013": "-",
              "\u2014": "-",
              "\u2018": "'",
              "\u2019": "'",
              "\u201C": '"',
              "\u201D": '"',
              "\u2022": "-",
              "\u2026": "...",
              "\u00A0": " ",
            };
            return map[c] || "?";
          });

        for (const s of sections) {
          const text = resumeData[s.key];
          if (!text) continue;
          if (y < 100) {
            page = doc.addPage([612, 792]);
            y = 752;
          }
          y -= 10;
          page.drawText(s.label, {
            x: 50,
            y,
            size: 11,
            font: bold,
            color: rgb(0.2, 0.4, 0.7),
          });
          y -= 16;
          page.drawText("-".repeat(60), {
            x: 50,
            y,
            size: 8,
            font,
            color: rgb(0.7, 0.7, 0.7),
          });
          y -= 14;
          for (const line of sanitize(String(text)).split("\n")) {
            const words = line.split(" ");
            let cur = "";
            for (const w of words) {
              const test = cur ? cur + " " + w : w;
              if (font.widthOfTextAtSize(test, 10) > 512 && cur) {
                if (y < 60) {
                  page = doc.addPage([612, 792]);
                  y = 752;
                }
                page.drawText(cur, {
                  x: 50,
                  y,
                  size: 10,
                  font,
                  color: rgb(0.1, 0.1, 0.1),
                });
                y -= 14;
                cur = w;
              } else {
                cur = test;
              }
            }
            if (cur) {
              if (y < 60) {
                page = doc.addPage([612, 792]);
                y = 752;
              }
              page.drawText(cur, {
                x: 50,
                y,
                size: 10,
                font,
                color: rgb(0.1, 0.1, 0.1),
              });
              y -= 14;
            }
          }
        }

        const bytes = await doc.save();
        if (!cancelled) {
          const blob = new Blob([bytes], { type: "application/pdf" });
          setPdfUrl(URL.createObjectURL(blob));
        }
      } catch (e: any) {
        console.error("PDF generation failed:", e);
        setError(e.message || "Failed to generate PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resumeData]);

  const handleDownload = async () => {
    if (!pdfUrl) return;
    if (resumeId) {
      try {
        const headers = await authHeaders();
        await axios.put(
          `${API}/resumes/${resumeId}/final`,
          { finalData: resumeData },
          { headers }
        );
      } catch (err) {
        console.error("Failed to save final resume:", err);
      }
    }
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `resume-${Date.now()}.pdf`;
    a.click();
  };

  return (
    <PageLayout maxWidth="max-w-4xl">
      <PageHeader
        title="Preview"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack} size="sm" className="gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
            <Button onClick={handleDownload} disabled={!pdfUrl} size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
            <Button variant="ghost" onClick={onDone} size="sm">
              Done
            </Button>
          </div>
        }
      />

      <div className="rounded-2xl border border-border/40 bg-secondary/20 overflow-hidden" style={{ height: "70vh" }}>
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/30" />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center p-8">
            <div className="text-center space-y-3">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={onBack}>
                Go Back
              </Button>
            </div>
          </div>
        ) : pdfUrl ? (
          <iframe src={pdfUrl} className="w-full h-full" title="PDF Preview" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Failed to generate PDF
          </div>
        )}
      </div>
    </PageLayout>
  );
}

// ─── Legal Pages ─────────────────────────────────────────────────────────────

const privacyContent = {
  title: "Privacy Policy",
  lastUpdated: "January 15, 2025",
  sections: [
    {
      heading: "1. Information We Collect",
      paragraphs: [
        "When you use AI Resume Optimizer, we collect the following information:",
        "Resume Content: The text and structure of your resume PDF that you upload for optimization. This includes your name, contact information, work experience, education, skills, and any other information contained in your resume.",
        "Usage Data: Information about how you interact with our service, including pages visited, features used, and actions taken within the application.",
        "Account Information: If you create an account, we collect your email address and authentication credentials.",
      ],
    },
    {
      heading: "2. How We Use Your Information",
      paragraphs: [
        "We use your information for the following purposes:",
        "To process and optimize your resume using AI technology.",
        "To provide you with personalized suggestions and improvements for your resume.",
        "To generate PDF versions of your optimized resume.",
        "To improve our service and develop new features.",
        "To communicate with you about your account or our service.",
      ],
    },
    {
      heading: "3. Data Storage and Security",
      paragraphs: [
        "Your resume data is processed on our servers and is not stored permanently after your session ends. We implement industry-standard security measures to protect your information during transmission and processing.",
        "We use encrypted connections (HTTPS) for all data transfers. Your resume content is processed in memory and is deleted after processing is complete.",
      ],
    },
    {
      heading: "4. Third-Party Services",
      paragraphs: [
        "We use the following third-party services to provide our functionality:",
        "OpenRouter API: For AI-powered resume analysis and optimization.",
        "Firebase: For user authentication and account management.",
        "These services may collect information as described in their respective privacy policies.",
      ],
    },
    {
      heading: "5. Data Sharing",
      paragraphs: [
        "We do not sell, trade, or otherwise transfer your personal information to third parties. Your resume data is only shared with the AI processing service for the sole purpose of optimization.",
        "We may disclose information if required by law or to protect our rights and safety.",
      ],
    },
    {
      heading: "6. Your Rights",
      paragraphs: [
        "You have the right to:",
        "Access the personal information we hold about you.",
        "Request deletion of your data.",
        "Opt out of non-essential data collection.",
        "Request a copy of your data in a portable format.",
        "To exercise these rights, please contact us at the email address below.",
      ],
    },
    {
      heading: "7. Children's Privacy",
      paragraphs: [
        "Our service is not intended for users under the age of 13. We do not knowingly collect information from children under 13.",
      ],
    },
    {
      heading: "8. Changes to This Policy",
      paragraphs: [
        "We may update this privacy policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the 'Last updated' date.",
      ],
    },
    {
      heading: "9. Contact Us",
      paragraphs: [
        "If you have questions about this privacy policy, please contact us at:",
        "Email: privacy@airesume.app",
      ],
    },
  ],
};

const termsContent = {
  title: "Terms of Service",
  lastUpdated: "January 15, 2025",
  sections: [
    {
      heading: "1. Acceptance of Terms",
      paragraphs: [
        "By accessing or using AI Resume Optimizer ('the Service'), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.",
      ],
    },
    {
      heading: "2. Description of Service",
      paragraphs: [
        "AI Resume Optimizer provides AI-powered resume analysis and optimization. The Service extracts content from your resume PDF, processes it using artificial intelligence, and provides suggestions for improvement.",
        "The Service is provided 'as is' and 'as available' without warranties of any kind.",
      ],
    },
    {
      heading: "3. User Responsibilities",
      paragraphs: [
        "You are responsible for:",
        "Ensuring the accuracy of the information in your resume.",
        "Reviewing all AI-generated suggestions before using them.",
        "Maintaining the confidentiality of your account credentials.",
        "Not using the Service for any unlawful or prohibited purpose.",
      ],
    },
    {
      heading: "4. Intellectual Property",
      paragraphs: [
        "You retain full ownership of your resume content and any optimized versions generated through the Service. We claim no rights over your resume data.",
        "The Service itself, including its design, code, and features, is owned by AI Resume Optimizer and protected by intellectual property laws.",
      ],
    },
    {
      heading: "5. AI-Generated Content",
      paragraphs: [
        "The Service uses artificial intelligence to generate resume suggestions. Please note:",
        "AI suggestions are recommendations and should be reviewed for accuracy.",
        "We do not guarantee the accuracy or completeness of AI-generated content.",
        "You are solely responsible for the final content of your resume.",
        "AI outputs may vary and are not guaranteed to be consistent across sessions.",
      ],
    },
    {
      heading: "6. Limitation of Liability",
      paragraphs: [
        "In no event shall AI Resume Optimizer be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Service.",
        "Our total liability shall not exceed the amount you paid for the Service in the twelve months preceding the claim.",
      ],
    },
    {
      heading: "7. Termination",
      paragraphs: [
        "We reserve the right to terminate or suspend your access to the Service at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users or the Service.",
      ],
    },
    {
      heading: "8. Changes to Terms",
      paragraphs: [
        "We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the updated Terms on this page. Your continued use of the Service after changes constitutes acceptance of the new Terms.",
      ],
    },
    {
      heading: "9. Contact",
      paragraphs: [
        "For questions about these Terms, contact us at:",
        "Email: legal@airesume.app",
      ],
    },
  ],
};

function LegalPage({
  type,
  onBack,
}: {
  type: "privacy" | "terms";
  onBack: () => void;
}) {
  const content = type === "privacy" ? privacyContent : termsContent;

  return (
    <PageLayout maxWidth="max-w-2xl">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">{content.title}</h1>
          <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
        </div>
        <p className="text-xs text-muted-foreground/60">
          Last updated: {content.lastUpdated}
        </p>
      </div>

      <div className="space-y-8">
        {content.sections.map((section, i) => (
          <div key={i} className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">{section.heading}</h2>
            {section.paragraphs.map((p, j) => (
              <p key={j} className="text-sm text-muted-foreground leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        ))}
      </div>
    </PageLayout>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [dark, setDark] = useDarkMode();
  const [page, setPage] = useState<"app" | "privacy" | "terms">("app");
  const [step, setStep] = useState("dashboard");
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [extractedChunks, setExtractedChunks] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [editedData, setEditedData] = useState<Record<string, string>>({});
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [rejected, setRejected] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthChange((u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await logout();
    handleReset();
  };

  const handleNewResume = useCallback(() => {
    setStep("upload");
  }, []);

  const handleResumeSelect = useCallback(async (id: string) => {
    try {
      const headers = await authHeaders();
      const { data } = await axios.get(`${API}/resumes/${id}`, { headers });
      setResumeId(id);
      if (data.suggestions) {
        setSuggestions(data.suggestions);
        setStep("review");
      } else if (data.chunks) {
        setExtractedChunks(data.chunks);
        setStep("processing");
      } else {
        setStep("upload");
      }
    } catch (err) {
      setError("Failed to load resume");
    }
  }, []);

  const handleUploadComplete = useCallback((file: File, data: any) => {
    setResumeId(data.resumeId || null);
    setExtractedChunks(data.chunks || data);
    setStep("processing");
  }, []);

  const handleProcessingComplete = useCallback(async () => {
    try {
      setError("");
      const headers = await authHeaders();
      const { data } = await axios.post(
        `${API}/resume/process`,
        { chunks: extractedChunks, resumeId },
        { headers, timeout: 120000 }
      );
      setResumeId(data.resumeId || resumeId);

      const sugg = data.suggestions || data;
      const hasContent = Object.keys(sugg).some((k) => sugg[k]?.edited);

      if (hasContent) {
        setSuggestions(sugg);
        setStep("review");
      } else {
        const fallback: Record<string, any> = {};
        for (const [key, text] of Object.entries(extractedChunks || {})) {
          if (text && typeof text === "string" && text.trim().length > 0) {
            fallback[key] = {
              original: text,
              edited: text,
              suggestions: [],
              reasoning: "",
            };
          }
        }
        setSuggestions(fallback);
        setStep("review");
      }
    } catch (err: any) {
      console.error("Processing failed:", err);
      const fallback: Record<string, any> = {};
      for (const [key, text] of Object.entries(extractedChunks || {})) {
        if (text && typeof text === "string" && text.trim().length > 0) {
          fallback[key] = {
            original: text,
            edited: text,
            suggestions: [],
            reasoning: "",
          };
        }
      }
      if (Object.keys(fallback).length > 0) {
        setSuggestions(fallback);
        setStep("review");
      } else {
        const msg =
          err.code === "ECONNABORTED"
            ? "Request timed out. Try again."
            : err.response?.data?.error || err.message;
        setError(msg);
        setStep("upload");
      }
    }
  }, [extractedChunks, resumeId]);

  const handleAccept = useCallback(
    (key: string) => {
      setAccepted((p) => ({ ...p, [key]: true }));
      setRejected((p) => ({ ...p, [key]: false }));
      if (suggestions?.[key]) {
        setEditedData((p) => ({ ...p, [key]: suggestions[key].edited }));
      }
    },
    [suggestions]
  );

  const handleReject = useCallback(
    (key: string) => {
      setRejected((p) => ({ ...p, [key]: true }));
      setAccepted((p) => ({ ...p, [key]: false }));
      if (suggestions?.[key]) {
        setEditedData((p) => ({
          ...p,
          [key]: suggestions[key].original || "",
        }));
      }
    },
    [suggestions]
  );

  const handleEdit = useCallback((key: string, text: string) => {
    setEditedData((p) => ({ ...p, [key]: text }));
    setAccepted((p) => ({ ...p, [key]: true }));
    setRejected((p) => ({ ...p, [key]: false }));
  }, []);

  const handleAcceptAll = useCallback(() => {
    if (!suggestions) return;
    const a: Record<string, boolean> = {};
    const e: Record<string, string> = {};
    SECTIONS.forEach((k) => {
      if (suggestions[k]) {
        a[k] = true;
        e[k] = suggestions[k].edited;
      }
    });
    setAccepted(a);
    setRejected({});
    setEditedData((p) => ({ ...p, ...e }));
  }, [suggestions]);

  const handleGenerate = useCallback(() => {
    const final: Record<string, string> = {};
    SECTIONS.forEach((k) => {
      if (suggestions?.[k]) {
        final[k] = editedData[k] || suggestions[k].edited;
      }
    });
    setEditedData(final);
    setStep("download");
  }, [suggestions, editedData]);

  const handleReset = () => {
    setStep("dashboard");
    setResumeId(null);
    setExtractedChunks(null);
    setSuggestions(null);
    setEditedData({});
    setAccepted({});
    setRejected({});
    setError("");
  };

  const handleDone = () => {
    handleReset();
  };

  const handleNavigate = (p: string) => {
    setPage(p as any);
    window.scrollTo(0, 0);
  };

  const showStepIndicator = step !== "dashboard" && step !== "auth";

  // Legal pages
  if (page === "privacy" || page === "terms") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
            <button
              onClick={() => handleNavigate("app")}
              className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-background">
                <FileText className="h-3.5 w-3.5" />
              </div>
              <span className="font-semibold text-sm">Resume Optimizer</span>
            </button>
          </div>
        </header>
        <main className="flex-1 px-6 py-10">
          <LegalPage type={page} onBack={() => handleNavigate("app")} />
        </main>
        <Footer onNavigate={handleNavigate} />
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/30" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-background">
                <FileText className="h-3.5 w-3.5" />
              </div>
              <span className="font-semibold text-sm">Resume Optimizer</span>
            </div>
            <button
              onClick={() => setDark(!dark)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-200"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>
        <main className="flex-1 px-6 py-10 flex items-center justify-center">
          <AuthStep onAuth={() => {}} />
        </main>
        <Footer onNavigate={handleNavigate} />
      </div>
    );
  }

  // Main app
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
          <button
            onClick={handleReset}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-foreground text-background">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-sm">Resume Optimizer</span>
          </button>

          {showStepIndicator && <StepIndicator step={step} />}

          <div className="flex items-center gap-1">
            <button
              onClick={() => setDark(!dark)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-200"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {step !== "dashboard" && (
              <Button variant="ghost" size="sm" onClick={handleReset}>
                Dashboard
              </Button>
            )}
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-200"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-auto max-w-4xl px-6 pt-4 w-full">
          <div className="rounded-xl bg-destructive/5 border border-destructive/10 p-3.5 flex items-center justify-between">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={() => setError("")}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 px-6 py-8">
        {step === "dashboard" && (
          <Dashboard
            user={user}
            onResumeSelect={handleResumeSelect}
            onNewResume={handleNewResume}
          />
        )}
        {step === "upload" && <UploadStep onComplete={handleUploadComplete} />}
        {step === "processing" && (
          <ProcessingStep onComplete={handleProcessingComplete} />
        )}
        {step === "review" && (
          <ReviewStep
            suggestions={suggestions || {}}
            onAccept={handleAccept}
            onReject={handleReject}
            onEdit={handleEdit}
            onAcceptAll={handleAcceptAll}
            onGenerate={handleGenerate}
            accepted={accepted}
            rejected={rejected}
          />
        )}
        {step === "download" && (
          <DownloadStep
            resumeData={editedData}
            resumeId={resumeId}
            onBack={() => setStep("review")}
            onDone={handleDone}
          />
        )}
      </main>

      <Footer onNavigate={handleNavigate} />
    </div>
  );
}
