/** 手工限定的原始 ID；不通过宽泛名称匹配扩展。 / Curated original IDs; no broad name matching. */
const pair = (...ids) => ids.flatMap((id) => [id, `${id}M`]);
const group = (id, zh, en, region, layer, structureIds) => ({ id, name: { zh, en }, region, layer, structureIds,
  ...(!structureIds.length ? { missing: { zh: '现有来源无该结构网格；不合成替代。', en: 'No mesh for this structure in the existing source; no synthetic substitute.' } } : {}) });
export const regions = [
  ['neck','颈部','Neck'],['shoulder','肩背','Shoulder and upper back'],['torso','躯干','Torso'],
  ['arm','上肢','Arm'],['hip','髋臀','Hip'],['thigh','大腿','Thigh'],['leg','小腿','Lower leg'],
].map(([id,zh,en]) => ({id,name:{zh,en}}));
export const groups = [
  group('trapezius','斜方肌','Trapezius','neck','superficial',pair('FJ1520','FJ1521','FJ1554')),
  group('sternocleidomastoid','胸锁乳突肌','Sternocleidomastoid','neck','superficial',['FJ1573','FJ1595']),
  group('levator-scapulae','肩胛提肌','Levator scapulae','neck','deep',pair('FJ1532')),
  group('deltoid','三角肌','Deltoid','shoulder','superficial',pair('FJ1467','FJ1468','FJ1513')),
  group('supraspinatus','冈上肌','Supraspinatus','shoulder','deep',pair('FJ1506')),
  group('infraspinatus','冈下肌','Infraspinatus','shoulder','deep',pair('FJ1500')),
  group('teres-minor','小圆肌','Teres minor','shoulder','deep',pair('FJ1508')),
  group('subscapularis','肩胛下肌','Subscapularis','shoulder','deep',pair('FJ1504')),
  group('latissimus-dorsi','背阔肌','Latissimus dorsi','shoulder','superficial',['BP3D3_FMA13358','BP3D3_FMA13359']),
  group('rhomboids','菱形肌群','Rhomboids','shoulder','deep',pair('FJ1536','FJ1537')),
  group('pectoralis-major','胸大肌','Pectoralis major','torso','superficial',pair('FJ1446','FJ1447','FJ1464')),
  group('serratus-anterior','前锯肌','Serratus anterior','torso','superficial',pair('FJ1459')),
  group('rectus-abdominis','腹直肌','Rectus abdominis','torso','superficial',['BP3D3_FMA13377','BP3D3_FMA13378']),
  group('external-oblique','腹外斜肌','External oblique','torso','superficial',pair('FJ1452')),
  group('internal-oblique','腹内斜肌','Internal oblique','torso','deep',['BP3D3_FMA13892','BP3D3_FMA13893']),
  group('erector-spinae','竖脊肌群','Erector spinae','torso','deep',pair('FJ1526','FJ1527','FJ1528','FJ1533','FJ1534','FJ1535','FJ1543','FJ1544')),
  group('quadratus-lumborum','腰方肌','Quadratus lumborum','torso','deep',['BP3D3_FMA22348','BP3D3_FMA22349']),
  group('biceps-brachii','肱二头肌','Biceps brachii','arm','superficial',pair('FJ1478','FJ1512')),
  group('brachialis','肱肌','Brachialis','arm','deep',pair('FJ1486')),
  group('triceps-brachii','肱三头肌','Triceps brachii','arm','superficial',pair('FJ1477','FJ1479','FJ1480')),
  group('brachioradialis','肱桡肌','Brachioradialis','arm','superficial',pair('FJ1487')),
  group('wrist-flexors','腕屈肌群','Wrist flexors','arm','superficial',pair('FJ1473','FJ1496','FJ1502','FJ1518')),
  group('wrist-extensors','腕伸肌群','Wrist extensors','arm','superficial',pair('FJ1472','FJ1489','FJ1490','FJ1517')),
  group('gluteus-maximus','臀大肌','Gluteus maximus','hip','superficial',pair('FJ1418')),
  group('gluteus-medius','臀中肌','Gluteus medius','hip','deep',pair('FJ1419')),
  group('gluteus-minimus','臀小肌','Gluteus minimus','hip','deep',pair('FJ1420')),
  group('iliopsoas','髂腰肌','Iliopsoas','hip','deep',pair('FJ1422','FJ1431')),
  group('piriformis','梨状肌','Piriformis','hip','deep',pair('FJ1428')),
  group('hip-adductors','髋内收肌群','Hip adductors','hip','deep',pair('FJ1401','FJ1402','FJ1403','FJ1404','FJ1421','FJ1427')),
  group('rectus-femoris','股直肌','Rectus femoris','thigh','superficial',pair('FJ1433')),
  group('vastus-lateralis','股外侧肌','Vastus lateralis','thigh','superficial',pair('FJ1442')),
  group('vastus-medialis','股内侧肌','Vastus medialis','thigh','superficial',pair('FJ1443')),
  group('vastus-intermedius','股中间肌','Vastus intermedius','thigh','deep',pair('FJ1441')),
  group('biceps-femoris','股二头肌','Biceps femoris','thigh','superficial',pair('FJ1395','FJ1444')),
  group('semitendinosus','半腱肌','Semitendinosus','thigh','superficial',pair('FJ1436')),
  group('semimembranosus','半膜肌','Semimembranosus','thigh','deep',pair('FJ1435')),
  group('gastrocnemius','腓肠肌','Gastrocnemius','leg','superficial',pair('FJ1394','FJ1397')),
  group('soleus','比目鱼肌','Soleus','leg','deep',pair('FJ1437')),
  group('tibialis-anterior','胫骨前肌','Tibialis anterior','leg','superficial',pair('FJ1439')),
  group('fibularis','腓骨肌群','Fibularis','leg','deep',pair('FJ1409','FJ1410','FJ1411')),
];
const absent = { zh: '现有来源无独立肌腱网格；不以肌腹冒充。', en: 'No separate tendon mesh in the existing source; muscle bellies are not substitutes.' };
export const tendons = [
  {id:'achilles',name:{zh:'跟腱',en:'Achilles tendon'},structureIds:pair('FJ1405')},
  {id:'rotator-cuff',name:{zh:'肩袖肌腱',en:'Rotator cuff tendons'},structureIds:[],missing:absent},
  {id:'biceps-long-head',name:{zh:'肱二头肌长头腱',en:'Long head of biceps tendon'},structureIds:[],missing:absent},
  {id:'quadriceps',name:{zh:'股四头肌腱',en:'Quadriceps tendon'},structureIds:[],missing:absent},
];
export const initialGroupIds = groups.filter((g) => g.layer === 'superficial' && !g.id.startsWith('wrist-')).map((g) => g.id);

// 浅层肌群中被覆盖的肌头仍按需加载。 / Covered heads within superficial groups remain on demand.
export const initialExcludedStructureIds = ['FJ1480','FJ1480M','FJ1444','FJ1444M'];
