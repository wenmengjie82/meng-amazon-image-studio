# Strategy-Pack Image Studio

A workflow execution tool for ecommerce image teams that already have image planning, Prompt Contracts, Runtime Packs, and QA Gates.

This project is a second-development direction inspired by `amazon-image-studio`, but the workflow is different.

## What this app is

Strategy-Pack Image Studio turns a prepared image strategy pack into controlled image-generation tasks:

1. Import or load a Strategy Pack.
2. Select an image direction.
3. Upload assets with explicit roles.
4. Preview the generation prompt and negative prompt.
5. Run mock generation or call a server-side image provider.
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

Mock generation is the default and does not require credentials.

For real generation, copy the variable names from `.env.example` into `.env.local` and provide a server-side API key:

```text
OPENAI_API_KEY=your_server_side_key
OPENAI_IMAGE_MODEL=gpt-image-2
OPENAI_IMAGE_SIZE=1024x1024
OPENAI_IMAGE_QUALITY=low
```

Never use a `NEXT_PUBLIC_` prefix for the API key. The browser calls `/api/generate`; only the server adapter calls the external image provider.

The v0.2 adapter sends the Strategy Pack prompt contract and governed asset metadata. It does not yet upload local image bytes to the provider.

## Sample pack

The sample strategy pack is stored at:

```text
data/examples/hs915_test_run_01_strategy_pack.json
```

It includes two first-round test directions:

1. Easy Operation / Beginner Friendly
2. Product Detail / Structural Clarity

## Deployment notes

This MVP is safe to deploy on Vercel. It uses browser state and a protected `/api/generate` route. Configure server-side environment variables in the deployment platform before enabling real generation.

## Acceptance criteria

The MVP passes if:

1. User can load the sample strategy pack.
2. User can see two directions.
3. User can upload assets with explicit roles.
4. System blocks competitor images from product truth role.
5. User can preview prompt and negative prompt.
6. Mock generation works without credentials.
7. Real generation reports a clear error when the server API key is missing.
8. Generation never marks QA as passed or failed automatically.
9. User can complete QA Gate manually.
10. User can export generation mode/results with delivery files.
11. No final commercial approval labels are used.
