# SKIN_GUIDE

Thư mục skin modular: `src/game/renderer/skins/` (`types.ts`, `registry.ts`, `_template.ts`).
Skin có trong `MODULAR_SKINS` sẽ ghi đè code cũ trong `gear.ts`; skin không có vẫn chạy code cũ.

## Interface (src/game/renderer/skins/types.ts)
```ts
interface SkinRenderContext {
  ctx: CanvasRenderingContext2D;
  joints: SkeletonJoints; // hip, spineMid, neck, head, shoulderL/R, elbowL/R, handL/R, kneeL/R, footL/R (Vec2 {x,y}), weaponAngle
  skinId: SkinId;
  characterId?: CharacterId;
  awakened: boolean;
  time: number;           // giây
  headR?: number;         // chỉ có ở drawFrontLayer
  headGear?: Exclude<StickmanRenderOptions['headGear'], 'none'>; // chỉ drawFrontLayer
  palette?: SkinInkPalette;
}
interface SkinModule { id: SkinId; drawBackLayer?; drawBody?; drawWeapon?; drawFrontLayer? }
```
- Tọa độ LOCAL: hip ≈ (0,-48), spineMid ≈ (0,-64), neck ≈ (0,-80), head ≈ (0,-90); y âm = hướng lên.
- Hướng (facing)/vị trí/scale đã được áp vào `ctx` trước khi gọi, không có trường facing.
- Dispatch: back→`renderSkinBackAttachment`, body→`renderSkinBodyArmor`, front→`renderHeroHeadGear`.
  `drawWeapon` chưa được gọi từ gear.ts (vũ khí nằm ở `weapons.ts`). Các hàm awakened (`renderAwakenedBackForm/HeadForm`) chưa hook.

## Đăng ký skin mới (3 bước)
1. Thêm ID vào union `SkinId` trong `src/game/types.ts`, copy `_template.ts` → `skins/<id>.ts`, đổi `id`.
2. Trong `registry.ts`: `import { mySkin } from './my_skin';`
3. Trong `MODULAR_SKINS`: `my_skin: mySkin,`

## Skin ID hiện có
default, radiant_seraph, void_walker, eclipse_ronin, storm_shogun, cyber_valkyrie, solar_phoenix, frost_empress, blood_moon, astral_phantom, prismatic_archon, celestial_empress, abyssal_valkyrie, void_shatterer, chrono_sovereign
