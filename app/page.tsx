'use client';

import { useEffect, useMemo, useState } from 'react';
import samplePack from '@/data/examples/hs915_test_run_01_strategy_pack.json';
import { rolePermissions } from '@/lib/defaults';
import type {
  AssetManifestItem,
  GenerationMode,
  GenerationRecord,
  ImageGenerationOutput
} from '@/lib/image-provider/types';
import type { AssetRecord, ClaimRiskLevel, Direction, QARecord, ReferenceRole, SourceType, StrategyPack } from '@/types/workflow';

const sourceTypes: SourceType[] = ['own_product', 'competitor', 'brand_style', 'risk_example'];
const roles = Object.keys(rolePermissions) as ReferenceRole[];
const riskLevels: ClaimRiskLevel[] = ['low', 'medium', 'high', 'unknown'];

type GenerateApiResponse =
  | { ok: true; result: ImageGenerationOutput }
  | { ok: false; error: { code: string; message: string } };

function makeInitialQA(pack: StrategyPack): Record<string, QARecord> {
  return Object.fromEntries(
    pack.directions.map((direction) => [
      direction.directionId,
      {
        directionId: direction.directionId,
        result: 'not_generated',
        checks: Object.fromEntries(direction.qaChecklist.map((check) => [check, false])),
        mainProblem: '',
        nextAction: ''
      }
    ])
  );
}

function makeInitialGenerations(pack: StrategyPack): Record<string, GenerationRecord> {
  return Object.fromEntries(
    pack.directions.map((direction) => [
      direction.directionId,
      {
        directionId: direction.directionId,
        mode: 'mock',
        status: 'not_generated'
      }
    ])
  );
}

function validateAsset(sourceType: SourceType, role: ReferenceRole) {
  if (sourceType === 'competitor' && role === 'product_truth_reference') {
    return 'Competitor image cannot be used as product truth.';
  }
  if (role === 'claim_boundary_reference' && sourceType !== 'risk_example' && sourceType !== 'competitor') {
    return 'Claim boundary references should be competitor or risk-example assets.';
  }
  return '';
}

function downloadText(filename: string, content: string, type = 'text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function HomePage() {
  const [packText, setPackText] = useState(JSON.stringify(samplePack, null, 2));
  const [pack, setPack] = useState<StrategyPack>(samplePack as StrategyPack);
  const [selectedDirectionId, setSelectedDirectionId] = useState(pack.directions[0]?.directionId ?? '');
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [qa, setQa] = useState<Record<string, QARecord>>(makeInitialQA(pack));
  const [generations, setGenerations] = useState<Record<string, GenerationRecord>>(makeInitialGenerations(pack));
  const [packStatus, setPackStatus] = useState('Loaded sample HS-915 strategy pack.');

  const selectedDirection = useMemo(
    () => pack.directions.find((direction) => direction.directionId === selectedDirectionId) ?? pack.directions[0],
    [pack, selectedDirectionId]
  );

  const activeQa = selectedDirection ? qa[selectedDirection.directionId] : undefined;
  const activeGeneration = selectedDirection ? generations[selectedDirection.directionId] : undefined;

  function loadSample() {
    const nextPack = samplePack as StrategyPack;
    setPack(nextPack);
    setPackText(JSON.stringify(nextPack, null, 2));
    setSelectedDirectionId(nextPack.directions[0]?.directionId ?? '');
    setQa(makeInitialQA(nextPack));
    setGenerations(makeInitialGenerations(nextPack));
    setPackStatus('Loaded sample HS-915 strategy pack.');
  }

  function importPack() {
    try {
      const parsed = JSON.parse(packText) as StrategyPack;
      if (parsed.workflowMode !== 'strategy_pack_driven') throw new Error('workflowMode must be strategy_pack_driven.');
      if (!Array.isArray(parsed.directions) || parsed.directions.length === 0) throw new Error('directions is required.');
      parsed.directions.forEach((direction) => {
        const required = ['directionId', 'directionName', 'finalGenerationPrompt', 'negativePrompt', 'uploadChecklist', 'qaChecklist'];
        required.forEach((field) => {
          if (!(field in direction)) throw new Error(`Missing direction field: ${field}`);
        });
      });
      setPack(parsed);
      setSelectedDirectionId(parsed.directions[0].directionId);
      setQa(makeInitialQA(parsed));
      setGenerations(makeInitialGenerations(parsed));
      setPackStatus('Strategy pack imported and validated.');
    } catch (error) {
      setPackStatus(error instanceof Error ? `Invalid strategy pack: ${error.message}` : 'Invalid strategy pack.');
    }
  }

  function addAsset(file: File, sourceType: SourceType, referenceRole: ReferenceRole, claimRiskLevel: ClaimRiskLevel, directionScope: string) {
    const blockReason = validateAsset(sourceType, referenceRole);
    const asset: AssetRecord = {
      id: `${Date.now()}-${file.name}`,
      fileName: file.name,
      sourceType,
      referenceRole,
      claimRiskLevel,
      directionScope,
      previewUrl: URL.createObjectURL(file),
      blocked: Boolean(blockReason),
      blockReason
    };
    setAssets((current) => [asset, ...current]);
  }

  function updateQaCheck(check: string, value: boolean) {
    if (!selectedDirection || !activeQa) return;
    setQa((current) => ({
      ...current,
      [selectedDirection.directionId]: {
        ...activeQa,
        checks: { ...activeQa.checks, [check]: value }
      }
    }));
  }

  function setGenerationMode(mode: GenerationMode) {
    if (!selectedDirection || !activeGeneration || activeGeneration.status === 'generating') return;
    setGenerations((current) => ({
      ...current,
      [selectedDirection.directionId]: {
        directionId: selectedDirection.directionId,
        mode,
        status: 'not_generated'
      }
    }));
  }

  async function generateImage() {
    if (!selectedDirection || !activeGeneration || activeGeneration.status === 'generating') return;
    const directionId = selectedDirection.directionId;
    const mode = activeGeneration.mode;
    const assetManifest: AssetManifestItem[] = assets
      .filter((asset) => !asset.blocked)
      .filter((asset) => asset.directionScope === directionId || asset.directionScope === 'all')
      .map(({ previewUrl, ...asset }) => ({
        ...asset,
        blocked: Boolean(asset.blocked)
      }));

    setGenerations((current) => ({
      ...current,
      [directionId]: {
        directionId,
        mode,
        status: 'generating',
        message: `${mode === 'real' ? 'Real' : 'Mock'} generation is running.`
      }
    }));

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directionId,
          finalGenerationPrompt: selectedDirection.finalGenerationPrompt,
          negativePrompt: selectedDirection.negativePrompt,
          assetManifest,
          generationMode: mode
        })
      });
      const payload = (await response.json()) as GenerateApiResponse;
      if (!response.ok || !payload.ok) {
        const apiError = payload.ok ? null : payload.error;
        throw new Error(apiError ? `${apiError.code}: ${apiError.message}` : `Generation failed with status ${response.status}.`);
      }

      setGenerations((current) => ({
        ...current,
        [directionId]: {
          ...payload.result
        }
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Image generation failed.';
      const separator = message.indexOf(':');
      setGenerations((current) => ({
        ...current,
        [directionId]: {
          directionId,
          mode,
          status: 'generation_failed',
          errorCode: separator > 0 ? message.slice(0, separator) : 'IMAGE_GENERATION_FAILED',
          message: separator > 0 ? message.slice(separator + 1).trim() : message
        }
      }));
    }
  }

  function exportDelivery() {
    const generationPrompts = pack.directions
      .map((direction) => `## ${direction.directionName}\n\n### Prompt\n${direction.finalGenerationPrompt}\n\n### Negative Prompt\n${direction.negativePrompt}\n`)
      .join('\n');
    const uploadChecklist = pack.directions
      .map((direction) => `## ${direction.directionName}\n\n${direction.uploadChecklist.map((item) => `- ${item.required ? '必传' : '选传'}｜${item.role}｜${item.label}\n  - Allowed: ${item.allowedUse}\n  - Forbidden: ${item.forbiddenUse}`).join('\n')}`)
      .join('\n\n');
    const qaSheet = JSON.stringify(qa, null, 2);
    const assetManifest = JSON.stringify(assets.map(({ previewUrl, ...asset }) => asset), null, 2);
    const generationResults = JSON.stringify(
      Object.fromEntries(
        Object.entries(generations).map(([directionId, { imageDataUrl, ...record }]) => [
          directionId,
          { ...record, imageIncludedInExport: Boolean(imageDataUrl) }
        ])
      ),
      null,
      2
    );
    const bundle = `# Delivery Pack\n\n## strategy_pack.json\n\n\`\`\`json\n${JSON.stringify(pack, null, 2)}\n\`\`\`\n\n## generation_prompts.md\n\n${generationPrompts}\n\n## upload_checklist.md\n\n${uploadChecklist}\n\n## generation_results.json\n\n\`\`\`json\n${generationResults}\n\`\`\`\n\n## qa_sheet.json\n\n\`\`\`json\n${qaSheet}\n\`\`\`\n\n## asset_manifest.json\n\n\`\`\`json\n${assetManifest}\n\`\`\`\n`;
    downloadText('strategy_pack_delivery_pack.md', bundle, 'text/markdown');
  }

  return (
    <main className="min-h-screen bg-[#f7f3f6]">
      <section className="bg-[#2c2433] px-6 py-10 text-white md:px-10">
        <p className="text-sm uppercase tracking-[0.24em] text-pink-200">Strategy-Pack Image Studio MVP</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-bold md:text-5xl">图片策划包驱动的 AIGC 电商图执行工作台</h1>
        <p className="mt-4 max-w-3xl text-pink-50/90">
          不是 Listing 五点驱动的自动策划器，而是把 Prompt Contract / Runtime Pack 转成带角色上传、生成执行、QA Gate 与交付导出的团队前台。
        </p>
      </section>

      <section className="grid gap-4 px-6 py-6 md:grid-cols-4 md:px-10">
        <Metric label="Strategy Pack" value={pack.packVersion} />
        <Metric label="Directions" value={String(pack.directions.length)} />
        <Metric label="Assets" value={String(assets.length)} />
        <Metric label="Mode" value="Test Only" />
      </section>

      <section className="grid gap-6 px-6 pb-10 md:grid-cols-[360px_1fr] md:px-10">
        <aside className="space-y-6">
          <Panel title="1. Strategy Pack Import">
            <textarea
              className="h-72 w-full rounded-xl border border-zinc-200 bg-white p-3 text-xs text-zinc-700"
              value={packText}
              onChange={(event) => setPackText(event.target.value)}
            />
            <div className="mt-3 flex gap-2">
              <button onClick={importPack} className="rounded-xl bg-[#2c2433] px-4 py-2 text-sm font-semibold text-white">Validate & Import</button>
              <button onClick={loadSample} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold">Load Sample</button>
            </div>
            <p className="mt-3 text-sm text-zinc-600">{packStatus}</p>
          </Panel>

          <Panel title="2. Directions">
            <div className="space-y-2">
              {pack.directions.map((direction) => {
                const record = qa[direction.directionId];
                const generation = generations[direction.directionId];
                return (
                  <button
                    key={direction.directionId}
                    onClick={() => setSelectedDirectionId(direction.directionId)}
                    className={`w-full rounded-xl border p-3 text-left ${selectedDirectionId === direction.directionId ? 'border-[#c76c95] bg-[#f9edf3]' : 'border-zinc-200 bg-white'}`}
                  >
                    <div className="font-semibold">{direction.directionName}</div>
                    <div className="mt-1 text-xs text-zinc-600">{direction.targetPlacement}</div>
                    <div className="mt-2 text-xs font-semibold text-[#8b3f65]">{record?.result ?? 'not_generated'}</div>
                    <div className="mt-1 text-xs text-zinc-500">Generation: {generation?.status ?? 'not_generated'}</div>
                  </button>
                );
              })}
            </div>
          </Panel>
        </aside>

        <div className="space-y-6">
          {selectedDirection && activeQa && activeGeneration ? (
            <>
              <Panel title="3. Direction Workspace">
                <div className="grid gap-4 md:grid-cols-2">
                  <Info label="Direction" value={selectedDirection.directionName} />
                  <Info label="Test State" value={selectedDirection.testState} />
                  <Info label="Buyer Question" value={selectedDirection.buyerQuestion} />
                  <Info label="Output Name" value={selectedDirection.outputName} />
                </div>
                <div className="mt-4 rounded-2xl bg-zinc-50 p-4">
                  <h3 className="font-semibold">Final Generation Prompt</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{selectedDirection.finalGenerationPrompt}</p>
                </div>
                <div className="mt-4 rounded-2xl bg-red-50 p-4">
                  <h3 className="font-semibold text-red-900">Negative Prompt / Hard Restrictions</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-red-800">{selectedDirection.negativePrompt}</p>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-[220px_auto_1fr] md:items-end">
                  <label className="text-sm font-semibold">
                    Generation Mode
                    <select
                      className="mt-2 w-full rounded-xl border border-zinc-300 p-2"
                      value={activeGeneration.mode}
                      disabled={activeGeneration.status === 'generating'}
                      onChange={(event) => setGenerationMode(event.target.value as GenerationMode)}
                    >
                      <option value="mock">mock</option>
                      <option value="real">real</option>
                    </select>
                  </label>
                  <button
                    onClick={generateImage}
                    disabled={activeGeneration.status === 'generating'}
                    className="rounded-xl bg-[#c76c95] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {activeGeneration.status === 'generating' ? 'Generating...' : 'Generate'}
                  </button>
                  <button onClick={() => downloadText(`${selectedDirection.directionId}_prompt.txt`, `${selectedDirection.finalGenerationPrompt}\n\nNEGATIVE:\n${selectedDirection.negativePrompt}`)} className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold">Copy/Download Prompt</button>
                </div>
                <div className={`mt-4 rounded-2xl border p-4 ${activeGeneration.status === 'generation_failed' ? 'border-red-300 bg-red-50' : 'border-zinc-200 bg-white'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">Generation Result</h3>
                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold">{activeGeneration.mode}</span>
                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold">{activeGeneration.status}</span>
                  </div>
                  {activeGeneration.message ? <p className="mt-2 text-sm text-zinc-700">{activeGeneration.message}</p> : null}
                  {activeGeneration.errorCode ? <p className="mt-1 text-xs font-semibold text-red-800">Error: {activeGeneration.errorCode}</p> : null}
                  {activeGeneration.imageDataUrl ? (
                    <img
                      src={activeGeneration.imageDataUrl}
                      alt={`${selectedDirection.directionName} generated test result`}
                      className="mt-4 max-h-[560px] w-full rounded-2xl object-contain"
                    />
                  ) : null}
                  <p className="mt-3 text-xs text-zinc-500">Generation never changes QA automatically. A human reviewer must complete the QA Gate.</p>
                </div>
              </Panel>

              <Panel title="4. Role-Based Asset Upload">
                <AssetUploader selectedDirection={selectedDirection} onAddAsset={addAsset} />
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {assets.filter((asset) => asset.directionScope === selectedDirection.directionId || asset.directionScope === 'all').map((asset) => (
                    <div key={asset.id} className={`rounded-2xl border p-3 ${asset.blocked ? 'border-red-300 bg-red-50' : 'border-zinc-200 bg-white'}`}>
                      {asset.previewUrl ? <img src={asset.previewUrl} alt={asset.fileName} className="h-32 w-full rounded-xl object-cover" /> : null}
                      <div className="mt-2 text-sm font-semibold">{asset.fileName}</div>
                      <div className="mt-1 text-xs text-zinc-600">{asset.sourceType} · {asset.referenceRole} · {asset.claimRiskLevel}</div>
                      <div className="mt-2 text-xs text-zinc-700">Allowed: {rolePermissions[asset.referenceRole].allowedUse}</div>
                      <div className="mt-1 text-xs text-zinc-700">Forbidden: {rolePermissions[asset.referenceRole].forbiddenUse}</div>
                      {asset.blocked ? <div className="mt-2 rounded-lg bg-red-100 p-2 text-xs font-semibold text-red-800">Blocked: {asset.blockReason}</div> : null}
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="5. Upload Checklist">
                <div className="grid gap-3 md:grid-cols-2">
                  {selectedDirection.uploadChecklist.map((item) => (
                    <div key={`${selectedDirection.directionId}-${item.role}-${item.label}`} className="rounded-2xl border border-zinc-200 bg-white p-4">
                      <div className="text-sm font-semibold">{item.required ? '必传' : '选传'}｜{item.label}</div>
                      <div className="mt-2 text-xs text-zinc-600">Role: {item.role}</div>
                      <div className="mt-2 text-xs text-green-700">Allowed: {item.allowedUse}</div>
                      <div className="mt-1 text-xs text-red-700">Forbidden: {item.forbiddenUse}</div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="6. QA Gate">
                <div className="grid gap-3 md:grid-cols-2">
                  {selectedDirection.qaChecklist.map((check) => (
                    <label key={check} className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 text-sm">
                      <input type="checkbox" checked={Boolean(activeQa.checks[check])} onChange={(event) => updateQaCheck(check, event.target.checked)} />
                      {check}
                    </label>
                  ))}
                </div>
                <div className="mt-4">
                  <label className="text-sm font-semibold">
                    QA Result
                    <select
                      className="mt-2 w-full rounded-xl border border-zinc-300 p-2"
                      value={activeQa.result}
                      onChange={(event) => setQa((current) => ({ ...current, [selectedDirection.directionId]: { ...activeQa, result: event.target.value as QARecord['result'] } }))}
                    >
                      <option value="not_generated">not_generated</option>
                      <option value="structure_test_pass">structure_test_pass</option>
                      <option value="structure_test_fail">structure_test_fail</option>
                    </select>
                  </label>
                </div>
                <p className="mt-3 text-xs text-zinc-500">QA remains manual even after mock or real generation.</p>
                <textarea
                  className="mt-4 h-20 w-full rounded-xl border border-zinc-300 p-3 text-sm"
                  placeholder="main_problem"
                  value={activeQa.mainProblem}
                  onChange={(event) => setQa((current) => ({ ...current, [selectedDirection.directionId]: { ...activeQa, mainProblem: event.target.value } }))}
                />
                <textarea
                  className="mt-3 h-20 w-full rounded-xl border border-zinc-300 p-3 text-sm"
                  placeholder="next_action"
                  value={activeQa.nextAction}
                  onChange={(event) => setQa((current) => ({ ...current, [selectedDirection.directionId]: { ...activeQa, nextAction: event.target.value } }))}
                />
              </Panel>

              <Panel title="7. Delivery Export">
                <p className="text-sm text-zinc-600">Exports Markdown with strategy pack, prompts, upload checklist, generation mode/results, QA sheet, and asset manifest. Generated base64 image data is intentionally excluded.</p>
                <button onClick={exportDelivery} className="mt-3 rounded-xl bg-[#2c2433] px-4 py-2 text-sm font-semibold text-white">Export Delivery Markdown</button>
              </Panel>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="text-2xl font-bold text-[#8b3f65]">{value}</div>
      <div className="mt-1 text-sm text-zinc-600">{label}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-50 p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function AssetUploader({ selectedDirection, onAddAsset }: { selectedDirection: Direction; onAddAsset: (file: File, sourceType: SourceType, referenceRole: ReferenceRole, claimRiskLevel: ClaimRiskLevel, directionScope: string) => void }) {
  const [sourceType, setSourceType] = useState<SourceType>('own_product');
  const [role, setRole] = useState<ReferenceRole>('product_truth_reference');
  const [risk, setRisk] = useState<ClaimRiskLevel>('unknown');
  const [scope, setScope] = useState(selectedDirection.directionId);

  useEffect(() => {
    setScope(selectedDirection.directionId);
  }, [selectedDirection.directionId]);

  return (
    <div className="rounded-2xl bg-zinc-50 p-4">
      <div className="grid gap-3 md:grid-cols-4">
        <label className="text-xs font-semibold">Source Type
          <select value={sourceType} onChange={(event) => setSourceType(event.target.value as SourceType)} className="mt-1 w-full rounded-xl border border-zinc-300 p-2">
            {sourceTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold">Reference Role
          <select value={role} onChange={(event) => setRole(event.target.value as ReferenceRole)} className="mt-1 w-full rounded-xl border border-zinc-300 p-2">
            {roles.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold">Claim Risk
          <select value={risk} onChange={(event) => setRisk(event.target.value as ClaimRiskLevel)} className="mt-1 w-full rounded-xl border border-zinc-300 p-2">
            {riskLevels.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold">Direction Scope
          <select value={scope} onChange={(event) => setScope(event.target.value)} className="mt-1 w-full rounded-xl border border-zinc-300 p-2">
            <option value={selectedDirection.directionId}>{selectedDirection.directionName}</option>
            <option value="all">all</option>
          </select>
        </label>
      </div>
      <input
        className="mt-3 block w-full rounded-xl border border-dashed border-zinc-300 p-3 text-sm"
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onAddAsset(file, sourceType, role, risk, scope);
          event.currentTarget.value = '';
        }}
      />
      <p className="mt-2 text-xs text-zinc-600">Governance rule: competitor + product_truth_reference will be blocked.</p>
    </div>
  );
}
