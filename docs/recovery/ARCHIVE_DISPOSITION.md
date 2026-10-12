# ECC archive disposition

Owner: Grok. Lane: ECC-C5-V1.  
Refreshed from current main `9c1bd5348950aec4f0851149f1fce36f1876a74a`.  
Final head: `79a09aff9c64520c41ca3e71bade4f11e63272c8` (post-refresh).

## Reconciliation

Historical inventory: 38 `snapshots/*.zip` (1,872,115 bytes), 7 `*.bak`/`*.backup`, 1 root `*.tgz`.  
Current tracked tree after prior removal and refresh: exactly 38 ZIP + 1 TGZ. All 7 code backups were removed in the prior commit on this branch (blob SHAs recorded below). Counts match measured evidence. No new archives introduced by the refresh.

## Removed code backups (proven redundant; already deleted)

| Path | Bytes | Former blob SHA | Classification | Disposition | Replacement source |
|------|------:|-----------------|----------------|-------------|--------------------|
| package.json.bak | 979 | f99c89867a775da988889baa07ed9a40b10d9aa5 | Code backup | Removed | package.json (differs) |
| vite.config.js.backup | 1195 | 559fd33b00c8baf1e6728c20edddfdce22829b0e | Code backup | Removed | vite.config.js (differs) |
| scripts/guardrail-check.mjs.bak | 3634 | 118ba1662979aa94275ad91e9738e638b912bffc | Code backup | Removed | scripts/guardrail-check.mjs (differs) |
| server/index.ts.bak | 26328 | b4085eed70087f1ada73c592466eacefe97f0c8d | Code backup | Removed | server/index.ts (differs) |
| server/index.ts.backup | 1621 | b1a9c50d9aa6e3557a9ab32f66cd03fb7d7a5730 | Code backup | Removed | server/index.ts (differs) |
| server/lib/mapping.ts.bak | 1471 | 2dfd282f298728137c44b29301c9024cf8c65b6c | Code backup | Removed | server/lib/mapping.ts (identical) |
| server/routes/rpc.ts.bak | 7184 | 0d0fcca3e2bd7d6cd6aaeede1eb5d9908814edb3 | Code backup | Removed | server/routes/rpc.ts (differs) |

Git history retains the blobs. No business, legal, or financial content. Rollback: restore from blob SHA or revert the removal commit.

## Retained recovery archives (uncertain; preserved)

All listed individually. Provenance: historical snapshot/recovery scripts and Replit-era export. Source references limited to snapshot tooling and .gitignore. Classification: recovery originals. Disposition: retained. Next action: owner decision to move to external archival storage or remove in a future dedicated PR after confirming no unique recovery value remains. Safe member-name inspection performed (src fragments, .local state, attached_assets); no secrets or private records printed.

| Path | Bytes | Blob SHA |
|------|------:|----------|
| estate_backup_20250829_073941.tgz | 358403 | 6ec99ba26d0a7eef0f7b2b64b18ed8dfdfea2c5d |
| snapshots/ecc_genesis_force_1756609522.zip | 48444 | 8c88680de6b8fa7e1f2350683687a846ab861fc6 |
| snapshots/ecc_genesis_nav_logo_fix_1756610781.zip | 49626 | d4ea056ce37da1b374c53ff2aa51cb81401d1ead |
| snapshots/ecc_genesis_nav_logo_fix_1756610801.zip | 49577 | 76e968942379cca3d109764a43199eb46667bc06 |
| snapshots/ecc_genesis_polish_1756609884.zip | 48724 | 45ed8325692a6c4b784fd197c0efa2ab5ac4183b |
| snapshots/ecc_genesis_ui_1756609333.zip | 48424 | 8946bb8f1b61ef07a2623b8868ca6a1cd1be1004 |
| snapshots/ecc_genesis_ui_1756609369.zip | 48444 | 0e63540790b64d452fc95cd8dc2ce0542ab3bd8c |
| snapshots/ecc_nav_fix_lock_1756612750.zip | 51263 | 5f0c9e7546528817508261b0f3185e3c34ef6ef3 |
| snapshots/ecc_nav_fix_v4_1756612616.zip | 50659 | 0e586bd1c2d32dce2150b39f9c878251212eb631 |
| snapshots/ecc_nav_flyout_hotfix_1756611382.zip | 48737 | d328607bcfab96a71b0abda7dca84a00e0a973ff |
| snapshots/ecc_nav_forcefix_1756612862.zip | 51837 | 59551909283b047a61970a77bfbfc3776c9e9895 |
| snapshots/ecc_nav_full_1756606147.zip | 46994 | f73a4df4966f3a757b83efc95ca4384015a64e32 |
| snapshots/ecc_nav_icons_guardrails_1756605805.zip | 46552 | 4d865864e4f960c782a774b08e9e2e25b64e4ca0 |
| snapshots/ecc_nav_icons_guardrails_1756605868.zip | 46552 | 4d865864e4f960c782a774b08e9e2e25b64e4ca0 |
| snapshots/ecc_nav_polish_1756611730.zip | 49190 | 6a7d7ef6498f8029fd936af56d0c10c93b35807d |
| snapshots/ecc_nav_polish_v2_1756612097.zip | 49628 | 14476a0a1a842bb08116c62b685e257b65983aa6 |
| snapshots/ecc_nav_polish_v3_1756612496.zip | 50116 | f79a0823bce6fc8b6af0c15725483e8b32d9e98b |
| snapshots/ecc_nav_restore_1756618189.zip | 56274 | 3f9f5e6ff1b3537fd67e52a3ad079c666078e570 |
| snapshots/ecc_restore_nav_theme_1756611033.zip | 49577 | 8ae7512c9d0f183d8e25ca2b5b8b9a4dcd13106a |
| snapshots/ecc_sidebar_1756615802.zip | 54238 | 1e7bb93bb1b920def82e63f961cedc9d510e34c3 |
| snapshots/ecc_sidebar_finalfix_1756614351.zip | 52714 | a66408fdf61a677116d9da1f726e7aa3b6af1ed2 |
| snapshots/ecc_sidebar_fix_1756614876.zip | 53576 | 803444b228c1ca60d641ff4612cbe989a776c8a6 |
| snapshots/ecc_sidebar_scroll_alignment_1756614634.zip | 53361 | f346cd25c6c602a7a269fece69b7888e00684709 |
| snapshots/ecc_style_repair_1756605420.zip | 46631 | eb8f896a612d09ca5c7ea74be415d0507ef533da |
| snapshots/ecc_white_screen_reset_1756605699.zip | 46902 | ba20c2f790ec9eb7419c1b09895118f66dd0e19a |
| snapshots/fix_sidebar_1756616777.zip | 55023 | 08e6735c291c4678e3f5a4e67fb27e24be580222 |
| snapshots/pre_css_lock_1756601423.zip | 51283 | eab4324f81ee758266a9d9a13970876e32f119fa |
| snapshots/pre_css_lock_1756601484.zip | 51349 | d0761d1e836353678d5efcb816f39bcbf72b48d9 |
| snapshots/pre_nav_fix_1756615961.zip | 54901 | 17da54ddcc32ba4bea9681f3d3863231fb9206ce |
| snapshots/pre_runtime_hotfix_1756601714.zip | 51349 | d0761d1e836353678d5efcb816f39bcbf72b48d9 |
| snapshots/pre_runtime_hotfix_1756601834.zip | 52354 | 895fdf520e07f7100ba243fdfe1811b85e895b01 |
| snapshots/pre_sidebar_nav_sweep_1756616058.zip | 54903 | 6d7db688c74c42221c785cb279cf0584a6f41c48 |
| snapshots/pre_sidebar_rewrite_1756616277.zip | 2004 | 850b49e92d2e2ca0a796e926859e51b2f9331058 |
| snapshots/pre_sidebar_wouter_1756616543.zip | 54420 | d24ed59832b235fb682c6b6fe7d9da6fc656e5ab |
| snapshots/pre_theme_fix_1756602675.zip | 52388 | 0d34fac381de3cf5aef49d2060f8dffd1158d5ff |
| snapshots/restore_nav_1756604534.zip | 49596 | de1584fc07cb1134f120fa8fa1723a645b3a3106 |
| snapshots/restore_nav_1756604644.zip | 48404 | 320182fbedc5ca554eebf9567c8498e526f66ca6 |
| snapshots/restore_nav_hard_1756604817.zip | 48407 | 00ddf60dd9591b1d7de9551b8dd340281e013945 |
| snapshots/white_screen_fix_1756604966.zip | 47694 | c4955009d602f4d4f243cd067fa71c25d8da9f81 |

Total ZIP bytes: 1,872,115. Duplicate blob SHAs noted (identical content pairs).

## Source-reference checks

`git grep` (excluding the archives themselves) finds references only in `.gitignore`, `scripts/guardrail-check.mjs`, and `scripts/snapshot.cjs`. No active product source depends on the retained archives.

## Validation

Guardrail and build re-run on this refreshed head. Runtime/database validation not performed. Existing CI only.

## Rollback

Revert the removal commit to restore code backups from history. Archives remain. No history rewrite.
