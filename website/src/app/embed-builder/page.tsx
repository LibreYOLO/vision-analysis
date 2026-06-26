import type { Metadata } from 'next';
import { getModels, getHardwareOptions, getRuntimeOptions } from '@/lib/data';
import { getFamilyColor } from '@/lib/utils/colors';
import { BuilderClient, type BuilderModel } from './BuilderClient';

export const metadata: Metadata = {
  title: 'Embed Builder - Vision Analysis',
  description:
    'Build an embeddable accuracy-vs-parameters chart for any model. Configure the highlighted models, theme and data source, then copy a snippet for your article or docs.',
};

export default function EmbedBuilderPage() {
  const models: BuilderModel[] = getModels()
    .filter(m => m.task === 'detection')
    .map(m => ({
      id: m.id,
      displayName: m.displayName,
      family: m.family,
      color: getFamilyColor(m.family),
      paramsM: m.specs.paramsM,
    }))
    .sort((a, b) => (a.family === b.family ? a.paramsM - b.paramsM : a.family.localeCompare(b.family)));

  const hardwareOptions = getHardwareOptions();
  const runtimesByHw: Record<string, Array<{ value: string; label: string }>> = {};
  for (const h of hardwareOptions) {
    runtimesByHw[h.value] = getRuntimeOptions(h.value);
  }

  return (
    <BuilderClient
      models={models}
      hardwareOptions={hardwareOptions}
      runtimesByHw={runtimesByHw}
    />
  );
}
