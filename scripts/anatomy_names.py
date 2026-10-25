"""经人工限定的常见解剖译名 / Curated translations for common anatomy only."""
BASE_NAMES = {
    "biceps brachii": "肱二头肌", "triceps brachii": "肱三头肌",
    "deltoid": "三角肌", "pectoralis major": "胸大肌",
    "rectus femoris": "股直肌", "vastus intermedius": "股中间肌",
    "vastus lateralis": "股外侧肌", "vastus medialis": "股内侧肌",
    "gluteus maximus": "臀大肌", "gluteus medius": "臀中肌", "gluteus minimus": "臀小肌",
    "biceps femoris": "股二头肌", "semitendinosus": "半腱肌", "semimembranosus": "半膜肌",
    "gastrocnemius": "腓肠肌", "soleus": "比目鱼肌",
    "adductor brevis": "短收肌", "adductor longus": "长收肌", "adductor magnus": "大收肌",
    "adductor minimus": "小收肌", "gracilis": "股薄肌", "pectineus": "耻骨肌",
    "rhomboid major": "大菱形肌", "rhomboid minor": "小菱形肌", "trapezius": "斜方肌",
    "external oblique": "腹外斜肌", "supraspinatus": "冈上肌", "infraspinatus": "冈下肌",
    "subscapularis": "肩胛下肌", "teres minor": "小圆肌", "teres major": "大圆肌",
    "iliocostalis cervicis": "颈髂肋肌", "iliocostalis lumborum": "腰髂肋肌",
    "iliocostalis thoracis": "胸髂肋肌", "longissimus capitis": "头最长肌",
    "longissimus cervicis": "颈最长肌", "longissimus thoracis": "胸最长肌",
    "spinalis": "棘肌", "spinalis thoracis": "胸棘肌",
    "extensor carpi radialis brevis": "桡侧腕短伸肌", "extensor carpi radialis longus": "桡侧腕长伸肌",
    "flexor carpi radialis": "桡侧腕屈肌", "flexor carpi ulnaris": "尺侧腕屈肌",
    "flexor digitorum superficialis": "指浅屈肌", "palmaris longus": "掌长肌",
    "pronator teres": "旋前圆肌", "brachialis": "肱肌", "brachioradialis": "肱桡肌",
    "calcaneal tendon": "跟腱", "tibialis anterior": "胫骨前肌", "tibialis posterior": "胫骨后肌",
    "sartorius": "缝匠肌", "serratus anterior": "前锯肌", "sternocleidomastoid": "胸锁乳突肌",
    "scapula": "肩胛骨", "humerus": "肱骨", "radius": "桡骨", "ulna": "尺骨",
    "femur": "股骨", "tibia": "胫骨", "fibula": "腓骨", "patella": "髌骨",
    "clavicle": "锁骨", "sternum": "胸骨", "sacrum": "骶骨",
}
PARTS = {
    "long head of ": "长头", "short head of ": "短头", "medial head of ": "内侧头",
    "lateral head of ": "外侧头", "humeral head of ": "肱骨头", "ulnar head of ": "尺骨头",
    "clavicular part of ": "锁骨部", "acromial part of ": "肩峰部", "spinal part of ": "肩胛冈部",
    "sternocostal part of ": "胸肋部", "abdominal part of ": "腹部",
    "transverse part of ": "横部", "ascending part of ": "升部", "descending part of ": "降部",
}
def chinese_name(name, side):
    clean = name.replace("right ", "").replace("left ", "")
    if clean.endswith(" muscle"):
        clean = clean[:-7]
    suffix = ""
    for prefix, translated in PARTS.items():
        if clean.startswith(prefix):
            clean, suffix = clean[len(prefix):], translated
            break
    base = BASE_NAMES.get(clean)
    if not base:
        return None
    return {"left": "左侧", "right": "右侧", "midline": ""}[side] + base + suffix
