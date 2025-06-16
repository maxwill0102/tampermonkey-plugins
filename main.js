(async function () {
  'use strict';

  const CONFIG_URL = 'https://tampermonkey-plugins.vercel.app/config.json';

  async function loadPlugin(url) {
    const script = document.createElement('script');
    script.src = url + '?t=' + Date.now();
    document.body.appendChild(script);
  }

  try {
    const config = await fetch(CONFIG_URL).then(res => res.json());

    if (!config.authorized) {
      alert('未授权用户，请联系管理员开通权限');
      return;
    }

    for (const plugin of config.enabledModules) {
      await loadPlugin(plugin);
    }

    console.log('[插件壳] 插件加载完成');
  } catch (err) {
    console.error('[插件壳] 加载失败', err);
  }
})();
