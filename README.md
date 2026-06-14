# Strategy-Pack Image Studio

A workflow execution tool for ecommerce image teams that already have image planning, Prompt Contracts, Runtime Packs, and QA Gates.

This project is a second-development direction inspired by `amazon-image-studio`, but the workflow is different.

## What this app is

Strategy-Pack Image Studio turns a prepared image strategy pack into controlled image-generation tasks:

1. Import or load a Strategy Pack.
2. Select an image direction.
3. Upload assets with explicit roles.
4. Preview the generation prompt and negative prompt.
5. Run mock generation or copy the prompt to an image tool.
6. Complete a QA Gate.
7. Export delivery files for review and project closure.

## What this app is not

- Not a listing-bullets-first image planner.
- Not a final Amazon-ready image approval system.
- Not a claim-compliance authority.
- Not a replacement for human product-truth QA.
- Not a final retouching or compression pipeline.

Every task in this MVP is marked `structure_generation_test_only`.

## Difference from amazon-image-studio

Original style:

```text
Listing title / bullet points / description
→ AI image planning
→ image generation
```

This system:

```text
Strategy Pack / Prompt Contract / Runtime Pack
→ role-based asset upload
→ controlled image generation
→ QA Gate
→ result log
→ delivery export
```

## Asset roles

Every uploaded image must have a role:

- `product_truth_reference`: own product truth only. Competitor images are blocked from this role.
- `layout_reference`: learn layout, hierarchy, card structure, spacing.
- `action_reference`: learn motion relationship and hand/product/hair interaction.
- `detail_callout_reference`: learn crop logic, callout placement, connection lines.
- `style_reference`: learn lighting, background, tone, premium Amazon visual style.
- `claim_boundary_reference`: use only as risk warning or forbidden example.

## MVP pages

The current MVP is a single-page Next.js app with these sections:

- Project dashboard
- Strategy Pack loader
- Direction workspace
- Asset role governance
- Prompt preview
- QA review
- Delivery export

## Run locally

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Sample pack

The sample strategy pack is stored at:

```text
data/examples/hs915_test_run_01_strategy_pack.json
```

It includes two first-round test directions:

1. Easy Operation / Beginner Friendly
2. Product Detail / Structural Clarity

## Deployment notes

This MVP is safe to deploy on Vercel. It uses browser state and mock generation only. Real image generation API integration should be added later through a protected API route.

## Acceptance criteria

The MVP passes if:

1. User can load the sample strategy pack.
2. User can see two directions.
3. User can upload assets with explicit roles.
4. System blocks competitor images from product truth role.
5. User can preview prompt and negative prompt.
6. User can mark generation as `not_generated` or `mock_generated`.
7. User can complete QA Gate.
8. User can export or copy delivery files.
9. No `final_pass`, `commercial_pass`, `listing_ready`, or `approved_for_amazon` labels are used.
