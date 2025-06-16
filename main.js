(async function () {
  'use strict';

  const configUrl = 'https://tampermonkey-plugins.vercel.app/config.json';

  try {
    const res = await fetch(configUrl);
    const config = await res.json();

    for (const plugin of config.plugins) {
      if (plugin.enabled) {
        const script = document.createElement('script');
        script.src = plugin.url + '?t=' + Date.now(); // 防缓存
        script.onload = () => console.log(`✅ 插件加载成功: ${plugin.name}`);
        script.onerror = () => console.error(`❌ 插件加载失败: ${plugin.name}`);
        document.body.appendChild(script);
      }
    }
  } catch (err) {
    console.error('❌ 加载配置失败：', err);
  }
})();
