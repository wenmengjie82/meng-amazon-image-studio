import type { ReferenceRole } from '@/types/workflow';

export const rolePermissions: Record<ReferenceRole, { title: string; allowedUse: string; forbiddenUse: string }> = {
  product_truth_reference: {
    title: 'Product Truth Reference｜产品真值图',
    allowedUse: 'Lock own product shape, color, structure, buttons, vents, cord, screen, and proportions.',
    forbiddenUse: 'Competitor images cannot be used as product truth.'
  },
  layout_reference: {
    title: 'Layout Reference｜版式参考图',
    allowedUse: 'Learn layout, hierarchy, card structure, spacing, and callout rhythm.',
    forbiddenUse: 'Do not learn competitor product shape, logo, packaging, copy, claim, or specs.'
  },
  action_reference: {
    title: 'Action Reference｜动作参考图',
    allowedUse: 'Learn motion relationship, hand-product-hair interaction, and action clarity.',
    forbiddenUse: 'Do not copy exact competitor hand pose or competitor product structure.'
  },
  detail_callout_reference: {
    title: 'Detail Callout Reference｜细节说明参考图',
    allowedUse: 'Learn crop logic, callout placement, connection lines, and label hierarchy.',
    forbiddenUse: 'Do not copy competitor part names, material claims, or mechanism claims.'
  },
  style_reference: {
    title: 'Style Reference｜风格参考图',
    allowedUse: 'Learn lighting, background, tone, and premium Amazon visual style.',
    forbiddenUse: 'Do not copy competitor logo, packaging, or brand-color identity.'
  },
  claim_boundary_reference: {
    title: 'Claim Boundary Reference｜风险反例图',
    allowedUse: 'Use as risk warning or forbidden example only.',
    forbiddenUse: 'Do not use as positive prompt, claim source, or product truth.'
  }
};

export const disallowedResultLabels = ['final_pass', 'commercial_pass', 'listing_ready', 'approved_for_amazon'];
