import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RioCard Planner — controle das suas passagens do curso" },
      {
        name: "description",
        content:
          "Informe o valor recarregado no RioCard e veja quantos dias de aula o saldo cobre e o dia certo de recarregar.",
      },
      { property: "og:title", content: "RioCard Planner — controle das suas passagens do curso" },
      {
        property: "og:description",
        content:
          "Informe o valor recarregado no RioCard e veja quantos dias de aula o saldo cobre e o dia certo de recarregar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const DIAS = ["D", "S", "T", "Q", "Q", "S", "S"];
const STORAGE_KEY = "riocard-planner";

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

function Index() {
  const hoje = new Date();
  const [saldo, setSaldo] = useState("100");
  const [tarifa, setTarifa] = useState("4.70");
  const [viagens, setViagens] = useState("2");
  const [inicio, setInicio] = useState(iso(hoje));
  const [feriados, setFeriados] = useState<string[]>([]);
  const [mesRef, setMesRef] = useState(
    new Date(hoje.getFullYear(), hoje.getMonth(), 1),
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.saldo) setSaldo(s.saldo);
      if (s.tarifa) setTarifa(s.tarifa);
      if (s.viagens) setViagens(s.viagens);
      if (s.inicio) setInicio(s.inicio);
      if (Array.isArray(s.feriados)) setFeriados(s.feriados);
    } catch {
      /* ignora */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ saldo, tarifa, viagens, inicio, feriados }),
    );
  }, [saldo, tarifa, viagens, inicio, feriados]);

  const calc = useMemo(() => {
    const valor = Number(saldo.replace(",", ".")) || 0;
    const preco = Number(tarifa.replace(",", ".")) || 0;
    const qtd = Number(viagens) || 0;
    const custoDia = preco * qtd;

    const [ay, am, ad] = inicio.split("-").map(Number);
    const dataInicio = new Date(ay || 1970, (am || 1) - 1, ad || 1);

    const diasCobertos = custoDia > 0 ? Math.floor(valor / custoDia) : 0;
    const sobra = custoDia > 0 ? valor - diasCobertos * custoDia : valor;

    const cobertos: string[] = [];
    const cursor = new Date(dataInicio);
    let guard = 0;
    while (cobertos.length < diasCobertos && guard < 2000) {
      const dia = cursor.getDay();
      if (dia >= 1 && dia <= 5 && !feriados.includes(iso(cursor))) {
        cobertos.push(iso(cursor));
      }
      cursor.setDate(cursor.getDate() + 1);
      guard++;
    }

    let recarga: string | null = null;
    guard = 0;
    while (!recarga && guard < 2000) {
      const dia = cursor.getDay();
      if (dia >= 1 && dia <= 5 && !feriados.includes(iso(cursor))) {
        recarga = iso(cursor);
      }
      cursor.setDate(cursor.getDate() + 1);
      guard++;
    }

    return {
      custoDia,
      diasCobertos,
      sobra,
      cobertos: new Set(cobertos),
      ultimoDia: cobertos[cobertos.length - 1] ?? null,
      recarga,
      totalGasto: diasCobertos * custoDia,
    };
  }, [saldo, tarifa, viagens, inicio, feriados]);

  const grade = useMemo(() => {
    const ano = mesRef.getFullYear();
    const mes = mesRef.getMonth();
    const primeiro = new Date(ano, mes, 1);
    const total = new Date(ano, mes + 1, 0).getDate();
    const cells: (Date | null)[] = Array.from(
      { length: primeiro.getDay() },
      () => null,
    );
    for (let d = 1; d <= total; d++) cells.push(new Date(ano, mes, d));
    return cells;
  }, [mesRef]);

  const diasAulaNoMes = useMemo(() => {
    let n = 0;
    grade.forEach((d) => {
      if (d && calc.cobertos.has(iso(d))) n++;
    });
    return n;
  }, [grade, calc]);

  const toggleFeriado = (d: Date) => {
    const key = iso(d);
    setFeriados((f) => (f.includes(key) ? f.filter((x) => x !== key) : [...f, key]));
  };

  const mudarMes = (delta: number) =>
    setMesRef((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));

  const formatarData = (s: string | null) => {
    if (!s) return "—";
    const [y, m, d] = s.split("-").map(Number);
    const dt = new Date(y!, (m ?? 1) - 1, d ?? 1);
    return dt.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
  };

  return (
    <main className="min-h-screen px-5 py-10 md:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            RioCard
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl leading-tight md:text-5xl">
            Planejador de passagens do curso
          </h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Aulas de segunda a sexta, das 8h às 12h. Informe quanto você recarregou
            e veja até que dia o saldo dura e quando recarregar de novo.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
          <section className="rounded-2xl border bg-card p-6">
            <h2 className="mb-5 text-lg font-semibold">Seus dados</h2>
            <div className="space-y-4">
              <Campo label="Valor recarregado no mês (R$)">
                <input
                  type="text"
                  inputMode="decimal"
                  value={saldo}
                  onChange={(e) => setSaldo(e.target.value)}
                  className="w-full rounded-lg border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </Campo>
              <Campo label="Valor da passagem (R$)">
                <input
                  type="text"
                  inputMode="decimal"
                  value={tarifa}
                  onChange={(e) => setTarifa(e.target.value)}
                  className="w-full rounded-lg border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </Campo>
              <Campo label="Passagens por dia de aula">
                <select
                  value={viagens}
                  onChange={(e) => setViagens(e.target.value)}
                  className="w-full rounded-lg border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="1">1 (só ida)</option>
                  <option value="2">2 (ida e volta)</option>
                  <option value="3">3</option>
                  <option value="4">4 (2 ônibus por trecho)</option>
                </select>
              </Campo>
              <Campo label="Começar a contar a partir de">
                <input
                  type="date"
                  value={inicio}
                  onChange={(e) => setInicio(e.target.value)}
                  className="w-full rounded-lg border bg-secondary px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </Campo>
            </div>

            <div className="mt-6 space-y-3 border-t pt-5 text-sm">
              <Linha rotulo="Gasto por dia de aula" valor={brl(calc.custoDia)} />
              <Linha rotulo="Dias de aula cobertos" valor={`${calc.diasCobertos} dias`} />
              <Linha rotulo="Total usado" valor={brl(calc.totalGasto)} />
              <Linha rotulo="Sobra no cartão" valor={brl(calc.sobra)} />
            </div>
          </section>

          <section className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Destaque
                titulo="Último dia com saldo"
                valor={formatarData(calc.ultimoDia)}
                tom="ok"
              />
              <Destaque
                titulo="Recarregue até este dia"
                valor={formatarData(calc.recarga)}
                tom="alerta"
              />
            </div>

            <div className="rounded-2xl border bg-card p-6">
              <div className="mb-5 flex items-center justify-between">
                <button
                  onClick={() => mudarMes(-1)}
                  className="rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-secondary"
                >
                  ←
                </button>
                <h2 className="font-[family-name:var(--font-display)] text-xl">
                  {MESES[mesRef.getMonth()]} de {mesRef.getFullYear()}
                </h2>
                <button
                  onClick={() => mudarMes(1)}
                  className="rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-secondary"
                >
                  →
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-muted-foreground">
                {DIAS.map((d, i) => (
                  <div key={i} className="py-1 font-semibold">
                    {d}
                  </div>
                ))}
              </div>

              <div className="mt-1.5 grid grid-cols-7 gap-1.5">
                {grade.map((d, i) => {
                  if (!d) return <div key={i} />;
                  const key = iso(d);
                  const fds = d.getDay() === 0 || d.getDay() === 6;
                  const feriado = feriados.includes(key);
                  const coberto = calc.cobertos.has(key);
                  const recarga = calc.recarga === key;
                  const base =
                    "aspect-square rounded-lg border text-sm flex flex-col items-center justify-center transition-colors";
                  const estilo = recarga
                    ? "bg-destructive text-destructive-foreground border-destructive font-bold"
                    : coberto
                      ? "bg-success text-success-foreground border-success font-semibold"
                      : feriado
                        ? "bg-secondary text-muted-foreground line-through"
                        : fds
                          ? "bg-transparent text-muted-foreground/50"
                          : "bg-secondary/50 text-foreground hover:bg-secondary";
                  return (
                    <button
                      key={i}
                      onClick={() => !fds && toggleFeriado(d)}
                      className={`${base} ${estilo}`}
                      title={fds ? "Fim de semana" : "Clique para marcar como feriado/folga"}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap gap-4 text-xs text-muted-foreground">
                <Legenda cor="bg-success" texto="Dia de aula pago pelo saldo" />
                <Legenda cor="bg-destructive" texto="Dia de recarregar" />
                <Legenda cor="bg-secondary" texto="Feriado/folga (clique no dia)" />
              </div>

              <p className="mt-5 rounded-lg bg-secondary/60 p-3 text-sm text-muted-foreground">
                Neste mês o saldo cobre{" "}
                <span className="font-semibold text-foreground">{diasAulaNoMes}</span>{" "}
                dias de aula.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{rotulo}</span>
      <span className="font-semibold">{valor}</span>
    </div>
  );
}

function Destaque({
  titulo,
  valor,
  tom,
}: {
  titulo: string;
  valor: string;
  tom: "ok" | "alerta";
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        tom === "alerta" ? "border-primary/50 bg-primary/10" : "border-success/40 bg-success/10"
      }`}
    >
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{titulo}</p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-xl capitalize">
        {valor}
      </p>
    </div>
  );
}

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`inline-block h-3 w-3 rounded ${cor}`} />
      {texto}
    </span>
  );
}
