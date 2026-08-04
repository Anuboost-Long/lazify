import clsx from "clsx";
import {
  Activity,
  Bell,
  Bot,
  Box,
  Bug,
  ChevronRight,
  Code2,
  FileCode2,
  Folder,
  FolderPlus,
  Gauge,
  Globe2,
  HardDrive,
  Maximize2,
  Play,
  Plus,
  Settings,
  X,
  Zap,
} from "lucide-react";

const projects = [
  { name: "storefront", path: "storefront", stack: "REACT NEXT", status: "Idle" },
  { name: "lazify", path: "lazify", stack: "ELECTRON", status: "1 running", alerts: 1 },
  { name: "service-api", path: "service-api", stack: "DOTNET", status: "Idle" },
  { name: "mobile-studio", path: "mobile-studio", stack: "REACT NATIVE EXPO", status: "Idle" },
  { name: "design-system", path: "design-system", stack: "UNKNOWN", status: "2 running", alerts: 2 },
  { name: "docs-site", path: "docs-site", stack: "REACT NEXT", status: "Idle" },
];

function RendererLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[17px] w-[17px] text-slate-400" aria-hidden="true">
      <path d="M2.5 7.5C2.5 6.67 3.17 6 4 6h4c.3 0 .55.15.72.38l.78 1.12H20c.83 0 1.5.67 1.5 1.5v10c0 .83-.67 1.5-1.5 1.5H4c-.83 0-1.5-.67-1.5-1.5Z" fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      <path d="M6 10.5v7m0-7h3m-3 2.5h2.5M6 15.5h2.5M6 17.5h6.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path d="M9 9.5h3.5v2H9zm-.5 2.5h3v2h-3zm0 2.5H11v2H8.5zm4 2H16v2h-3.5zm4 0h3v2h-3z" fill="currentColor" fillOpacity=".25" stroke="currentColor" strokeWidth=".6" />
      <path d="m15 3-3 5.5h2.2L11.5 14l6-6.5H15Z" fill="#10b981" stroke="#10b981" strokeWidth=".3" />
    </svg>
  );
}

function ProjectArtwork({ index }: Readonly<{ index: number }>) {
  const variant = index % 3;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden text-slate-400 opacity-[.35]">
      {variant === 0 ? <><span className="absolute -right-5 -top-7 h-20 w-20 rotate-12 rounded-[19px] border border-current" /><span className="absolute bottom-3 right-7 h-1.5 w-10 -rotate-12 rounded-full bg-current opacity-30" /><span className="absolute right-3 top-14 grid grid-cols-3 gap-1">{Array.from({ length: 9 }).map((_, dot) => <i key={dot} className="h-[2.5px] w-[2.5px] rounded-full bg-current opacity-40" />)}</span></> : null}
      {variant === 1 ? <><span className="absolute -bottom-5 -right-8 h-24 w-24 rounded-full border border-current" /><span className="absolute right-5 top-5 h-14 w-14 -rotate-6 rounded-[15px] border border-current" /><span className="absolute bottom-5 right-16 h-1.5 w-8 rotate-12 rounded-full bg-current opacity-30" /></> : null}
      {variant === 2 ? <><span className="absolute -right-7 top-3 h-[68px] w-[68px] rotate-[18deg] rounded-[17px] border border-current" /><span className="absolute bottom-2 right-8 h-8 w-8 rounded-full border border-current" /><span className="absolute right-20 top-7 grid grid-cols-3 gap-1">{Array.from({ length: 9 }).map((_, dot) => <i key={dot} className="h-[2.5px] w-[2.5px] rounded-full bg-current opacity-40" />)}</span></> : null}
    </div>
  );
}

function ProjectSheets({ active }: Readonly<{ active: boolean }>) {
  return (
    <div className="relative h-10 w-10 shrink-0">
      <span className={clsx("absolute left-1 top-0 h-[34px] w-7 rotate-[8deg] rounded-[7px] border", active ? "border-emerald-500/40 bg-emerald-500/10" : "border-white/[.08] bg-[#0b1220]")} />
      <span className={clsx("absolute left-0 top-1 h-[34px] w-7 -rotate-[6deg] overflow-hidden rounded-[7px] border", active ? "border-emerald-500/60 bg-emerald-500/[.14]" : "border-white/[.08] bg-[#111827]")}><i className={clsx("absolute right-0 top-0 h-2 w-2", active ? "bg-emerald-500/40" : "bg-white/[.08]")} style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }} /></span>
      <span className={clsx("absolute -bottom-0.5 right-0 flex h-5 w-5 items-center justify-center rounded-[7px] border bg-[#0b1220]", active ? "border-emerald-500/50 text-emerald-400" : "border-white/[.08] text-slate-500")}><Code2 size={10} /></span>
    </div>
  );
}

function ProjectCard({
  name,
  path,
  stack,
  status,
  alerts,
  index,
}: Readonly<(typeof projects)[number] & { index: number }>) {
  const active = name === "lazify";

  return (
    <div
      className={clsx(
        "relative h-[91px] shrink-0 overflow-hidden rounded-[17px]",
        "bg-[#0b1220] border px-3 py-2.5",
        active ? "border-emerald-400" : "border-[#1d293b]",
      )}
    >
      <ProjectArtwork index={index} />
      <div className="relative flex gap-3">
        <ProjectSheets active={active} />
        <div className="min-w-0 pt-0.5">
          <p className="truncate text-[11px] font-bold leading-none text-slate-100">{name}</p>
          <p className="mt-1.5 max-w-[170px] whitespace-pre-line font-sans text-[7.5px] leading-[9px] text-slate-500">/Users/administrator/Work/{path}</p>
        </div>
      </div>
      <div className="relative mt-2 flex items-center gap-2">
        <span className={clsx("rounded-full border px-2 py-0.5 font-mono text-[6.5px] font-bold tracking-[.14em]", active ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-white/[.08] bg-[#111827] text-slate-400")}>{stack}</span>
        <span className="text-[7px] text-slate-400">{status}</span>
        {alerts ? <span className="ml-auto rounded-full bg-rose-500 px-2 py-1 font-mono text-[7px] font-bold text-white">× {alerts}</span> : null}
        <span className={clsx("flex h-6 w-6 items-center justify-center rounded-full border", active ? "border-emerald-500/50 text-emerald-400" : "border-slate-500/30 text-slate-500")}><ChevronRight size={11} /></span>
      </div>
    </div>
  );
}

function CodeDiff() {
  return (
    <div className="overflow-hidden font-mono text-[10.5px] leading-none">
      <div className="bg-[#08720a] px-5 py-0.5 text-lime-200">
        <p><span className="mr-4 text-lime-300">134 +</span>&lt;div&gt;&lt;p className=&quot;font-mono text-[10px] uppercase tracking-[.2em]&quot;&gt;Open</p>
        <p className="pl-14">source desktop workflow&lt;/p&gt;&lt;h2 className=&quot;mt-6 max-w-3xl font-semibold leading-[1.02]&quot;&gt;Build in one place.&lt;br /&gt;</p>
        <p className="pl-14">&lt;em&gt;Stay in the flow.&lt;/em&gt;&lt;/h2&gt;&lt;/div&gt;</p>
      </div>
      <p className="px-5 text-slate-300"><span className="mr-5 text-slate-500">135</span>&lt;a href=&quot;https://github.com/Anuboost-Long/lazify&quot; target=&quot;_blank&quot; rel=&quot;noreferrer&quot;</p>
      <p className="px-16 text-slate-300">className=&quot;group inline-flex w-fit items-center gap-3 rounded-xl bg-[#08100d] px-5 py-3 text-sm font-bold text-emerald-200&quot;&gt;</p>
      <p className="px-16 text-slate-300">Explore on GitHub &lt;ArrowRight size={'{16}'} /&gt;&lt;/a&gt;</p>
      <p className="mt-2 px-1 text-slate-200">• <b>Edited</b> website/app/globals.css <span className="text-lime-300">(+1</span> <span className="text-rose-400">−1)</span></p>
      <p className="mt-1 bg-[#850000] px-5 text-slate-200"><span className="mr-5 text-slate-500">43 −</span>font-weight: 400;</p>
      <p className="bg-[#08720a] px-5 text-slate-200"><span className="mr-5 text-slate-500">43 +</span>font-weight: inherit;</p>
      <p className="px-5 text-slate-300"><span className="mr-5 text-slate-500">44</span>{'}'}</p>
    </div>
  );
}

function TerminalTranscript() {
  return (
    <div
      className="flex min-w-0 flex-1 flex-col bg-[#111827] font-mono text-[10.5px] leading-none tracking-0 text-white"
      style={{ fontFamily: '"JetBrains Mono", "Fira Code", Menlo, Consolas, monospace' }}
    >
      <div className="min-h-0 flex-1 overflow-hidden px-2 py-2">
        <CodeDiff />
        <div className="my-4 border-t border-slate-400/60" />
        <div className="px-1">
          <p>• The serif/italic system is gone. Lazify now uses Chakra Petch for display text—angular cuts</p>
          <p className="pl-3">and squared proportions—paired with Manrope for body copy. The hero uses positive tracking</p>
          <p className="pl-3">instead of compressed negative spacing, and highlighted phrases remain upright so the site</p>
          <p className="pl-3">no longer echoes File Lens’s editorial treatment. Both fonts are bundled locally, so</p>
          <p className="pl-3">production rendering does not depend on Google Fonts or another external request.</p>

          <p className="mt-3"><span className="text-lime-300">•</span> <b>Ran</b> <span className="text-blue-300">npm run</span> typecheck <span className="text-cyan-300">&amp;&amp;</span> <span className="text-blue-300">npm run</span> build <span className="text-cyan-300">&amp;&amp;</span> git diff <span className="text-rose-300">--check</span> <span className="text-cyan-300">--</span> website</p>
          <p className="pl-3 text-slate-500">└ &gt; lazify-website@0.1.0 typecheck</p>
          <p className="pl-6 text-slate-500">… +28 lines (ctrl + t to view transcript)</p>
          <p className="pl-6 text-slate-500">○ (Static) prerendered as static content</p>

          <div className="my-5 border-t border-slate-400/60" />
          <p className="text-slate-400">• <span className="text-slate-100">Updated at</span> <u className="text-slate-100">http://localhost:3000</u> (<u className="text-cyan-300">http://localhost:3000</u>).</p>
          <div className="mt-3 pl-3">
            <p>− Replaced serif/italic typography with Chakra Petch display + Manrope body.</p>
            <p>− Added wider hero tracking and more line-height.</p>
            <p>− Applied the latest desktop icon as the website favicon, header mark, footer mark, and CTA artwork.</p>
            <p className="mt-3">− Rebuilt the product display as a static duplicate of the real Agents renderer.</p>
            <p className="mt-3">Typecheck and production build both pass. Existing Electron code remains untouched.</p>
          </div>
          <p className="mt-4 flex items-center gap-2 text-slate-500"><span>− Worked for 7m 12s</span><span className="h-px flex-1 bg-slate-400/50" /></p>
        </div>
      </div>
      <div className="shrink-0 px-3 pb-3">
        <div className="bg-[#323230] px-3 py-2.5 text-slate-400"><span className="text-slate-200">›</span> <span className="text-purple-300">▯</span> Run /review on my current changes</div>
        <p className="mt-1 px-3 text-[8px]"><span className="text-amber-100">gpt-5.6-sol medium</span> <span className="text-slate-500">·</span> <span className="text-lime-200">~/Work/lazify</span></p>
      </div>
    </div>
  );
}

function UsageCard({
  name,
  total,
  values,
}: Readonly<{ name: string; total: string; values: number[] }>) {
  const claude = name === "Claude";

  return (
    <div className="rounded-xl border border-white/[.08] bg-white/[.03] p-2">
      <div className="flex items-center gap-2">
        {claude ? <span className="text-[15px] leading-none text-orange-400">✳</span> : <Bot size={11} className="text-slate-300" />}
        <span className="text-[9px] font-medium text-slate-200">{name}</span>
        <span className="ml-auto font-mono text-[8px] text-slate-400">{total} all time</span>
      </div>
      <div className="mt-2 flex h-7 items-end gap-0.5">
        {values.map((value, index) => <span key={`${name}-${index}`} className="flex-1 rounded-[1px] bg-emerald-500/65" style={{ height: `${value}%` }} />)}
      </div>
      <div className="mt-1.5 grid grid-cols-3 text-[7.5px] leading-[11px] text-slate-400">
        <span>Session<br /><b className="font-mono text-[9px] text-slate-200">{claude ? "72.2M" : "11.5M"}</b></span>
        <span>Today<br /><b className="font-mono text-[9px] text-slate-200">{claude ? "61.8M" : "8.7M"}</b></span>
        <span>7 days<br /><b className="font-mono text-[9px] text-slate-200">{claude ? "780.9M" : "187.2M"}</b></span>
      </div>
      <div className="mt-2 flex justify-between text-[7.5px] text-slate-400"><span>5h window</span><span className="font-mono">{claude ? "61.8M · 22% left" : "8.7M"}</span></div>
      <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-slate-500/35"><div className={clsx("h-full", claude ? "w-[22%] bg-amber-400" : "w-0 bg-emerald-400")} /></div>
      <p className="mt-1.5 text-[7.5px] text-slate-400">Resets Aug 4 {claude ? "1:39 PM · 2h 50m" : "3:23 PM · 4h 34m"}</p>
      <div className="mt-2 flex justify-between text-[7.5px] text-slate-400"><span>Limit left{claude ? "" : " · plus"}</span><span className="font-mono">{claude ? "0% left" : "40% left"}</span></div>
      <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-slate-500/35"><div className={clsx("h-full", claude ? "w-[2%] bg-rose-400" : "w-[40%] bg-emerald-400")} /></div>
      <p className="mt-1.5 text-[7.5px] text-slate-400">Resets Aug {claude ? "4 12:59 PM · 2h 10m" : "9 8:54 PM · 5d 10h"}</p>
    </div>
  );
}

function UsagePanel() {
  return (
    <aside className="flex h-full w-[245px] shrink-0 flex-col border-l border-white/[.08] bg-white/[.02]">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-white/[.08] px-2 text-[9px] text-slate-200">
        <Activity size={11} className="text-slate-400" /> Usage
        <Gauge size={11} className="ml-auto text-slate-400" />
        <X size={10} className="text-slate-400" />
      </div>
      <div className="space-y-2 overflow-hidden p-2">
        <UsageCard name="Claude" total="3.3B" values={[68, 73, 45, 24, 22, 7, 20, 36, 30, 49, 26, 44, 5, 16]} />
        <UsageCard name="Codex" total="3.5B" values={[28, 34, 4, 5, 46, 17, 8, 18, 43, 12, 29, 24, 72, 8]} />
      </div>
    </aside>
  );
}

function AppRail() {
  const navigation = [Folder, Code2, Globe2, Box, Settings, Activity, HardDrive];

  return (
    <aside className="flex w-[61px] shrink-0 flex-col items-center border-r border-white/[.08] bg-[#111827] px-2.5 py-2.5">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl"><RendererLogo /></div>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[.08] bg-[#0b1220] text-emerald-400"><Play size={15} strokeWidth={1.5} /></div>
      {navigation.map((Icon, index) => (
        <div key={index} className={clsx("mb-1 flex h-9 w-10 items-center justify-center rounded-xl", index === 1 ? "bg-[#0b1220] text-emerald-400" : "text-slate-400")}>
          <Icon size={15} strokeWidth={1.5} />
        </div>
      ))}
      <div className="mt-auto w-full border-t border-white/[.08] pt-4 text-center text-slate-400"><Zap size={17} className="mx-auto" strokeWidth={1.3} /></div>
    </aside>
  );
}

function ToolRail() {
  const tools = [Globe2, FileCode2, Folder, FolderPlus, Bell, Activity];

  return (
    <aside className="flex w-[34px] shrink-0 flex-col items-center border-l border-white/[.08] bg-[#111827] py-2">
      <Bug size={13} className="mb-2 text-slate-400" />
      {tools.map((Icon, index) => (
        <div key={index} className={clsx("relative mb-1 flex h-8 w-7 items-center justify-center rounded-md", index === tools.length - 1 ? "bg-emerald-500/10 text-emerald-400" : "text-slate-400")}>
          <Icon size={13} strokeWidth={1.5} />
          {index === 0 ? <span className="absolute -right-1 -top-1 rounded-full bg-emerald-400 px-1 text-[6px] font-bold text-[#06111f]">16</span> : null}
          {index === 4 ? <span className="absolute -right-1 -top-1 rounded-full bg-emerald-400 px-1 text-[6px] font-bold text-[#06111f]">66</span> : null}
        </div>
      ))}
    </aside>
  );
}

export function ProductWindow() {
  return (
    <div
      className="product-shadow relative mx-auto aspect-[3018/1884] w-full max-w-[1280px] overflow-hidden rounded-[14px] border border-white/15 bg-[#0b1220]"
      style={{ fontFamily: '"Google Sans", "Avenir Next", "Segoe UI", sans-serif' }}
    >
      <div className="flex h-[26px] items-center border-b border-[#2e2b2c] bg-[#1d1b1b] px-1.5">
        <div className="flex gap-2"><span className="h-3 w-3 rounded-full bg-[#ff4c55]" /><span className="h-3 w-3 rounded-full bg-[#ffc900]" /><span className="h-3 w-3 rounded-full bg-[#2bcf68]" /></div>
        <span className="ml-3 text-[9px] font-bold text-stone-400">Lazify</span>
      </div>

      <div className="flex h-[calc(100%_-_26px)]">
        <AppRail />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex h-[34px] shrink-0 items-center gap-2 border-b border-white/[.08] bg-[#0b1220] px-4">
            <Code2 size={10} className="text-emerald-400" />
            <span className="text-[9px] font-bold text-slate-200">AI Agents</span>
            <span className="ml-1 text-[8px] text-slate-400">Chat with Claude or Codex in your projects.</span>
          </div>

          <div className="relative flex min-h-0 flex-1 gap-[14px] bg-[#0b1220] px-[27px] py-5">
            <span className="pointer-events-none absolute -right-24 -top-28 h-[390px] w-[390px] rotate-12 rounded-[119px] border border-slate-400/[.055]" />
            <span className="pointer-events-none absolute -bottom-32 -left-28 h-[356px] w-[356px] rounded-full border border-slate-400/[.055]" />
            <span className="pointer-events-none absolute -left-9 top-20 h-[102px] w-[102px] -rotate-6 rounded-[31px] border border-slate-400/[.055]" />
            <aside className="relative flex w-[255px] shrink-0 flex-col overflow-hidden rounded-[20px] border border-white/[.08] bg-[#111827]">
              <div className="flex h-10 shrink-0 items-center px-3.5">
                <span className="font-mono text-[9px] font-bold tracking-[.22em] text-emerald-400">PROJECTS</span>
                <Maximize2 size={9} className="ml-auto text-slate-500" />
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-2.5">
                {projects.map((project, index) => <ProjectCard key={project.name} {...project} index={index} />)}
              </div>
              <div className="shrink-0 border-t border-white/[.08] p-2.5">
                <div className="mb-2 flex items-center gap-2 text-[8px] text-slate-200"><Activity size={10} className="text-emerald-400" /> <span className="truncate font-mono">feat/synced-install-and-expo...</span><Maximize2 size={8} className="ml-auto text-slate-500" /></div>
                <div className="flex items-center gap-2 rounded-[15px] border border-dashed border-white/[.08] bg-[#0b1220]/60 p-2.5 text-[9px] font-bold text-slate-200"><span className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/[.08] bg-[#111827] text-emerald-400"><Plus size={12} /></span> Sync project <ChevronRight size={11} className="ml-auto text-slate-500" /></div>
              </div>
            </aside>

            <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-[15px] border border-white/[.08] bg-[#111827]">
              <div className="flex h-10 shrink-0 items-center gap-3 border-b border-white/[.08] px-2">
                <div className="flex h-7 items-center gap-2 rounded-md bg-slate-400/15 px-3 text-[9px] text-slate-200"><Bot size={11} /> Codex <X size={9} className="ml-1" /></div>
                <div className="flex items-center gap-1.5 text-[9px] text-slate-200"><Plus size={10} /> New agent</div>
                <div className="ml-2 flex items-center gap-1.5 text-[9px] text-emerald-400"><Play size={10} /> Run dev</div>
                <Maximize2 size={9} className="text-slate-500" />
              </div>
              <div className="flex min-h-0 flex-1">
                <TerminalTranscript />
                <UsagePanel />
                <ToolRail />
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
