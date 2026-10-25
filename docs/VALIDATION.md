# 验证记录 / Validation record

- 官方 Cocos Creator 3.8.8 Web Desktop 构建成功，退出码 36。/ Official Cocos Creator 3.8.8 Web Desktop build succeeded with exit code 36.
- 后端 6 项集成测试、前端 7 项几何／日期／视区与手势测试通过；使用官方 cc.d.ts 的严格类型检查通过。/ Six backend integration tests, seven frontend geometry/date/layout/gesture tests and strict checking against official cc.d.ts passed.
- 533 个网格、2,605,182 个三角形通过哈希、索引和坐标验证。/ 533 meshes and 2,605,182 triangles passed digest, index and coordinate validation.
- 手机尺寸浏览器验收通过：390×844 竖屏下，底部导航、结构面板、选择后回到模型、日志入口、账户注册、肌腱记录新增／编辑／确认删除、肌肉记录保存正常；测试使用独立端口与数据库。/ Phone-sized browser checks passed at 390×844: bottom navigation, structure sheet, return to model after selection, journal access, registration, tendon-record creation/editing/confirmed deletion and muscle-record creation. Tests used a separate port and database.
- 三维交互已确认：背面切换、拖动旋转、滚轮缩放和实际网格点击（选中 left soleus）。844×390 横屏无横向溢出，日志面板可滚动并关闭。/ 3D checks confirmed back view, drag rotation, wheel zoom and actual mesh picking (left soleus). At 844×390 landscape there was no horizontal overflow; the journal sheet scrolled and closed correctly.
- 最终亮色构建已确认整屏背景一致；360×640 窄屏面板和底部导航无横向溢出；1280×800 桌面保留三栏且隐藏移动导航。运行时未发现控制台错误／警告。/ The final light build has a consistent full-screen background; 360×640 sheets/navigation do not overflow horizontally; 1280×800 desktop retains three columns and hides mobile navigation. No runtime console errors/warnings were observed.
- 上次浏览器输入异常已恢复，以上检查取代该阻塞状态。/ The earlier browser input failure has recovered; these checks supersede that blocked status.
- 此验收为桌面浏览器的手机尺寸模拟，不是 iOS／Android 真机测试。真实多点触摸、软键盘、安全区、帧率、峰值内存及蜂窝网络加载仍待真机验证；未发布原生安装包。/ This is phone-sized desktop browser testing, not physical iOS/Android device testing. Real multi-touch, keyboards, safe areas, frame rate, peak memory and cellular loading remain unverified on hardware; no native package is published.
