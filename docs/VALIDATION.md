# 验证记录 / Validation record

## 自动检查 / Automated checks

- 官方 Cocos Creator 3.8.8 Web Desktop 构建成功（退出码36），官方声明文件严格类型检查通过。/ Official Cocos Creator 3.8.8 Web Desktop build succeeded (exit 36), with strict checking against official declarations.
- 后端6项、前端10项、学习目录8项测试通过；617个网格、2,865,336个三角形通过模型校验。/ Six backend, ten frontend and eight learning-data tests passed;617 meshes and2,865,336 triangles passed model validation.
- 学习目录32组、25动作、10类损伤，精确关联110个结构；来源、组织类型、稳定ID和缺失说明通过校验。/ The catalog has 32 groups,25 exercises and 10 conditions mapping 110 structures; sources, tissue types, stable IDs and missing-coverage notes passed validation.
- 原有533个网格文件逐字节保持不变；扩充肌头和肌肉分区时固定v1坐标系，避免重新居中导致整体偏移。/ All original 533 mesh files remain byte-identical; the fixed v1 frame prevents recentering shifts when adding muscle heads/zones.
- `npm run check:built --prefix creator`运行实际官方构建中的纯目录模块，验证二头肌4个、小腿6个、引体向上12个且部分覆盖。该检查捕获并修复了Cocos宽松编译将Set展开转换为concat的缺陷；双指迭代器也改为Array.from。/ `npm run check:built --prefix creator` executes the pure catalog module from the official bundle, checking biceps 4, calf 6 and pull-up 12 with partial coverage. It caught and fixed Cocos loose spread compiling Set spread as concat; two-finger iterators also use Array.from.

## 浏览器验收 / Browser acceptance

- 手机390×844和桌面1280×800采用全幅模型及按需抽屉，默认不展示并排翻译。控件移至边缘，模型使用窄边距取景。/ At 390×844 phone and1280×800 desktop, the model uses the full view with on-demand drawers and no parallel translations. Controls sit at the edges and framing uses narrow margins.
- 中英文切换保留当前结构、目录项及未保存备注；中文肌肉名和英文源名随语言显示，未核对名称保留单个源英文名。/ Switching language preserves the structure, catalog entry and unsaved notes; reviewed Chinese labels and English source names follow locale, while unreviewed names retain one English source label.
- 实际点击“杠铃弯举”保留完整人体并高亮4个结构；“小腿后侧肌群拉伤”匹配6个并展示NHS来源；“引体向上”匹配12个并明确标出背阔肌缺失。/ Clicking Barbell Bicep Curl retained the whole body and highlighted 4 structures; Calf Strain matched 6 and showed its NHS source; Pull-Up matched 12 and explicitly disclosed missing latissimus dorsi.
- 前一轮已验证账户注册、肌肉／肌腱日志创建、编辑、确认删除和刷新持久化；几何点击、旋转和缩放已通过。测试使用独立端口与数据库。/ Previous acceptance confirmed registration, muscle/tendon record creation, editing, confirmed deletion and reload persistence, plus mesh picking, orbit and zoom. Tests use a separate port and database.

## 限制 / Limits

以上为桌面浏览器及手机尺寸模拟，不等于iOS／Android真机认证。真实多点触摸、软键盘、安全区、帧率、峰值内存及蜂窝网络仍需真机验证。部分肌肉与肌腱缺少来源网格，条目会显示部分覆盖；关联仅用于解剖学习，不提供诊断或治疗建议。

These are desktop browser and phone-sized checks, not physical iOS/Android certification. Hardware multi-touch, keyboards, safe areas, frame rate, peak memory and cellular loading still need device testing. Some muscles/tendons lack source meshes and are explicitly marked as partial coverage; associations teach anatomy and do not provide diagnosis or treatment advice.
