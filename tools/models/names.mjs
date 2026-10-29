/** 个体展示名：仅使用已确认译名；未知名称保留英文。 / Individual labels: use confirmed translations, retaining English when unknown. */
const translations = {
  'levator scapulae': '肩胛提肌',
  iliacus: '髂肌',
  'psoas major': '腰大肌',
  piriformis: '梨状肌',
  'fibularis brevis': '腓骨短肌',
  'fibularis longus': '腓骨长肌',
  'fibularis tertius': '第三腓骨肌',
};
export function catalogName(source) {
  const side = {left:'左侧',right:'右侧',midline:''}[source.side];
  const clean = source.nameEn.replace(/\b(left|right)\s/g,'');
  const wristMesh = source.id.replace(/M$/,'') === 'FJ1472' ? 1 : source.id.replace(/M$/,'') === 'FJ1517' ? 2 : null;
  if (wristMesh) return {
    zh: `${side}尺侧腕伸肌（来源网格${wristMesh}）`,
    en: `${source.nameEn} (source mesh ${wristMesh})`,
  };
  return {
    zh: source.nameZh || (translations[clean] ? `${side}${translations[clean]}` : source.nameEn),
    en: source.nameEn,
  };
}
