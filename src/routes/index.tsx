import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, ChevronLeft, ChevronRight, CircleDollarSign, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logoAsset from "@/assets/riocard-mais-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Planejador de passagens — RioCard Mais" },
      { name: "description", content: "Calcule quantos dias de curso seu saldo cobre e descubra a data da próxima recarga." },
      { property: "og:title", content: "Planejador de passagens — RioCard Mais" },
      { property: "og:description", content: "Organize seu saldo, seus dias de curso e a próxima recarga em um calendário simples." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS = ["D", "S", "T", "Q", "Q", "S", "S"];
const STORAGE_KEY = "riocard-planner";
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function Index() {
  const hoje = new Date();
  const [saldo, setSaldo] = useState("100");
  const [tarifa, setTarifa] = useState("4.70");
  const [viagens, setViagens] = useState("2");
  const [inicio, setInicio] = useState(iso(hoje));
  const [feriados, setFeriados] = useState<string[]>([]);
  const [aba, setAba] = useState("dados");
  const [mesRef, setMesRef] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1));

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const salvo = JSON.parse(raw);
      if (salvo.saldo) setSaldo(salvo.saldo);
      if (salvo.tarifa) setTarifa(salvo.tarifa);
      if (salvo.viagens) setViagens(salvo.viagens);
      if (salvo.inicio) setInicio(salvo.inicio);
      if (Array.isArray(salvo.feriados)) setFeriados(salvo.feriados);
    } catch { /* mantém os valores iniciais */ }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ saldo, tarifa, viagens, inicio, feriados }));
  }, [saldo, tarifa, viagens, inicio, feriados]);

  const calc = useMemo(() => {
    const valor = Number(saldo.replace(",", ".")) || 0;
    const preco = Number(tarifa.replace(",", ".")) || 0;
    const custoDia = preco * (Number(viagens) || 0);
    const partesInicio = inicio.split("-").map(Number);
    const dataInicio = new Date(partesInicio[0] || 1970, (partesInicio[1] || 1) - 1, partesInicio[2] || 1);
    const diasCobertos = custoDia > 0 ? Math.floor(valor / custoDia) : 0;
    const sobra = custoDia > 0 ? valor - diasCobertos * custoDia : valor;
    const cobertos: string[] = [];
    const cursor = new Date(dataInicio);
    let guard = 0;
    while (cobertos.length < diasCobertos && guard < 2000) {
      if (cursor.getDay() >= 1 && cursor.getDay() <= 5 && !feriados.includes(iso(cursor))) cobertos.push(iso(cursor));
      cursor.setDate(cursor.getDate() + 1);
      guard++;
    }
    let recarga: string | null = null;
    guard = 0;
    while (!recarga && guard < 2000) {
      if (cursor.getDay() >= 1 && cursor.getDay() <= 5 && !feriados.includes(iso(cursor))) recarga = iso(cursor);
      cursor.setDate(cursor.getDate() + 1);
      guard++;
    }
    return { custoDia, diasCobertos, sobra, cobertos: new Set(cobertos), ultimoDia: cobertos.at(-1) ?? null, recarga, totalGasto: diasCobertos * custoDia };
  }, [saldo, tarifa, viagens, inicio, feriados]);

  const grade = useMemo(() => {
    const ano = mesRef.getFullYear();
    const mes = mesRef.getMonth();
    const cells: (Date | null)[] = Array.from({ length: new Date(ano, mes, 1).getDay() }, () => null);
    for (let dia = 1; dia <= new Date(ano, mes + 1, 0).getDate(); dia++) cells.push(new Date(ano, mes, dia));
    return cells;
  }, [mesRef]);

  const diasAulaNoMes = grade.filter((d) => d && calc.cobertos.has(iso(d))).length;
  const mudarMes = (delta: number) => setMesRef((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  const toggleFeriado = (d: Date) => setFeriados((lista) => lista.includes(iso(d)) ? lista.filter((item) => item !== iso(d)) : [...lista, iso(d)]);
  const formatarData = (valor: string | null) => {
    if (!valor) return "—";
    const [ano, mes, dia] = valor.split("-").map(Number);
    return new Date(ano || 1970, (mes || 1) - 1, dia || 1).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 md:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <img src={logoAsset.url} alt="RioCard Mais" className="h-14 w-24 shrink-0 object-contain md:h-16 md:w-28" />
            <div className="hidden min-w-0 border-l border-border pl-4 sm:block">
              <p className="truncate text-sm font-semibold text-foreground">Planejador de passagens</p>
              <p className="truncate text-xs text-muted-foreground">Seu curso, seu saldo, tudo organizado.</p>
            </div>
          </div>
          <span className="rounded-full bg-brand-soft px-3 py-1.5 text-xs font-bold text-primary">CURSO 8H–12H</span>
        </div>
      </header>

      <section className="brand-band">
        <div className="mx-auto max-w-6xl px-5 py-9 md:px-8 md:py-12">
          <p className="mb-2 text-sm font-bold text-primary-foreground/75">Olá! Vamos organizar suas viagens?</p>
          <h1 className="max-w-2xl text-3xl font-extrabold leading-tight text-primary-foreground md:text-4xl">Saiba exatamente quando recarregar.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-primary-foreground/80 md:text-base">Informe o valor colocado no cartão e acompanhe os dias de aula que ele cobre.</p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
        <Tabs value={aba} onValueChange={setAba} className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-md border border-border bg-card p-1 shadow-sm">
            <TabsTrigger value="dados" className="min-h-12 gap-2 rounded-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">
              <WalletCards aria-hidden="true" /> Seus dados
            </TabsTrigger>
            <TabsTrigger value="resultado" className="min-h-12 gap-2 rounded-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none">
              <CalendarDays aria-hidden="true" /> Calendário e resultado
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
              <section className="rounded-md border border-border bg-card p-5 shadow-sm md:p-7">
                <div className="mb-6 border-b border-border pb-4">
                  <p className="text-xs font-bold uppercase text-primary">Dados do cartão</p>
                  <h2 className="mt-1 text-xl font-bold">Conte como você usa suas passagens</h2>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Campo label="Valor recarregado no mês (R$)"><input aria-label="Valor recarregado no mês" type="text" inputMode="decimal" value={saldo} onChange={(e) => setSaldo(e.target.value)} className="field" /></Campo>
                  <Campo label="Valor de cada passagem (R$)"><input aria-label="Valor de cada passagem" type="text" inputMode="decimal" value={tarifa} onChange={(e) => setTarifa(e.target.value)} className="field" /></Campo>
                  <Campo label="Passagens por dia de aula"><select aria-label="Passagens por dia de aula" value={viagens} onChange={(e) => setViagens(e.target.value)} className="field"><option value="1">1 (só ida)</option><option value="2">2 (ida e volta)</option><option value="3">3 passagens</option><option value="4">4 (2 ônibus por trecho)</option></select></Campo>
                  <Campo label="Começar a contar a partir de"><input aria-label="Data inicial" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="field" /></Campo>
                </div>
                <div className="mt-7 flex justify-end">
                  <Button size="lg" onClick={() => setAba("resultado")}>Ver meu calendário <ChevronRight aria-hidden="true" /></Button>
                </div>
              </section>

              <aside className="rounded-md bg-ink p-6 text-primary-foreground shadow-sm">
                <CircleDollarSign className="mb-5 size-9 text-brand-warm" aria-hidden="true" />
                <p className="text-xs font-bold uppercase text-primary-foreground/65">Resumo automático</p>
                <h2 className="mt-1 text-xl font-bold">Seu saldo em números</h2>
                <div className="mt-6 space-y-4 border-t border-primary-foreground/15 pt-5 text-sm">
                  <Linha rotulo="Gasto por dia" valor={brl(calc.custoDia)} inverse />
                  <Linha rotulo="Dias de aula" valor={`${calc.diasCobertos} dias`} inverse />
                  <Linha rotulo="Total usado" valor={brl(calc.totalGasto)} inverse />
                  <Linha rotulo="Sobra no cartão" valor={brl(calc.sobra)} inverse />
                </div>
              </aside>
            </div>
          </TabsContent>

          <TabsContent value="resultado" className="mt-6 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Destaque titulo="Último dia com saldo" valor={formatarData(calc.ultimoDia)} tom="azul" />
              <Destaque titulo="Recarregue até este dia" valor={formatarData(calc.recarga)} tom="quente" />
            </div>

            <section className="rounded-md border border-border bg-card p-4 shadow-sm md:p-7">
              <div className="mb-6 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => mudarMes(-1)} aria-label="Mês anterior"><ChevronLeft /></Button>
                <div className="min-w-0 text-center"><p className="text-xs font-bold uppercase text-primary">Calendário de viagens</p><h2 className="truncate text-lg font-bold md:text-xl">{MESES[mesRef.getMonth()]} de {mesRef.getFullYear()}</h2></div>
                <Button variant="outline" size="icon" onClick={() => mudarMes(1)} aria-label="Próximo mês"><ChevronRight /></Button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted-foreground md:gap-2">{DIAS.map((dia, i) => <div key={`${dia}-${i}`} className="py-2">{dia}</div>)}</div>
              <div className="grid grid-cols-7 gap-1 md:gap-2">
                {grade.map((d, i) => {
                  if (!d) return <div key={`vazio-${i}`} />;
                  const key = iso(d);
                  const fds = d.getDay() === 0 || d.getDay() === 6;
                  const feriado = feriados.includes(key);
                  const coberto = calc.cobertos.has(key);
                  const recarga = calc.recarga === key;
                  const estilo = recarga ? "bg-brand-warm text-brand-warm-foreground border-brand-warm font-extrabold" : coberto ? "bg-primary text-primary-foreground border-primary font-bold" : feriado ? "bg-muted text-muted-foreground line-through" : fds ? "bg-background text-muted-foreground/50" : "bg-secondary text-foreground hover:border-primary";
                  return <Button variant="outline" key={key} onClick={() => !fds && toggleFeriado(d)} disabled={fds} title={fds ? "Fim de semana" : "Clique para marcar como feriado ou folga"} className={`aspect-square h-auto min-h-9 rounded-sm p-0 text-xs md:text-sm ${estilo}`}>{d.getDate()}</Button>;
                })}
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 border-t border-border pt-5 text-xs text-muted-foreground">
                <Legenda cor="bg-primary" texto="Dia pago pelo saldo" /><Legenda cor="bg-brand-warm" texto="Dia de recarregar" /><Legenda cor="bg-muted" texto="Feriado ou folga" />
              </div>
              <p className="mt-5 border-l-4 border-primary bg-brand-soft px-4 py-3 text-sm text-foreground">Neste mês, seu saldo cobre <strong>{diasAulaNoMes} dias de aula</strong>.</p>
            </section>
            <Button variant="outline" onClick={() => setAba("dados")}><ChevronLeft aria-hidden="true" /> Alterar meus dados</Button>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-foreground">{label}</span>{children}</label>;
}

function Linha({ rotulo, valor, inverse = false }: { rotulo: string; valor: string; inverse?: boolean }) {
  return <div className="flex items-center justify-between gap-4"><span className={inverse ? "text-primary-foreground/65" : "text-muted-foreground"}>{rotulo}</span><span className="font-bold">{valor}</span></div>;
}

function Destaque({ titulo, valor, tom }: { titulo: string; valor: string; tom: "azul" | "quente" }) {
  return <div className={`rounded-md border-l-4 bg-card p-5 shadow-sm ${tom === "quente" ? "border-brand-warm" : "border-primary"}`}><p className="text-xs font-bold uppercase text-muted-foreground">{titulo}</p><p className="mt-2 text-lg font-extrabold capitalize text-foreground md:text-xl">{valor}</p></div>;
}

function Legenda({ cor, texto }: { cor: string; texto: string }) {
  return <span className="flex items-center gap-2"><span className={`inline-block size-3 rounded-xs ${cor}`} />{texto}</span>;
}